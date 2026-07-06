// LiteStay - System & Edition IPC Handlers

function registerHandlers(ipcMain, getDb, getMainWindow) {
  const { checkTrialCore, getEditionInfo, activateLicense } = require('../edition.cjs');

  // Edition Management
  ipcMain.handle('edition:get-info', () => {
    return getEditionInfo();
  });

  ipcMain.handle('edition:check-trial', () => {
    return checkTrialCore(true);
  });

  ipcMain.handle('edition:activate', (_event, licenseKey) => {
    return activateLicense(licenseKey);
  });

  // Platform info
  ipcMain.handle('get:platform', () => process.platform);
}

module.exports = { registerHandlers };
