const path = require('path');
const fs = require('fs');
const { app } = require('electron');

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
function startServer() {

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

module.exports = { startServer };