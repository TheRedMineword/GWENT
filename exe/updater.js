const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

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