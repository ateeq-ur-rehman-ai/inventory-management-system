const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
        }
    });

    const developmentUrl = process.env.ELECTRON_START_URL;
    if (developmentUrl) {
        win.loadURL(developmentUrl);
    } else {
        win.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
