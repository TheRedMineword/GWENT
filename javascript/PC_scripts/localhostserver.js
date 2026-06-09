// const path = require('path'); <= is defined
console.log("LOCALHOST SERVER ENV", process.env.GWENT_EXPRESS);

const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const cors = require("cors");

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