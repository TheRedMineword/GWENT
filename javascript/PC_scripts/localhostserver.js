const express = require('express');
const path = require('path');
const { app } = require('electron');

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
            path.join(APP_DIR, 'index.html')
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