// LiteStay - Electron 主进程
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { getDb } = require('./database.cjs');
const { ensureEditionFile, checkTrialCore } = require('./edition.cjs');
const { registerIpcHandlers } = require('./ipc-handlers.cjs');

let mainWindow = null;

ipcMain.on('win:minimize', () => mainWindow?.minimize());
ipcMain.on('win:maximize', () => (mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize()));
ipcMain.on('win:close', () => { mainWindow?.close(); app.quit(); });

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

  mainWindow.on('maximize', () => mainWindow.webContents.send('win:maximized', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('win:maximized', false));

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
