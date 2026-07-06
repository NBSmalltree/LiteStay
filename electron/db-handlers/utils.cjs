// LiteStay - IPC Handler Shared Utilities

// IPC channel name constants — single source of truth
const CH = {
  // System
  getPlatform: 'get:platform',

  // Window controls (ipcMain.on / ipcRenderer.send)
  winMinimize: 'win:minimize',
  winMaximize: 'win:maximize',
  winClose: 'win:close',
  // Window events (webContents.send / ipcRenderer.on)
  winMaximized: 'win:maximized',
  ordersChanged: 'orders:changed',

  // Edition
  editionGetInfo: 'edition:get-info',
  editionCheckTrial: 'edition:check-trial',
  editionActivate: 'edition:activate',

  // Room types
  getRoomTypes: 'db:getRoomTypes',
  insertRoomType: 'db:insertRoomType',
  deleteRoomType: 'db:deleteRoomType',

  // Rooms
  insertRoom: 'db:insertRoom',
  getRooms: 'db:getRooms',
  deleteRoom: 'db:deleteRoom',
  updateRoom: 'db:updateRoom',

  // Orders
  insertOrder: 'db:insertOrder',
  getOrders: 'db:getOrders',
  updateOrder: 'db:updateOrder',
  deleteOrder: 'db:deleteOrder',

  // Financial logs
  insertFinancialLog: 'db:insertFinancialLog',
  getFinancialLogs: 'db:getFinancialLogs',
  getFinancialLogsByOrder: 'db:getFinancialLogsByOrder',
  updateFinancialLogPayment: 'db:updateFinancialLogPayment',
  updateFinancialLogAmount: 'db:updateFinancialLogAmount',
  deleteFinancialLog: 'db:deleteFinancialLog',
  updateFinancialLog: 'db:updateFinancialLog',
  getIncidentalSums: 'db:getIncidentalSums',

  // Financial summary
  getFinancialSummary: 'db:getFinancialSummary',
  getFinancialLogsDetailed: 'db:getFinancialLogsDetailed',
  getRevenueByRoomType: 'db:getRevenueByRoomType',
  getOccupancyStats: 'db:getOccupancyStats',
  exportFinancialLogs: 'db:exportFinancialLogs',
  exportNightAudit: 'db:exportNightAudit',

  // Analytics
  getDailyOccupancy: 'db:getDailyOccupancy',
  getDailyRevenueByType: 'db:getDailyRevenueByType',
  getRoomTypeAnalysis: 'db:getRoomTypeAnalysis',
  getADRRevPAR: 'db:getADRRevPAR',
  getADRRevPARTrend: 'db:getADRRevPARTrend',
  getADRByRoomType: 'db:getADRByRoomType',

  // Revenue analytics
  getMonthlyRevenue: 'db:getMonthlyRevenue',
  getQuarterlyRevenue: 'db:getQuarterlyRevenue',
  getYearlyRevenue: 'db:getYearlyRevenue',
  getRevenueGrowth: 'db:getRevenueGrowth',
  getPaymentMethodTrend: 'db:getPaymentMethodTrend',

  // Source analytics
  getSourceStats: 'db:getSourceStats',
  getSourceTrend: 'db:getSourceTrend',
  updateOrderSource: 'db:updateOrderSource',

  // Price rules
  getPriceRules: 'db:getPriceRules',
  insertPriceRule: 'db:insertPriceRule',
  updatePriceRule: 'db:updatePriceRule',
  deletePriceRule: 'db:deletePriceRule',
  getPriceCalendar: 'db:getPriceCalendar',

  // Invoices
  getInvoices: 'db:getInvoices',
  insertInvoice: 'db:insertInvoice',
  updateInvoice: 'db:updateInvoice',
  deleteInvoice: 'db:deleteInvoice',
  markInvoiceIssued: 'db:markInvoiceIssued',
  exportInvoiceList: 'db:exportInvoiceList',

  // Guests
  getGuests: 'db:getGuests',
  getGuestById: 'db:getGuestById',
  getGuestByPhone: 'db:getGuestByPhone',
  insertGuest: 'db:insertGuest',
  updateGuest: 'db:updateGuest',
  deleteGuest: 'db:deleteGuest',
  findOrCreateGuest: 'db:findOrCreateGuest',
  getGuestsWithStats: 'db:getGuestsWithStats',
  searchGuests: 'db:searchGuests',
  getGuestOrders: 'db:getGuestOrders',

  // Backup
  getBackups: 'db:getBackups',
  createBackup: 'db:createBackup',
  restoreBackup: 'db:restoreBackup',
  deleteBackup: 'db:deleteBackup',
  exportBackup: 'db:exportBackup',
  importBackup: 'db:importBackup',
};

function buildUpdateQuery(tableName, idField, idValue, updates, extraFields = []) {
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(val);
  }
  for (const extra of extraFields) {
    fields.push(extra);
  }
  values.push(idValue);
  const sql = `UPDATE ${tableName} SET ${fields.join(', ')} WHERE ${idField} = ?`;
  return { sql, values };
}

function notifyOrdersChanged(getMainWindow) {
  const mw = getMainWindow();
  if (mw) mw.webContents.send(CH.ordersChanged);
}

module.exports = { CH, buildUpdateQuery, notifyOrdersChanged };
