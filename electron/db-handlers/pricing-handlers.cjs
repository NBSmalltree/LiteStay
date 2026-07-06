// LiteStay - Pricing IPC Handlers

const { buildUpdateQuery } = require('./utils.cjs');

const round2 = (v) => Math.round(v * 100) / 100;

function registerHandlers(ipcMain, getDb) {

  ipcMain.handle('db:getPriceRules', () => {
    return getDb().prepare('SELECT * FROM price_rules ORDER BY room_type, priority DESC').all();
  });

  ipcMain.handle('db:insertPriceRule', (_event, rule) => {
    const stmt = getDb().prepare(`INSERT INTO price_rules (room_type, rule_name, rule_type, start_date, end_date,
price_multiplier, fixed_price, priority, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const result = stmt.run(
      rule.room_type, rule.rule_name, rule.rule_type, rule.start_date || null, rule.end_date || null,
      rule.price_multiplier, rule.fixed_price || null, rule.priority, rule.is_active ? 1 : 0,
    );
    return getDb().prepare('SELECT * FROM price_rules WHERE rule_id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('db:updatePriceRule', (_event, ruleId, updates) => {
    const processedUpdates = { ...updates };
    if (processedUpdates.is_active !== undefined) processedUpdates.is_active = processedUpdates.is_active ? 1 : 0;
    const { sql, values } = buildUpdateQuery('price_rules', 'rule_id', ruleId, processedUpdates);
    getDb().prepare(sql).run(...values);
    return getDb().prepare('SELECT * FROM price_rules WHERE rule_id = ?').get(ruleId);
  });

  ipcMain.handle('db:deletePriceRule', (_event, ruleId) => {
    getDb().prepare('DELETE FROM price_rules WHERE rule_id = ?').run(ruleId);
    return true;
  });

  ipcMain.handle('db:getPriceCalendar', (_event, roomType, dateFrom, dateTo) => {
    const db = getDb();
    const basePrice = db.prepare('SELECT base_price FROM rooms WHERE room_type = ? LIMIT 1').get(roomType)?.base_price || 0;
    const rules = db.prepare(`SELECT * FROM price_rules WHERE room_type = ? AND is_active = 1 ORDER BY priority DESC`).all(roomType);
    const calendar = [];
    const start = new Date(dateFrom + 'T00:00:00');
    const end = new Date(dateTo + 'T00:00:00');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const matched = rules.find(r => {
        if (r.rule_type === 'weekend' && isWeekend) return true;
        if (r.rule_type === 'weekday' && !isWeekend) return true;
        if ((r.rule_type === 'holiday' || r.rule_type === 'custom') && r.start_date && r.end_date) {
          return dateStr >= r.start_date && dateStr <= r.end_date;
        }
        return false;
      });
      const finalPrice = matched ? (matched.fixed_price || round2(basePrice * matched.price_multiplier)) : basePrice;
      calendar.push({ date: dateStr, room_type: roomType, base_price: basePrice, final_price: round2(finalPrice), applied_rule: matched?.rule_name });
    }
    return calendar;
  });
}

module.exports = { registerHandlers };
