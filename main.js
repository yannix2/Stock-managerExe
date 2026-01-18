const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, 'assets', 'logo.ico'), 
        webPreferences: {
            nodeIntegration: false,      // always false for security
            contextIsolation: true,      // must be true to use preload
            preload: path.join(__dirname, 'preload.cjs'),
        },
    });

    // Load the React frontend build
    mainWindow.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));

    // Optional: open DevTools in dev mode
    if (!app.isPackaged) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
