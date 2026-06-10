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

    const APP_DIR =
        path.join(
            app.getPath('appData'),
            'GWENT'
        );

    serverApp.use(express.json());

    serverApp.use(
        express.static(APP_DIR)
    );

    serverApp.get('/', (req, res) => {
        res.sendFile(
            path.join(APP_DIR, 'exe_app.html')
        );
    });

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