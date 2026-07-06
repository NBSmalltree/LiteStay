// LiteStay - Room IPC Handlers

const { buildUpdateQuery } = require('./utils.cjs');

function registerHandlers(ipcMain, getDb) {

  // Room Types
  ipcMain.handle('db:getRoomTypes', () => {
    return getDb().prepare('SELECT * FROM room_types ORDER BY sort_order, type_id').all();
  });

  ipcMain.handle('db:insertRoomType', (_event, name) => {
    const maxOrder = getDb().prepare('SELECT MAX(sort_order) as m FROM room_types').get();
    const result = getDb().prepare('INSERT INTO room_types (type_name, sort_order) VALUES (?, ?)').run(name, (maxOrder?.m ?? 0) + 1);
    return getDb().prepare('SELECT * FROM room_types WHERE type_id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('db:deleteRoomType', (_event, typeId) => {
    getDb().prepare('DELETE FROM room_types WHERE type_id = ?').run(typeId);
    return true;
  });

  // Rooms
  ipcMain.handle('db:insertRoom', (_event, room) => {
    const result = getDb().prepare('INSERT INTO rooms (room_number, room_type, base_price) VALUES (?, ?, ?)').run(room.room_number, room.room_type, room.base_price);
    return getDb().prepare('SELECT * FROM rooms WHERE room_id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('db:getRooms', () => {
    return getDb().prepare('SELECT * FROM rooms ORDER BY room_number').all();
  });

  ipcMain.handle('db:deleteRoom', (_event, roomId) => {
    const active = getDb().prepare("SELECT COUNT(*) as c FROM orders WHERE room_id = ? AND status != 'CHECKED_OUT'").get(roomId);
    if (active?.c > 0) throw new Error('该房间存在未退房的订单，无法删除');
    getDb().prepare('DELETE FROM financial_logs WHERE order_id IN (SELECT order_id FROM orders WHERE room_id = ?)').run(roomId);
    getDb().prepare('DELETE FROM orders WHERE room_id = ?').run(roomId);
    getDb().prepare('DELETE FROM rooms WHERE room_id = ?').run(roomId);
    return true;
  });

  ipcMain.handle('db:updateRoom', (_event, roomId, updates) => {
    const db = getDb();
    const oldRoom = db.prepare('SELECT * FROM rooms WHERE room_id = ?').get(roomId);
    const { sql, values } = buildUpdateQuery('rooms', 'room_id', roomId, updates);
    db.prepare(sql).run(...values);
    if (updates.base_price !== undefined && oldRoom && updates.base_price !== oldRoom.base_price) {
      const activeOrders = db.prepare("SELECT * FROM orders WHERE room_id = ? AND status != 'CHECKED_OUT'").all(roomId);
      const updateOrderStmt = db.prepare('UPDATE orders SET actual_amount = ? WHERE order_id = ?');
      const updateLogStmt = db.prepare("UPDATE financial_logs SET amount = ? WHERE order_id = ? AND type = 'ROOM_FEE'");
      for (const order of activeOrders) {
        const nights = Math.max(1, Math.ceil((new Date(order.check_out_date).getTime() - new Date(order.check_in_date).getTime()) / 86400000));
        const newAmount = updates.base_price * nights;
        updateOrderStmt.run(newAmount, order.order_id);
        updateLogStmt.run(newAmount, order.order_id);
      }
    }
    return db.prepare('SELECT * FROM rooms WHERE room_id = ?').get(roomId);
  });
}

module.exports = { registerHandlers };
