// LiteStay - Electron 主进程
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { getDb } = require('./database.cjs');
const { ensureEditionFile, checkTrialCore } = require('./edition.cjs');
const { registerIpcHandlers } = require('./ipc-handlers.cjs');

// --- Window ---
let mainWindow = null;

ipcMain.on('win:minimize', () => mainWindow?.minimize());
ipcMain.on('win:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('win:close', () => {
  mainWindow?.close();
  app.quit();
});

// Initialize DB on module load (lazy via getDb, but ensures schema exists)
getDb();

// Register all IPC handlers, passing a getter for mainWindow
registerIpcHandlers(ipcMain, getDb, () => mainWindow);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
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

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// --- App Lifecycle ---
app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(path.join(__dirname, '../build/icon.png'));
  }

  ensureEditionFile();
  const trialResult = checkTrialCore(true);
  console.log('[LiteStay] Edition check:', trialResult);

  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
