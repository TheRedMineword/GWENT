const path = require('path');

const {
    app,
    BrowserWindow,
    ipcMain,
    shell
} = require('electron');

const { updateApp } = require('./updater');

let mainWindow;
let splash;

function createSplash() {

    splash = new BrowserWindow({
        width: 520,
        height: 220,
        frame: false,
        resizable: false,
        autoHideMenuBar: true,
        alwaysOnTop: true,
        icon: path.join(__dirname, 'logo.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    splash.loadFile(
        path.join(
            __dirname,
            'windows',
            'splash.html'
        )
    );

    return splash;
}

async function createWindow() {

    createSplash();

    try {

        await updateApp(splash);

        const APPDATA_ROOT =
            path.join(
                app.getPath('appData'),
                'GWENT'
            );

        const SERVER_FILE =
            path.join(
                APPDATA_ROOT,
                'javascript\PC_scripts\localhostserver.js'
            );

        if (splash?.webContents) {
            splash.webContents.send(
                'update-status',
                'Starting application...'
            );
        }

        delete require.cache[
            require.resolve(SERVER_FILE)
        ];

        const {
            startServer
        } = require(SERVER_FILE);

        await startServer();

        mainWindow = new BrowserWindow({
            width: 1280,
            height: 800,
            autoHideMenuBar: true,
            icon: path.join(__dirname, 'logo.ico'),
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        await new Promise(
            r => setTimeout(r, 1200)
        );

        await mainWindow.loadURL(
            'http://127.0.0.1:1111'
        );

        splash?.destroy();
        splash = null;

    } catch (err) {

        console.error(err);

        splash?.webContents?.send(
            'update-status',
            'Fatal error: ' + err.message
        );
    }
}

app.whenReady().then(async () => {

    ipcMain.on(
        'open-external',
        async (_, url) => {

            try {
                await shell.openExternal(url);
            } catch (err) {
                console.error(err);
            }
        }
    );

    await createWindow();
});

app.on(
    'window-all-closed',
    () => {

        if (
            process.platform !== 'darwin'
        ) {
            app.quit();
        }
    }
);