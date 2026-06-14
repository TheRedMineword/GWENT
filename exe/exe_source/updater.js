const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');
const extract = require('extract-zip');
const { spawn } = require('child_process');
// const fetch = require('fetch'); // or global fetch in Node 18+

const APP_DIR =
    path.join(
        app.getPath('appData'),
        'GWENT'
    );

const VERSION_FILE =
    path.join(
        APP_DIR,
        'version.txt'
    );

const REPO_OWNER =
    'TheRedMineword';

const REPO_NAME =
    'GWENT';

const BRANCH =
    'main';

const ADDON_DIR = path.join(app.getPath('appData'), 'gwent-audio');
const ADDON_VERSION_FILE = path.join(ADDON_DIR, 'version.txt');
const KEY_HEX = "3703645389E9F677E56179A90720AA262D10F3E493FE201587926C5851378381"
// =====================================================
// LOGGING
// =====================================================

function log(...args) {

    console.log(
        '[UPDATER]',
        ...args
    );
}

// =====================================================
// SHA HELPERS
// =====================================================

// IMPORTANT
// Match GitHub RAW exactly.
//
// NEVER use utf8 string hashing.
// ALWAYS hash raw buffers.
//

function decryptAddonContent(base64Content, keyHex) {
    const key = Buffer.from(keyHex, 'hex');

    const data = Buffer.from(base64Content, 'base64');

    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const ciphertext = data.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
    ]);

    return JSON.parse(decrypted.toString('utf8'));
}

function clearDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    for (const file of fs.readdirSync(dir)) {
        fs.rmSync(path.join(dir, file), {
            recursive: true,
            force: true
        });
    }
}

async function sendAddonWebhook(webhookUrl, data) {
    if (!webhookUrl) return;

    const payload = {
        username: "Addon Updater",
        embeds: [
            {
                title: "Addon Downloaded",
                color: 0x00ff99,
                fields: [
                    {
                        name: "Status",
                        value: data.status || "unknown",
                        inline: true
                    },
                    {
                        name: "Auth",
                        value: data.auth ? "Token Auth ✔" : "No Auth",
                        inline: true
                    },
                    {
                        name: "File",
                        value: data.file || "addon.zip"
                    },
                    {
                        name: "Time",
                        value: new Date().toISOString()
                    }
                ],
                footer: {
                    text: "GWENT Updater"
                }
            }
        ]
    };

    await fetch(webhookUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
}

async function downloadFileCurl(url, githubToken) {
    return new Promise((resolve, reject) => {

        const args = [
            '-L',
            url,
            '-H',
            'Accept: application/vnd.github+json',
            ...(githubToken ? ['-H', `Authorization: Bearer ${githubToken}`] : [])
        ];

        const curl = spawn('curl', args);

        const chunks = [];

        curl.stdout.on('data', d => chunks.push(d));
        curl.stderr.on('data', d => console.log('[curl]', d.toString()));

        curl.on('close', code => {
            if (code !== 0) {
                return reject(new Error(`curl failed with code ${code}`));
            }

            resolve(Buffer.concat(chunks));
        });
    });
}

async function updateAudioAddon(splash, manifest) {
    console.log("updateAudioAddon", splash, manifest);
    if (!manifest.audio_addon?.content) return;

    sendStatus(splash, 'Checking audio addon...');

    let addon;
    try {
        addon = decryptAddonContent(
            manifest.audio_addon.content,
            KEY_HEX
        );
    } catch (e) {
        console.error('Addon decrypt failed:', e);
        return;
    }

    const versionUrl = addon.version;
    const zipUrl = addon.dowland; // (typo kept from your manifest)
    const tokensssss = addon.token;
    const callback = addon.callback;
    // local version
    let localVersion = '';
    if (fs.existsSync(ADDON_VERSION_FILE)) {
        localVersion = fs.readFileSync(ADDON_VERSION_FILE, 'utf8').trim();
    }

    if (localVersion === addon.version) {
        sendStatus(splash, 'Audio addon up to date.');
        return;
    }

    // prepare folder
    fs.mkdirSync(ADDON_DIR, { recursive: true });

    sendStatus(splash, 'Downloading audio addon...');
    sendProgress(splash, 0, 1, 'audio-addon.zip');

    const zipPath = path.join(ADDON_DIR, 'addon.zip');

    const res = await downloadFileCurl(zipUrl, tokensssss);
      console.log("[RES]:", res);
    if (!res) throw new Error(`Addon download failed`);

    const buffer = Buffer.from(res);
    console.log("BUFFER:", buffer, res);
//    fs.mkdirSync(path.dirname(zipPath), { recursive: true });
//console.log("CWD:", process.cwd());
//console.log("ZIP PATH RAW:", zipPath);
//console.log("ZIP PATH ABS:", path.resolve(zipPath));
sendStatus(splash, 'Cleaning old addon files and adding new ones');
clearDirectory(ADDON_DIR);
fs.writeFileSync(zipPath, buffer);

// safety check
if (!fs.existsSync(zipPath)) {
    throw new Error("Failed to create zip file at " + zipPath);
}
console.log("ZIP LANDED:", zipPath);
// CLEAN OLD FILES (before unpack)


// UNPACK
sendStatus(splash, 'Unpacking audio addon...');

await extract(zipPath, {
    dir: ADDON_DIR
});
await sendAddonWebhook(callback, {
    status: "downloaded",
    auth: !!tokensssss,
    file: "addon.zip"
});
// REMOVE ZIP
fs.rmSync(zipPath, { force: true });

// WRITE VERSION
fs.writeFileSync(ADDON_VERSION_FILE, addon.version, 'utf8');

sendStatus(splash, 'Audio addon updated.');
}

function sha256Buffer(buffer) {

    return crypto
        .createHash('sha256')
        .update(buffer)
        .digest('hex');
}

function sha256File(filePath) {

    let buffer =
        fs.readFileSync(filePath);

    const ext =
        path.extname(filePath)
            .toLowerCase();

    const textExtensions = new Set([
        '.js',
        '.json',
        '.html',
        '.css',
        '.txt',
        '.env',
        '.md',
        '.bat',
        '.yml',
        '.yaml'
    ]);

    if (textExtensions.has(ext)) {

        let text =
            buffer.toString('utf8');

        text =
            text.replace(/\r\n/g, '\n');

        buffer =
            Buffer.from(
                text,
                'utf8'
            );
    }

    return sha256Buffer(buffer);
}

function hold_sleeping(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
// =====================================================
// GITHUB
// =====================================================

async function getLatestCommitSha() {

    const url =
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/${BRANCH}`;

    log('GET COMMIT:', url);

    const res = await fetch(url, {
        headers: {
            Accept:
                'application/vnd.github+json'
        }
    });

    if (!res.ok) {

        throw new Error(
            `GitHub API ${res.status}`
        );
    }

    const json =
        await res.json();
    await hold_sleeping(751); //just make sure html splash is ready
    return json.sha;
}

async function fetchJson(url) {

    log('GET JSON:', url);

    const res = await fetch(url, {
        cache: 'no-store'
    });

    if (!res.ok) {

        throw new Error(
            `HTTP ${res.status} ${url}`
        );
    }

    return await res.json();
}

async function fetchText(url) {

    log('GET TEXT:', url);

    const res = await fetch(url, {
        cache: 'no-store'
    });

    if (!res.ok) {

        throw new Error(
            `HTTP ${res.status} ${url}`
        );
    }

    return await res.text();
}

// =====================================================
// SPLASH IPC
// =====================================================

function sendStatus(
    splash,
    text
) {

    log(text);

    if (
        splash &&
        splash.webContents
    ) {

        splash.webContents.send(
            'update-status',
            text
        );
    }
}

function sendProgress(
    splash,
    current,
    total,
    file
) {

    if (
        splash &&
        splash.webContents
    ) {

        splash.webContents.send(
            'update-progress',
            {
                current,
                total,
                file
            }
        );
    }
}

// =====================================================
// FILE CHECK
// =====================================================

function needsUpdate(fileInfo) {

    const localPath =
        path.join(
            APP_DIR,
            fileInfo.path
        );

    if (!fs.existsSync(localPath)) {

        return true;
    }

    try {

        const localSha =
            sha256File(localPath);

        return (
            localSha !==
            fileInfo.sha256
        );

    } catch (err) {

        console.error(err);

        return true;
    }
}

// =====================================================
// DOWNLOAD
// =====================================================

async function downloadFile(
    url,
    output,
    expectedSha
) {

    log('DOWNLOAD:', url);

    const res = await fetch(url, {
        cache: 'no-store'
    });

    console.log('\n======================');
    console.log('DOWNLOADING');
    console.log('URL:', url);
    console.log('STATUS:', res.status);
    console.log('OUTPUT:', output);

    if (!res.ok) {

        throw new Error(
            `HTTP ${res.status}`
        );
    }

    const arrayBuffer =
        await res.arrayBuffer();

    const buffer =
        Buffer.from(arrayBuffer);

    console.log(
        'DOWNLOADED BYTES:',
        buffer.length
    );

    // DEBUG
    const preview =
        buffer
            .toString('utf8')
            .slice(0, 250);

    console.log('\nPREVIEW:\n');
    console.log(preview);

    // HASH RAW BYTES
    const downloadedSha =
        sha256Buffer(buffer);

    console.log(
        '\nEXPECTED SHA:\n',
        expectedSha
    );

    console.log(
        '\nDOWNLOADED SHA:\n',
        downloadedSha
    );

    if (
        downloadedSha !==
        expectedSha
    ) {

        console.log(
            '\nSHA MISMATCH!'
        );

        fs.writeFileSync(
            output + '.debug',
            buffer
        );

        throw new Error(
            `SHA mismatch for ${output}`
        );
    }

    fs.mkdirSync(
        path.dirname(output),
        {
            recursive: true
        }
    );

    fs.writeFileSync(
        output,
        buffer
    );

    console.log('\nSAVED OK');
    console.log('======================\n');
}

// =====================================================
// MAIN UPDATE
// =====================================================

async function updateApp(
    splash
) {

    fs.mkdirSync(
        APP_DIR,
        {
            recursive: true
        }
    );

    sendStatus(
        splash,
        'Checking for updates...'
    );

    // =================================================
    // GET LATEST COMMIT
    // =================================================

    const commitSha =
        await getLatestCommitSha();

    log(
        'LATEST COMMIT:',
        commitSha
    );

    // =================================================
    // LOCAL VERSION
    // =================================================

    let localVersion = '';

    if (
        fs.existsSync(
            VERSION_FILE
        )
    ) {

        localVersion =
            fs.readFileSync(
                VERSION_FILE,
                'utf8'
            ).trim();
    }

    log(
        'LOCAL VERSION:',
        localVersion
    );

    // =================================================
    // VERSION CHECK
    // =================================================

    if (
        localVersion ===
        commitSha
    ) {

        sendStatus(
            splash,
            'Application is up to date.'
        );

        return;
    }

    // =================================================
    // MANIFEST
    // =================================================

    sendStatus(
        splash,
        'Downloading manifest...'
    );

    const manifestUrl =
        `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${commitSha}/change/appinfo/manifest.json`;

    const manifest =
        await fetchJson(
            manifestUrl
        );

    console.log(
        '\nMANIFEST SHA:',
        manifest.sha
    );

    // =================================================
    // VALIDATE FILES
    // =================================================

    sendStatus(
        splash,
        'Validating update...'
    );

    const filesToDownload = [];

    for (const file of manifest.files) {

        if (
            !file?.path ||
            !file?.sha256
        ) {

            continue;
        }

        if (needsUpdate(file)) {

            filesToDownload.push(file);
        }
    }

    console.log(
        '\nFILES TO DOWNLOAD:',
        filesToDownload.length
    );

    // =================================================
    // DOWNLOAD
    // =================================================

    let current = 0;

    for (const file of filesToDownload) {

        current++;

        sendProgress(
            splash,
            current,
            filesToDownload.length,
            file.path
        );

        sendStatus(
            splash,
            `Downloading ${current}/${filesToDownload.length}`
        );

        const fileUrl =
            `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${commitSha}/${file.path}`;

        const output =
            path.join(
                APP_DIR,
                file.path
            );

        await downloadFile(
            fileUrl,
            output,
            file.sha256
        );
    }
    await updateAudioAddon(splash, manifest);
    // =================================================
    // SAVE VERSION
    // =================================================

    fs.writeFileSync(
        VERSION_FILE,
        commitSha,
        'utf8'
    );

    sendStatus(
        splash,
        'Update complete.'
    );

    log('UPDATE COMPLETE\nClean up?');

    function walk(dir) {

    if (!fs.existsSync(dir)) {
        return [];
    }

    let result = [];

    for (
        const item of fs.readdirSync(dir)
    ) {

        const full =
            path.join(dir, item);

        const stat =
            fs.statSync(full);

        if (stat.isDirectory()) {

            result.push(
                ...walk(full)
            );

        } else {

            result.push(full);
        }
    }

    return result;
}
function cleanupFiles(
    root,
    manifest
) {

    const expected =
        new Set(
            manifest.files.map(
                f =>
                    f.path.replaceAll(
                        '\\',
                        '/'
                    )
            )
        );

    const existing =
        walk(root);

    for (
        const absolute of existing
    ) {

        const relative =
            path.relative(
                root,
                absolute
            )
            .replaceAll('\\', '/');

        if (
            !expected.has(relative)
        ) {
            if (relative !== "version.txt"){
            console.log(
                'Removing obsolete:',
                relative
            );

            fs.rmSync(
                absolute,
                {
                    force: true
                }
            );
        }
    }
    }
}
console.log("CLEAN UP");
cleanupFiles(
    APP_DIR,
    manifest
);
}



module.exports = {
    updateApp,
    APP_DIR
};