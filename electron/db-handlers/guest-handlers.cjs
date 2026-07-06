// LiteStay - Guest IPC Handlers

const { buildUpdateQuery } = require('./utils.cjs');

const INSERT_GUEST_SQL = 'INSERT INTO guests (name, phone, id_card, email, notes) VALUES (?, ?, ?, ?, ?)';

function guestValues(g) {
  return [g.name, g.phone || null, g.id_card || null, g.email || null, g.notes || null];
}

function registerHandlers(ipcMain, getDb) {

  ipcMain.handle('db:getGuests', () => {
    return getDb().prepare('SELECT * FROM guests ORDER BY name').all();
  });

  ipcMain.handle('db:getGuestById', (_event, guestId) => {
    return getDb().prepare('SELECT * FROM guests WHERE guest_id = ?').get(guestId);
  });

  ipcMain.handle('db:getGuestByPhone', (_event, phone) => {
    return getDb().prepare('SELECT * FROM guests WHERE phone = ?').get(phone);
  });

  ipcMain.handle('db:insertGuest', (_event, guest) => {
    const result = getDb().prepare(INSERT_GUEST_SQL).run(...guestValues(guest));
    return getDb().prepare('SELECT * FROM guests WHERE guest_id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('db:updateGuest', (_event, guestId, updates) => {
    const db = getDb();
    const { sql, values } = buildUpdateQuery('guests', 'guest_id', guestId, updates, ['updated_at = CURRENT_TIMESTAMP']);
    db.prepare(sql).run(...values);
    return db.prepare('SELECT * FROM guests WHERE guest_id = ?').get(guestId);
  });

  ipcMain.handle('db:deleteGuest', (_event, guestId) => {
    const order = getDb().prepare('SELECT order_id FROM orders WHERE guest_id = ? LIMIT 1').get(guestId);
    if (order) return { error: '该客人有关联的订单，无法删除' };
    getDb().prepare('DELETE FROM guests WHERE guest_id = ?').run(guestId);
    return true;
  });

  ipcMain.handle('db:getGuestsWithStats', () => {
    return getDb().prepare(`SELECT g.*, COUNT(DISTINCT o.order_id) as order_count, COALESCE(SUM(o.actual_amount), 0) as total_spent,
MAX(o.check_in_date) as last_check_in, (SELECT r2.room_type FROM orders o2 JOIN rooms r2 ON o2.room_id = r2.room_id
WHERE o2.guest_id = g.guest_id GROUP BY r2.room_type ORDER BY COUNT(*) DESC LIMIT 1) as preferred_room_type
FROM guests g LEFT JOIN orders o ON o.guest_id = g.guest_id GROUP BY g.guest_id ORDER BY g.name`).all();
  });

  ipcMain.handle('db:searchGuests', (_event, query) => {
    return getDb().prepare(`SELECT * FROM guests WHERE name LIKE ? OR phone LIKE ? ORDER BY name LIMIT 20`).all(`%${query}%`, `%${query}%`);
  });

  ipcMain.handle('db:getGuestOrders', (_event, guestName) => {
    return getDb().prepare(`SELECT o.*, r.room_number, r.room_type
FROM orders o JOIN rooms r ON o.room_id = r.room_id WHERE o.guest_name = ? ORDER BY o.check_in_date DESC`).all(guestName);
  });

  ipcMain.handle('db:findOrCreateGuest', (_event, guestData) => {
    const db = getDb();
    if (guestData.phone) {
      const existing = db.prepare('SELECT * FROM guests WHERE phone = ?').get(guestData.phone);
      if (existing) {
        if (guestData.name && guestData.name !== existing.name) {
          db.prepare('UPDATE guests SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE guest_id = ?').run(guestData.name, existing.guest_id);
        }
        return existing;
      }
    }
    const result = db.prepare(INSERT_GUEST_SQL).run(...guestValues(guestData));
    return db.prepare('SELECT * FROM guests WHERE guest_id = ?').get(result.lastInsertRowid);
  });
}

module.exports = { registerHandlers };
