// LiteStay - System & Edition IPC Handlers

const { CH } = require("./utils.cjs");

function registerHandlers(ipcMain, getDb, getMainWindow) {
  const { checkTrialCore, getEditionInfo, activateLicense } = require('../edition.cjs');

  // Edition Management
  ipcMain.handle('CH.editionGetInfo', () => {
    return getEditionInfo();
  });

  ipcMain.handle('CH.editionCheckTrial', () => {
    return checkTrialCore(true);
  });

  ipcMain.handle('CH.editionActivate', (_event, licenseKey) => {
    return activateLicense(licenseKey);
  });

  // Platform info
  ipcMain.handle('CH.getPlatform', () => process.platform);
}

module.exports = { registerHandlers };
