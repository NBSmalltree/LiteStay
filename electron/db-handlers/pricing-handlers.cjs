// LiteStay - Pricing IPC Handlers

const { buildUpdateQuery } = require('./utils.cjs');

function registerHandlers(ipcMain, getDb, getMainWindow) {

  ipcMain.handle('db:getPriceRules', () => {
    return getDb().prepare('SELECT * FROM price_rules ORDER BY room_type, priority DESC').all();
  });

  ipcMain.handle('db:insertPriceRule', (_event, rule) => {
    const stmt = getDb().prepare(`
      INSERT INTO price_rules (room_type, rule_name, rule_type, start_date, end_date,
        price_multiplier, fixed_price, priority, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      rule.room_type, rule.rule_name, rule.rule_type,
      rule.start_date || null, rule.end_date || null, rule.price_multiplier,
      rule.fixed_price || null, rule.priority, rule.is_active ? 1 : 0
    );
    return getDb().prepare('SELECT * FROM price_rules WHERE rule_id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('db:updatePriceRule', (_event, ruleId, updates) => {
    const db = getDb();
    // Handle is_active boolean conversion
    const processedUpdates = { ...updates };
    if (processedUpdates.is_active !== undefined) {
      processedUpdates.is_active = processedUpdates.is_active ? 1 : 0;
    }
    const { sql, values } = buildUpdateQuery('price_rules', 'rule_id', ruleId, processedUpdates);
    db.prepare(sql).run(...values);
    return db.prepare('SELECT * FROM price_rules WHERE rule_id = ?').get(ruleId);
  });

  ipcMain.handle('db:deletePriceRule', (_event, ruleId) => {
    getDb().prepare('DELETE FROM price_rules WHERE rule_id = ?').run(ruleId);
    return true;
  });

  ipcMain.handle('db:getPriceCalendar', (_event, roomType, dateFrom, dateTo) => {
    const db = getDb();
    const basePrice = db.prepare('SELECT base_price FROM rooms WHERE room_type = ? LIMIT 1').get(roomType)?.base_price || 0;

    const rules = db.prepare(`
      SELECT * FROM price_rules
      WHERE room_type = ? AND is_active = 1
      ORDER BY priority DESC
    `).all(roomType);

    const calendar = [];
    const start = new Date(dateFrom + 'T00:00:00');
    const end = new Date(dateTo + 'T00:00:00');

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      let appliedRule = undefined;
      let finalPrice = basePrice;

      for (const rule of rules) {
        let match = false;

        if (rule.rule_type === 'weekend' && isWeekend) {
          match = true;
        } else if (rule.rule_type === 'weekday' && !isWeekend) {
          match = true;
        } else if ((rule.rule_type === 'holiday' || rule.rule_type === 'custom') && rule.start_date && rule.end_date) {
          if (dateStr >= rule.start_date && dateStr <= rule.end_date) {
            match = true;
          }
        }

        if (match) {
          appliedRule = rule;
          if (rule.fixed_price) {
            finalPrice = rule.fixed_price;
          } else {
            finalPrice = basePrice * rule.price_multiplier;
          }
          break;
        }
      }

      calendar.push({
        date: dateStr,
        room_type: roomType,
        base_price: basePrice,
        final_price: Math.round(finalPrice * 100) / 100,
        applied_rule: appliedRule ? appliedRule.rule_name : undefined,
      });
    }

    return calendar;
  });
}

module.exports = { registerHandlers };
