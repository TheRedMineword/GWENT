const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { spawn } = require("child_process");

console.log(
    "LOCALHOST SERVER ENV",
    process.env.GWENT_EXPRESS
);

const express = require(
    process.env.GWENT_EXPRESS
);

console.log(
    "Express loaded"
);
function getVersion(){
    try {
        const versionFile =
                path.join(
                    path.dirname(process.execPath),
                    'version.txt'
                );

            if (!fs.existsSync(versionFile)) {

                return {
                    code: 2,
                    "info": `${versionFile} - not found`
                };
            }

            const version =
                fs.readFileSync(
                    versionFile,
                    'utf8'
                ).trim();

            return {
                code: 1,
                version
            };
    } catch (err) {
        return {
                code: -1,
                error: err.message
            }
    }
}
console.log("///////////////////////////");
console.log("EXE CLIENT VERSION");
console.log(getVersion());
console.log("///////////////////////////");

const FLAGS_FILE = 'lunchflags.txt';
const DEFAULT_FLAGS = {
    '--lunchmobile': 'false',
    '--lunchlang': 'false'
};

function getFlagsPath() {
    return path.join(path.dirname(process.execPath), FLAGS_FILE);
}

function parseFlags(text) {
    const flags = {};
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const i = line.indexOf('=');
        if (i < 0) {
            flags[line] = '';
        } else {
            flags[line.slice(0, i).trim()] = line.slice(i + 1).trim();
        }
    }
    return flags;
}

function loadFlags() {
    const file = getFlagsPath();
    try {
        let text;
        if (!fs.existsSync(file)) {
            text = Object.entries(DEFAULT_FLAGS)
                .map(([k, v]) => `${k}=${v}`)
                .join('\r\n') + '\r\n';
            fs.writeFileSync(file, text, 'utf8');
            console.log('Created', file);
        } else {
            text = fs.readFileSync(file, 'utf8');
            const existing = parseFlags(text);
            const missing = Object.keys(DEFAULT_FLAGS)
                .filter(k => !(k in existing));

            if (missing.length) {
                const prefix = text.length && !text.endsWith('\n') ? '\r\n' : '';
                const add = missing
                    .map(k => `${k}=${DEFAULT_FLAGS[k]}`)
                    .join('\r\n') + '\r\n';
                fs.appendFileSync(file, prefix + add, 'utf8');
                text += prefix + add;
                console.log('Added missing flags:', missing.join(', '));
            }
        }
        return { ...DEFAULT_FLAGS, ...parseFlags(text) };
    } catch (err) {
        console.error('lunchflags error:', err);
        return { ...DEFAULT_FLAGS };
    }
}

function getStartUrl() {
    const flags = loadFlags();
    const isTrue = v => ['true', '1'].includes(String(v).toLowerCase());

    let url = 'http://localhost:1111/';

    if (isTrue(flags['--lunchmobile'])) {
        url += '?mobile=1';
    }

    const lang = flags['--lunchlang'];
    if (lang && lang.toLowerCase() !== 'false') {
        url += '#lang=' + encodeURIComponent(lang);
    }

    return url;
}

function startServer() {

    loadFlags();

    const serverApp = express();
    const serverApp2 = express();

    const APP_DIR =
        path.join(
            app.getPath('appData'),
            'GWENT'
        );
    const APP_DIR2 = path.join(
    app.getPath('appData'),
    'gwent-audio',
    'TheRedMineword-3b88b341d8d88a53d597fadefa5d79da4f8e9e7fa770a83375e3ba8bf2e8dc72-0e75b2c62ad3a2968d04487c4826c228f4fab92d'
);

    serverApp.use((req, res, next) => {
    // Ignore API routes
    if (
        req.path.startsWith('/local-api') ||
        req.path.startsWith('/get-audio')
    ) {
        return next();
    }

    let filePath = path.join(APP_DIR, req.path);

    // /
    if (req.path === "/") {
        filePath = path.join(APP_DIR, "index.html");
    } else {
        filePath += ".html";
    }

    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }

    next();
});

serverApp.use(express.static(APP_DIR));
    console.log("DATA DIR:", APP_DIR, APP_DIR2);

    
    serverApp.use('/get-audio', express.static(APP_DIR2));

    serverApp.post('/local-api/get_version', async (req, res) => {

        try {
        return res.json(getVersion());

        } catch (err) {

            console.error(err);

            return res.json({
                code: -1,
                error: err.message,
                "Inside": "server_post"
            });
        }
    });
    serverApp.post("/local-api/restart", async (req, res) => {
    try {
        const exePath = path.join(
            path.dirname(process.execPath),
            "GWENT.exe"
        );

        if (fs.existsSync(exePath)) {
            try {
                spawn(exePath, [], {
                    detached: true,
                    stdio: "ignore"
                }).unref();

                console.log("Started:", exePath);
            } catch (e) {
                console.error("Failed to start GWENT.exe:", e);
            }
        } else {
            console.warn("GWENT.exe not found:", exePath);
        }

        res.json({
            code: 1,
            info: "Restart requested."
        });

        // Give the response a moment to be sent.
        setTimeout(() => {
            app.quit();
        }, 100);

    } catch (err) {
        console.error(err);

        res.json({
            code: -1,
            error: err.message
        });

        // Even on failure, close the current app.
        setTimeout(() => {
            app.quit();
        }, 100);
    }
});

    return new Promise(resolve => {

        const server =
            serverApp.listen(1111, () => {

                console.log(
                    'LOCAL SERVER http://localhost:1111'
                );

                resolve(server);
            });
    });
}

module.exports = { startServer, getStartUrl };