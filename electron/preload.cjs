// LiteStay - Preload 脚本
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getPlatform: () => ipcRenderer.invoke('get:platform'),
  win: {
    minimize: () => ipcRenderer.send('win:minimize'),
    maximize: () => ipcRenderer.send('win:maximize'),
    close: () => ipcRenderer.send('win:close'),
    onMaximized: (callback) => ipcRenderer.on('win:maximized', (_e, val) => callback(val)),
    onOrdersChanged: (callback) => ipcRenderer.on('orders:changed', () => callback()),
  },
  db: {
    getRoomTypes: () => ipcRenderer.invoke('db:getRoomTypes'),
    insertRoomType: (name) => ipcRenderer.invoke('db:insertRoomType', name),
    deleteRoomType: (typeId) => ipcRenderer.invoke('db:deleteRoomType', typeId),
    insertRoom: (room) => ipcRenderer.invoke('db:insertRoom', room),
    getRooms: () => ipcRenderer.invoke('db:getRooms'),
    insertOrder: (order) => ipcRenderer.invoke('db:insertOrder', order),
    getOrders: () => ipcRenderer.invoke('db:getOrders'),
    updateOrder: (orderId, updates) => ipcRenderer.invoke('db:updateOrder', orderId, updates),
    deleteOrder: (orderId) => ipcRenderer.invoke('db:deleteOrder', orderId),
    insertFinancialLog: (log) => ipcRenderer.invoke('db:insertFinancialLog', log),
    getFinancialLogs: (date) => ipcRenderer.invoke('db:getFinancialLogs', date),
    getFinancialLogsByOrder: (orderId) => ipcRenderer.invoke('db:getFinancialLogsByOrder', orderId),
    updateFinancialLogPayment: (orderId, paymentMethod) => ipcRenderer.invoke('db:updateFinancialLogPayment', orderId, paymentMethod),
    updateFinancialLogAmount: (orderId, type, amount) => ipcRenderer.invoke('db:updateFinancialLogAmount', orderId, type, amount),
    deleteFinancialLog: (logId) => ipcRenderer.invoke('db:deleteFinancialLog', logId),
    updateFinancialLog: (logId, updates) => ipcRenderer.invoke('db:updateFinancialLog', logId, updates),
    getIncidentalSums: () => ipcRenderer.invoke('db:getIncidentalSums'),
    getFinancialSummary: (dateFrom, dateTo) => ipcRenderer.invoke('db:getFinancialSummary', dateFrom, dateTo),
    getFinancialLogsDetailed: (dateFrom, dateTo) => ipcRenderer.invoke('db:getFinancialLogsDetailed', dateFrom, dateTo),
    exportFinancialLogs: (dateFrom, dateTo) => ipcRenderer.invoke('db:exportFinancialLogs', dateFrom, dateTo),
  },
});
