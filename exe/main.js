const {
    app,
    BrowserWindow,
    ipcMain
} = require('electron');

const path = require('path');

const { startServer } = require('./server');
const { updateApp } = require('./updater');

const { shell } = require('electron');

let mainWindow;
let splash;

function createSplash() {

    splash = new BrowserWindow({
        width: 520,
        height: 320,
        frame: false,
        resizable: false,
        transparent: false,
        alwaysOnTop: true,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'logo.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    splash.loadFile(
        path.join(__dirname, 'windows', 'splash.html')
    );

    return splash;
}

async function createWindow() {

    createSplash();

    try {

        // UPDATE WITH SPLASH EVENTS
        await updateApp(splash);

        if (splash && splash.webContents) {
            splash.webContents.send(
                'update-status',
                'Starting local server...'
            );
        }

        // START LOCAL SERVER
        await startServer();

        if (splash && splash.webContents) {
            splash.webContents.send(
                'update-status',
                'Opening application...'
            );
        }

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

        // IMPORTANT
        // Wait slightly for express/http server to bind correctly.
        await new Promise(r => setTimeout(r, 1200));

        await mainWindow.loadURL('http://127.0.0.1:1111');

        if (splash) {
            splash.destroy();
            splash = null;
        }

    } catch (err) {

        console.error(err);

        if (splash && splash.webContents) {
            splash.webContents.send(
                'update-status',
                'Fatal error: ' + err.message
            );
        }
    }
}

// app.whenReady().then(createWindow);
app.whenReady().then(async () => {

    // IPC handlers belong here
    //console.log("IPC MAIN UNDER");
    ipcMain.on('open-external', async (event, url) => {
    try {
        await shell.openExternal(url);
        console.log('Opened');
    } catch (err) {
        console.error('Failed:', err);
    }
});

    await createWindow();
});

app.on('window-all-closed', () => {

    if (process.platform !== 'darwin') {
        app.quit();
    }
});