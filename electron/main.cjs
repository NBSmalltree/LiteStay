// LiteStay - Electron 主进程
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { getDb } = require('./database.cjs');
const { ensureEditionFile, checkTrialCore } = require('./edition.cjs');
const { registerIpcHandlers } = require('./ipc-handlers.cjs');
const { CH } = require('./db-handlers/utils.cjs');

let mainWindow = null;

ipcMain.on('CH.winMinimize', () => mainWindow?.minimize());
ipcMain.on('CH.winMaximize', () => (mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize()));
ipcMain.on('CH.winClose', () => { mainWindow?.close(); app.quit(); });

getDb();
registerIpcHandlers(ipcMain, getDb, () => mainWindow);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 1024, minHeight: 680,
    title: 'LiteStay',
    icon: path.join(__dirname, '../build/icon.png'),
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('maximize', () => mainWindow.webContents.send('CH.winMaximized', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('CH.winMaximized', false));

  const url = process.env.VITE_DEV_SERVER_URL;
  mainWindow.loadURL(url || `file://${path.join(__dirname, '../dist/index.html')}`);
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) app.dock.setIcon(path.join(__dirname, '../build/icon.png'));
  ensureEditionFile();
  console.log('[LiteStay] Edition check:', checkTrialCore(true));
  createWindow();
});

app.on('window-all-closed', () => app.quit());
