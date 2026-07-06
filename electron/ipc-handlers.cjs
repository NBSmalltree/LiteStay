// LiteStay - IPC Handlers Orchestrator
// Imports and registers all domain-specific IPC handler modules.

const { registerHandlers: registerSystemHandlers } = require('./db-handlers/system-handlers.cjs');
const { registerHandlers: registerRoomHandlers } = require('./db-handlers/room-handlers.cjs');
const { registerHandlers: registerOrderHandlers } = require('./db-handlers/order-handlers.cjs');
const { registerHandlers: registerFinancialHandlers } = require('./db-handlers/financial-handlers.cjs');
const { registerHandlers: registerAnalyticsHandlers } = require('./db-handlers/analytics-handlers.cjs');
const { registerHandlers: registerPricingHandlers } = require('./db-handlers/pricing-handlers.cjs');
const { registerHandlers: registerInvoiceHandlers } = require('./db-handlers/invoice-handlers.cjs');
const { registerHandlers: registerGuestHandlers } = require('./db-handlers/guest-handlers.cjs');
const { registerHandlers: registerBackupHandlers } = require('./db-handlers/backup-handlers.cjs');

function registerIpcHandlers(ipcMain, getDb, getMainWindow) {
  registerSystemHandlers(ipcMain, getDb, getMainWindow);
  registerRoomHandlers(ipcMain, getDb, getMainWindow);
  registerOrderHandlers(ipcMain, getDb, getMainWindow);
  registerFinancialHandlers(ipcMain, getDb, getMainWindow);
  registerAnalyticsHandlers(ipcMain, getDb, getMainWindow);
  registerPricingHandlers(ipcMain, getDb, getMainWindow);
  registerInvoiceHandlers(ipcMain, getDb, getMainWindow);
  registerGuestHandlers(ipcMain, getDb, getMainWindow);
  registerBackupHandlers(ipcMain, getDb, getMainWindow);
}

module.exports = { registerIpcHandlers };
