// LiteStay - Order IPC Handlers

const { buildUpdateQuery, notifyOrdersChanged } = require('./utils.cjs');

function registerHandlers(ipcMain, getDb, getMainWindow) {

  ipcMain.handle('db:insertOrder', (_event, order) => {
    const stmt = getDb().prepare(`INSERT INTO orders (room_id, guest_id, guest_name, check_in_date, check_out_date,
actual_amount, deposit, status, notes, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const result = stmt.run(
      order.room_id, order.guest_id || null, order.guest_name, order.check_in_date,
      order.check_out_date, order.actual_amount, order.deposit, order.status, order.notes || null, order.source || 'direct',
    );
    const inserted = getDb().prepare('SELECT * FROM orders WHERE order_id = ?').get(result.lastInsertRowid);
    notifyOrdersChanged(getMainWindow);
    return inserted;
  });

  ipcMain.handle('db:getOrders', () => {
    return getDb().prepare(`SELECT o.*, g.phone as guest_phone, g.id_card as guest_id_card, g.email as guest_email
FROM orders o LEFT JOIN guests g ON o.guest_id = g.guest_id ORDER BY o.check_in_date DESC`).all();
  });

  ipcMain.handle('db:updateOrder', (_event, orderId, updates) => {
    const { sql, values } = buildUpdateQuery('orders', 'order_id', orderId, updates);
    getDb().prepare(sql).run(...values);
    return getDb().prepare('SELECT * FROM orders WHERE order_id = ?').get(orderId);
  });

  ipcMain.handle('db:deleteOrder', (_event, orderId) => {
    getDb().prepare('DELETE FROM financial_logs WHERE order_id = ?').run(orderId);
    getDb().prepare('DELETE FROM invoices WHERE order_id = ?').run(orderId);
    getDb().prepare('DELETE FROM orders WHERE order_id = ?').run(orderId);
    notifyOrdersChanged(getMainWindow);
    return true;
  });
}

module.exports = { registerHandlers };
