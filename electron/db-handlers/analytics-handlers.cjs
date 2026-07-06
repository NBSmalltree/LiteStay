// LiteStay - Analytics IPC Handlers

function registerHandlers(ipcMain, getDb, getMainWindow) {

  // Analytics: daily occupancy for date range
  ipcMain.handle('db:getDailyOccupancy', (_event, dateFrom, dateTo) => {
    const db = getDb();
    const totalRooms = db.prepare('SELECT COUNT(*) as c FROM rooms').get().c;
    const orders = db.prepare(`
      SELECT check_in_date, check_out_date, room_id FROM orders
      WHERE status = 'IN_HOUSE'
    `).all();

    const result = [];
    const start = new Date(dateFrom + 'T00:00:00');
    const end = new Date(dateTo + 'T00:00:00');

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const occupied = new Set(
        orders
          .filter(o => o.check_in_date <= dateStr && o.check_out_date > dateStr)
          .map(o => o.room_id)
      ).size;
      result.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        totalRooms,
        occupiedRooms: occupied,
        occupancyRate: totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0,
      });
    }
    return result;
  });

  // Analytics: daily revenue by room type
  ipcMain.handle('db:getDailyRevenueByType', (_event, dateFrom, dateTo) => {
    return getDb().prepare(`
      SELECT
        DATE(fl.created_at) as date,
        r.room_type,
        SUM(fl.amount) as total
      FROM financial_logs fl
      JOIN orders o ON fl.order_id = o.order_id
      JOIN rooms r ON o.room_id = r.room_id
      WHERE fl.type = 'ROOM_FEE'
        AND DATE(fl.created_at) BETWEEN ? AND ?
      GROUP BY DATE(fl.created_at), r.room_type
      ORDER BY date, room_type
    `).all(dateFrom, dateTo);
  });

  // Analytics: room type analysis (revenue, order count, avg price)
  ipcMain.handle('db:getRoomTypeAnalysis', (_event, dateFrom, dateTo) => {
    return getDb().prepare(`
      SELECT
        r.room_type,
        SUM(fl.amount) as revenue,
        COUNT(DISTINCT o.order_id) as order_count,
        AVG(fl.amount) as avg_price
      FROM financial_logs fl
      JOIN orders o ON fl.order_id = o.order_id
      JOIN rooms r ON o.room_id = r.room_id
      WHERE fl.type = 'ROOM_FEE'
        AND DATE(fl.created_at) BETWEEN ? AND ?
      GROUP BY r.room_type
      ORDER BY revenue DESC
    `).all(dateFrom, dateTo);
  });

  // Analytics: ADR and RevPAR metrics
  ipcMain.handle('db:getADRRevPAR', (_event, dateFrom, dateTo) => {
    const db = getDb();
    const totalRooms = db.prepare('SELECT COUNT(*) as c FROM rooms').get().c;

    const soldRoomNights = db.prepare(`
      SELECT SUM(
        CASE
          WHEN check_in_date < ? AND check_out_date > ? THEN julianday(?, 'start of day') - julianday(?, 'start of day')
          WHEN check_in_date >= ? AND check_out_date > ? THEN julianday(?, 'start of day') - julianday(check_in_date, 'start of day')
          ELSE julianday(check_out_date, 'start of day') - julianday(check_in_date, 'start of day')
        END
      ) as nights
      FROM orders
      WHERE status != 'CANCELLED'
        AND check_in_date < ?
        AND check_out_date > ?
    `).get(dateTo, dateFrom, dateTo, dateFrom, dateFrom, dateFrom, dateFrom, dateTo, dateFrom);

    const totalRoomFee = db.prepare(`
      SELECT SUM(amount) as total
      FROM financial_logs
      WHERE type = 'ROOM_FEE'
        AND DATE(created_at) BETWEEN ? AND ?
    `).get(dateFrom, dateTo);

    const nights = soldRoomNights?.nights || 0;
    const roomFee = totalRoomFee?.total || 0;
    const daysInRange = Math.max(1, Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000));
    const availableRoomNights = totalRooms * daysInRange;

    return {
      adr: nights > 0 ? Math.round(roomFee / nights * 100) / 100 : 0,
      revpar: availableRoomNights > 0 ? Math.round(roomFee / availableRoomNights * 100) / 100 : 0,
      total_room_fee: roomFee,
      sold_room_nights: Math.round(nights),
      available_room_nights: availableRoomNights,
      occupancy_rate: availableRoomNights > 0 ? Math.round(nights / availableRoomNights * 10000) / 100 : 0
    };
  });

  // Analytics: ADR/RevPAR trend (past N days)
  ipcMain.handle('db:getADRRevPARTrend', (_event, days) => {
    const db = getDb();
    const totalRooms = db.prepare('SELECT COUNT(*) as c FROM rooms').get().c;

    const result = [];
    const endDate = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);

      const occupied = db.prepare(`
        SELECT COUNT(DISTINCT room_id) as c
        FROM orders
        WHERE status = 'IN_HOUSE'
          AND check_in_date <= ?
          AND check_out_date > ?
      `).get(dateStr, dateStr);

      const roomFee = db.prepare(`
        SELECT SUM(amount) as total
        FROM financial_logs
        WHERE type = 'ROOM_FEE'
          AND DATE(created_at) = ?
      `).get(dateStr);

      const occupiedCount = occupied?.c || 0;
      const fee = roomFee?.total || 0;

      result.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        adr: occupiedCount > 0 ? Math.round(fee / occupiedCount * 100) / 100 : 0,
        revpar: totalRooms > 0 ? Math.round(fee / totalRooms * 100) / 100 : 0,
        occupancy_rate: totalRooms > 0 ? Math.round(occupiedCount / totalRooms * 10000) / 100 : 0
      });
    }

    return result;
  });

  // Analytics: ADR breakdown by room type
  ipcMain.handle('db:getADRByRoomType', (_event, dateFrom, dateTo) => {
    return getDb().prepare(`
      SELECT
        r.room_type,
        COUNT(DISTINCT o.order_id) as order_count,
        SUM(o.actual_amount) as total_revenue,
        SUM(
          CASE
            WHEN o.check_in_date < ? AND o.check_out_date > ? THEN julianday(?, 'start of day') - julianday(?, 'start of day')
            WHEN o.check_in_date >= ? AND o.check_out_date > ? THEN julianday(?, 'start of day') - julianday(o.check_in_date, 'start of day')
            ELSE julianday(o.check_out_date, 'start of day') - julianday(o.check_in_date, 'start of day')
          END
        ) as total_nights,
        AVG(o.actual_amount /
          CASE
            WHEN o.check_in_date < ? AND o.check_out_date > ? THEN julianday(?, 'start of day') - julianday(?, 'start of day')
            WHEN o.check_in_date >= ? AND o.check_out_date > ? THEN julianday(?, 'start of day') - julianday(o.check_in_date, 'start of day')
            ELSE julianday(o.check_out_date, 'start of day') - julianday(o.check_in_date, 'start of day')
          END
        ) as avg_adr
      FROM orders o
      JOIN rooms r ON o.room_id = r.room_id
      WHERE o.status != 'CANCELLED'
        AND o.check_in_date < ?
        AND o.check_out_date > ?
      GROUP BY r.room_type
      ORDER BY avg_adr DESC
    `).all(dateFrom, dateTo, dateTo, dateFrom, dateTo, dateFrom, dateFrom, dateTo, dateTo, dateFrom, dateTo, dateFrom, dateTo, dateFrom, dateTo, dateFrom);
  });

  // Revenue Analytics: monthly revenue breakdown
  ipcMain.handle('db:getMonthlyRevenue', (_event, year) => {
    return getDb().prepare(`
      SELECT
        strftime('%Y-%m', fl.created_at) as month,
        SUM(fl.amount) as total,
        SUM(CASE WHEN fl.type = 'ROOM_FEE' THEN fl.amount ELSE 0 END) as room_fee,
        SUM(CASE WHEN fl.type = 'DEPOSIT' THEN fl.amount ELSE 0 END) as deposit,
        SUM(CASE WHEN fl.type = 'INCIDENTAL' THEN fl.amount ELSE 0 END) as incidental
      FROM financial_logs fl
      WHERE strftime('%Y', fl.created_at) = ?
      GROUP BY strftime('%Y-%m', fl.created_at)
      ORDER BY month
    `).all(year.toString());
  });

  // Revenue Analytics: quarterly revenue breakdown
  ipcMain.handle('db:getQuarterlyRevenue', (_event, year) => {
    return getDb().prepare(`
      SELECT
        CASE
          WHEN CAST(strftime('%m', fl.created_at) AS INTEGER) BETWEEN 1 AND 3 THEN 'Q1'
          WHEN CAST(strftime('%m', fl.created_at) AS INTEGER) BETWEEN 4 AND 6 THEN 'Q2'
          WHEN CAST(strftime('%m', fl.created_at) AS INTEGER) BETWEEN 7 AND 9 THEN 'Q3'
          ELSE 'Q4'
        END as quarter,
        SUM(fl.amount) as total,
        SUM(CASE WHEN fl.type = 'ROOM_FEE' THEN fl.amount ELSE 0 END) as room_fee,
        SUM(CASE WHEN fl.type = 'DEPOSIT' THEN fl.amount ELSE 0 END) as deposit,
        SUM(CASE WHEN fl.type = 'INCIDENTAL' THEN fl.amount ELSE 0 END) as incidental
      FROM financial_logs fl
      WHERE strftime('%Y', fl.created_at) = ?
      GROUP BY quarter
      ORDER BY quarter
    `).all(year.toString());
  });

  // Revenue Analytics: yearly revenue summary
  ipcMain.handle('db:getYearlyRevenue', () => {
    return getDb().prepare(`
      SELECT
        strftime('%Y', fl.created_at) as year,
        SUM(fl.amount) as total,
        SUM(CASE WHEN fl.type = 'ROOM_FEE' THEN fl.amount ELSE 0 END) as room_fee,
        SUM(CASE WHEN fl.type = 'DEPOSIT' THEN fl.amount ELSE 0 END) as deposit,
        SUM(CASE WHEN fl.type = 'INCIDENTAL' THEN fl.amount ELSE 0 END) as incidental
      FROM financial_logs fl
      GROUP BY strftime('%Y', fl.created_at)
      ORDER BY year DESC
      LIMIT 5
    `).all();
  });

  // Revenue Analytics: month-over-month growth
  ipcMain.handle('db:getRevenueGrowth', () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

    const current = getDb().prepare(`
      SELECT SUM(amount) as total FROM financial_logs
      WHERE strftime('%Y-%m', created_at) = ?
    `).get(currentMonth);

    const last = getDb().prepare(`
      SELECT SUM(amount) as total FROM financial_logs
      WHERE strftime('%Y-%m', created_at) = ?
    `).get(lastMonth);

    const currentTotal = current?.total || 0;
    const lastTotal = last?.total || 0;
    const growth = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal * 100) : 0;

    return {
      current_month: currentTotal,
      last_month: lastTotal,
      growth_rate: Math.round(growth * 100) / 100,
      growth_amount: currentTotal - lastTotal
    };
  });

  // Revenue Analytics: payment method trend by month
  ipcMain.handle('db:getPaymentMethodTrend', (_event, months) => {
    return getDb().prepare(`
      SELECT
        strftime('%Y-%m', fl.created_at) as month,
        fl.payment_method,
        SUM(fl.amount) as total
      FROM financial_logs fl
      WHERE fl.created_at >= date('now', '-' || ? || ' months')
      GROUP BY month, fl.payment_method
      ORDER BY month, fl.payment_method
    `).all(months);
  });

  // Source Analytics: get source stats for date range
  ipcMain.handle('db:getSourceStats', (_event, dateFrom, dateTo) => {
    return getDb().prepare(`
      SELECT
        COALESCE(source, 'direct') as source,
        COUNT(*) as order_count,
        SUM(actual_amount) as total_revenue,
        AVG(actual_amount) as avg_revenue
      FROM orders
      WHERE check_in_date BETWEEN ? AND ?
      GROUP BY source
      ORDER BY order_count DESC
    `).all(dateFrom, dateTo);
  });

  // Source Analytics: get source trend by month
  ipcMain.handle('db:getSourceTrend', (_event, months) => {
    return getDb().prepare(`
      SELECT
        strftime('%Y-%m', check_in_date) as month,
        COALESCE(source, 'direct') as source,
        COUNT(*) as order_count,
        SUM(actual_amount) as total_revenue
      FROM orders
      WHERE check_in_date >= date('now', '-' || ? || ' months')
      GROUP BY month, source
      ORDER BY month, source
    `).all(months);
  });

  // Source Analytics: update order source
  ipcMain.handle('db:updateOrderSource', (_event, orderId, source) => {
    getDb().prepare('UPDATE orders SET source = ? WHERE order_id = ?').run(source, orderId);
    return true;
  });
}

module.exports = { registerHandlers };
