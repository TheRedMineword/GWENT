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

// CHECK ALL LOADED MODULES
try {

    const modulesDir =
        path.join(
            __dirname,
            'node_modules'
        );

    console.log(
        "\n=== INSTALLED PACKAGES ==="
    );

    fs.readdirSync(modulesDir)
        .forEach(pkg =>
            console.log(pkg)
        );

} catch (err) {

    console.error(
        "Couldn't read node_modules:",
        err.message
    );
}

function checkModule(name) {
    try {

        const resolved =
            require.resolve(name);

        require(name);

        console.log(
            `[OK] ${name}\n -> ${resolved}`
        );

    } catch (err) {

        console.error(
            `[FAIL] ${name}\n -> ${err.message}`
        );

    }
}

console.log(
    "\n=== BUILT-IN MODULES ==="
);

[
    'fs',
    'path',
    'os',
    'crypto',
    'http',
    'https',
    'url',
    'stream',
    'zlib',
    'child_process',
    'events',
    'util'
].forEach(checkModule);

console.log(
    "\n=== EXTERNAL MODULES ==="
);

[
    'express',
    'cors',
    'axios',
    'electron',
    'sqlite3',
    'sharp'
].forEach(checkModule);
// END CHECK

function startServer() {

    const serverApp = express();

    const APP_DIR =
        path.join(
            app.getPath('appData'),
            'GWENT'
        );

    serverApp.use(
        express.static(APP_DIR)
    );

    serverApp.get('/', (req, res) => {
        res.sendFile(
            path.join(APP_DIR, 'exe_app.html')
        );
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