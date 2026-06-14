const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const LOG_DIR =
    path.join(app.getPath('appData'), 'GWENT');

const LOG_FILE =
    path.join(LOG_DIR, 'info.log');

function ensure() {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(...args) {
    ensure();

    const line =
        `[${new Date().toISOString()}] ` +
        args.map(x =>
            typeof x === 'string'
                ? x
                : JSON.stringify(x)
        ).join(' ') +
        '\n';

    fs.appendFileSync(LOG_FILE, line);

    console.log(...args);
}

module.exports = { log };