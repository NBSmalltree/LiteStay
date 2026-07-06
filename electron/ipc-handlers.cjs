// LiteStay - IPC Handlers
const { app, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { checkTrialCore, getEditionInfo, activateLicense } = require('./edition.cjs');
const { closeDb } = require('./database.cjs');

function registerIpcHandlers(ipcMain, getDb, getMainWindow) {

  // Edition Management
  ipcMain.handle('edition:get-info', () => {
    return getEditionInfo();
  });

  ipcMain.handle('edition:check-trial', () => {
    return checkTrialCore(true);
  });

  ipcMain.handle('edition:activate', (_event, licenseKey) => {
    return activateLicense(licenseKey);
  });

  // Platform info
  ipcMain.handle('get:platform', () => process.platform);

  // Room Types
  ipcMain.handle('db:getRoomTypes', () => {
    return getDb().prepare('SELECT * FROM room_types ORDER BY sort_order, type_id').all();
  });

  ipcMain.handle('db:insertRoomType', (_event, name) => {
    const maxOrder = getDb().prepare('SELECT MAX(sort_order) as m FROM room_types').get();
    const stmt = getDb().prepare('INSERT INTO room_types (type_name, sort_order) VALUES (?, ?)');
    const result = stmt.run(name, (maxOrder?.m ?? 0) + 1);
    return getDb().prepare('SELECT * FROM room_types WHERE type_id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('db:deleteRoomType', (_event, typeId) => {
    getDb().prepare('DELETE FROM room_types WHERE type_id = ?').run(typeId);
    return true;
  });

  // Rooms
  ipcMain.handle('db:insertRoom', (_event, room) => {
    const stmt = getDb().prepare(
      'INSERT INTO rooms (room_number, room_type, base_price) VALUES (?, ?, ?)'
    );
    const result = stmt.run(room.room_number, room.room_type, room.base_price);
    return getDb().prepare('SELECT * FROM rooms WHERE room_id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('db:getRooms', () => {
    return getDb().prepare('SELECT * FROM rooms ORDER BY room_number').all();
  });

  ipcMain.handle('db:deleteRoom', (_event, roomId) => {
    const active = getDb().prepare(
      "SELECT COUNT(*) as c FROM orders WHERE room_id = ? AND status != 'CHECKED_OUT'"
    ).get(roomId);
    if (active && active.c > 0) {
      throw new Error('该房间存在未退房的订单，无法删除');
    }
    getDb().prepare('DELETE FROM financial_logs WHERE order_id IN (SELECT order_id FROM orders WHERE room_id = ?)').run(roomId);
    getDb().prepare('DELETE FROM orders WHERE room_id = ?').run(roomId);
    getDb().prepare('DELETE FROM rooms WHERE room_id = ?').run(roomId);
    return true;
  });

  ipcMain.handle('db:updateRoom', (_event, roomId, updates) => {
    const db = getDb();
    const oldRoom = db.prepare('SELECT * FROM rooms WHERE room_id = ?').get(roomId);
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    values.push(roomId);
    db.prepare(`UPDATE rooms SET ${fields.join(', ')} WHERE room_id = ?`).run(...values);

    // Recalculate active orders if base_price changed
    if (updates.base_price !== undefined && oldRoom && updates.base_price !== oldRoom.base_price) {
      const activeOrders = db.prepare(
        "SELECT * FROM orders WHERE room_id = ? AND status != 'CHECKED_OUT'"
      ).all(roomId);
      const updateOrderStmt = db.prepare('UPDATE orders SET actual_amount = ? WHERE order_id = ?');
      const updateLogStmt = db.prepare("UPDATE financial_logs SET amount = ? WHERE order_id = ? AND type = 'ROOM_FEE'");
      for (const order of activeOrders) {
        const nights = Math.max(1, Math.ceil(
          (new Date(order.check_out_date).getTime() - new Date(order.check_in_date).getTime()) / 86400000
        ));
        const newAmount = updates.base_price * nights;
        updateOrderStmt.run(newAmount, order.order_id);
        updateLogStmt.run(newAmount, order.order_id);
      }
    }

    return db.prepare('SELECT * FROM rooms WHERE room_id = ?').get(roomId);
  });

  // Orders
  ipcMain.handle('db:insertOrder', (_event, order) => {
    const stmt = getDb().prepare(
      'INSERT INTO orders (room_id, guest_id, guest_name, check_in_date, check_out_date, actual_amount, deposit, status, notes, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(
      order.room_id, order.guest_id || null, order.guest_name, order.check_in_date,
      order.check_out_date, order.actual_amount, order.deposit, order.status, order.notes || null, order.source || 'direct'
    );
    const inserted = getDb().prepare('SELECT * FROM orders WHERE order_id = ?').get(result.lastInsertRowid);
    const mw = getMainWindow();
    if (mw) mw.webContents.send('orders:changed');
    return inserted;
  });

  ipcMain.handle('db:getOrders', () => {
    return getDb().prepare(`
      SELECT o.*, g.phone as guest_phone, g.id_card as guest_id_card, g.email as guest_email
      FROM orders o
      LEFT JOIN guests g ON o.guest_id = g.guest_id
      ORDER BY o.check_in_date DESC
    `).all();
  });

  ipcMain.handle('db:updateOrder', (_event, orderId, updates) => {
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    values.push(orderId);
    getDb().prepare(`UPDATE orders SET ${fields.join(', ')} WHERE order_id = ?`).run(...values);
    return getDb().prepare('SELECT * FROM orders WHERE order_id = ?').get(orderId);
  });

  ipcMain.handle('db:deleteOrder', (_event, orderId) => {
    getDb().prepare('DELETE FROM financial_logs WHERE order_id = ?').run(orderId);
    getDb().prepare('DELETE FROM invoices WHERE order_id = ?').run(orderId);
    getDb().prepare('DELETE FROM orders WHERE order_id = ?').run(orderId);
    const mw = getMainWindow();
    if (mw) mw.webContents.send('orders:changed');
    return true;
  });

  // Financial Logs
  ipcMain.handle('db:insertFinancialLog', (_event, log) => {
    const stmt = getDb().prepare(
      'INSERT INTO financial_logs (order_id, type, amount, payment_method) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(log.order_id, log.type, log.amount, log.payment_method);
    return getDb().prepare('SELECT * FROM financial_logs WHERE log_id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('db:getFinancialLogs', (_event, date) => {
    if (date) {
      return getDb().prepare(
        "SELECT * FROM financial_logs WHERE DATE(created_at) = ? ORDER BY created_at DESC"
      ).all(date);
    }
    return getDb().prepare('SELECT * FROM financial_logs ORDER BY created_at DESC').all();
  });

  ipcMain.handle('db:getFinancialLogsByOrder', (_event, orderId) => {
    return getDb().prepare('SELECT * FROM financial_logs WHERE order_id = ? ORDER BY created_at DESC').all(orderId);
  });

  ipcMain.handle('db:updateFinancialLogPayment', (_event, orderId, paymentMethod) => {
    getDb().prepare('UPDATE financial_logs SET payment_method = ? WHERE order_id = ?').run(paymentMethod, orderId);
    return true;
  });

  ipcMain.handle('db:updateFinancialLogAmount', (_event, orderId, type, amount) => {
    getDb().prepare('UPDATE financial_logs SET amount = ? WHERE order_id = ? AND type = ?').run(amount, orderId, type);
    return true;
  });

  ipcMain.handle('db:deleteFinancialLog', (_event, logId) => {
    getDb().prepare('DELETE FROM financial_logs WHERE log_id = ?').run(logId);
    return true;
  });

  ipcMain.handle('db:updateFinancialLog', (_event, logId, updates) => {
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    values.push(logId);
    getDb().prepare(`UPDATE financial_logs SET ${fields.join(', ')} WHERE log_id = ?`).run(...values);
    return true;
  });

  ipcMain.handle('db:getIncidentalSums', () => {
    return getDb().prepare(`
      SELECT order_id, SUM(amount) as total
      FROM financial_logs
      WHERE type = 'INCIDENTAL' AND order_id IS NOT NULL
      GROUP BY order_id
    `).all();
  });

  // Financial summary
  ipcMain.handle('db:getFinancialSummary', (_event, dateFrom, dateTo) => {
    const db = getDb();
    const byMethod = db.prepare(`
      SELECT payment_method, SUM(amount) as total
      FROM financial_logs
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY payment_method
    `).all(dateFrom, dateTo);

    const daily = db.prepare(`
      SELECT DATE(created_at) as date, SUM(amount) as total
      FROM financial_logs
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all(dateFrom, dateTo);

    const row = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'ROOM_FEE' THEN amount ELSE 0 END), 0) as roomFee,
        COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END), 0) as deposit,
        COALESCE(SUM(CASE WHEN type = 'INCIDENTAL' THEN amount ELSE 0 END), 0) as incidental
      FROM financial_logs
      WHERE DATE(created_at) BETWEEN ? AND ?
    `).get(dateFrom, dateTo);

    return { byMethod, daily, ...row };
  });

  // Financial logs with order/room detail
  ipcMain.handle('db:getFinancialLogsDetailed', (_event, dateFrom, dateTo) => {
    return getDb().prepare(`
      SELECT fl.*, o.guest_name, r.room_number
      FROM financial_logs fl
      LEFT JOIN orders o ON fl.order_id = o.order_id
      LEFT JOIN rooms r ON o.room_id = r.room_id
      WHERE DATE(fl.created_at) BETWEEN ? AND ?
      ORDER BY fl.created_at DESC
    `).all(dateFrom, dateTo);
  });

  // Night audit: revenue by room type
  ipcMain.handle('db:getRevenueByRoomType', (_event, dateFrom, dateTo) => {
    return getDb().prepare(`
      SELECT r.room_type, SUM(fl.amount) as total, COUNT(DISTINCT fl.order_id) as order_count
      FROM financial_logs fl
      JOIN orders o ON fl.order_id = o.order_id
      JOIN rooms r ON o.room_id = r.room_id
      WHERE fl.type = 'ROOM_FEE' AND DATE(fl.created_at) BETWEEN ? AND ?
      GROUP BY r.room_type
    `).all(dateFrom, dateTo);
  });

  // Night audit: occupancy stats for a given date
  ipcMain.handle('db:getOccupancyStats', (_event, date) => {
    const db = getDb();
    const totalRooms = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
    const occupiedRooms = db.prepare(`
      SELECT COUNT(DISTINCT room_id) as count FROM orders
      WHERE status = 'IN_HOUSE' AND check_in_date <= ? AND check_out_date > ?
    `).get(date, date).count;
    return { totalRooms, occupiedRooms, vacantRooms: totalRooms - occupiedRooms };
  });

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
    const db = getDb();
    return db.prepare(`
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
    const db = getDb();
    return db.prepare(`
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
    const db = getDb();
    return db.prepare(`
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

  // Export financial logs to Excel
  ipcMain.handle('db:exportFinancialLogs', async (_event, dateFrom, dateTo) => {
    const ExcelJS = require('exceljs');
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '导出财务报表',
      defaultPath: `财务报表_${dateFrom}_${dateTo}.xlsx`,
      filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }],
    });
    if (canceled || !filePath) return null;

    const logs = getDb().prepare(`
      SELECT fl.created_at, fl.type, fl.amount, fl.payment_method, o.guest_name, r.room_number
      FROM financial_logs fl
      LEFT JOIN orders o ON fl.order_id = o.order_id
      LEFT JOIN rooms r ON o.room_id = r.room_id
      WHERE DATE(fl.created_at) BETWEEN ? AND ?
      ORDER BY fl.created_at DESC
    `).all(dateFrom, dateTo);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('财务明细');
    ws.columns = [
      { header: '时间', key: 'created_at', width: 22 },
      { header: '类型', key: 'type', width: 12 },
      { header: '金额', key: 'amount', width: 12 },
      { header: '支付方式', key: 'payment_method', width: 12 },
      { header: '房号', key: 'room_number', width: 10 },
      { header: '客人', key: 'guest_name', width: 14 },
    ];
    ws.getRow(1).font = { bold: true };
    const typeMap = { ROOM_FEE: '房费', DEPOSIT: '押金', INCIDENTAL: '杂费' };
    const methodMap = { WeChat: '微信', Alipay: '支付宝', Cash: '现金' };
    for (const log of logs) {
      ws.addRow({
        ...log,
        type: typeMap[log.type] || log.type,
        payment_method: methodMap[log.payment_method] || log.payment_method,
      });
    }
    await wb.xlsx.writeFile(filePath);
    return filePath;
  });

  // Night audit: export night audit report to Excel
  ipcMain.handle('db:exportNightAudit', async (_event, auditData) => {
    const ExcelJS = require('exceljs');
    const { date, summary, byRoomType, byMethod, occupancy } = auditData;
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '导出夜审报表',
      defaultPath: `夜审报表_${date}.xlsx`,
      filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }],
    });
    if (canceled || !filePath) return null;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`${date} 夜审报表`);

    const methodLabels = { WeChat: '微信', Alipay: '支付宝', Cash: '现金' };
    let row = 1;

    ws.mergeCells(row, 1, row, 4);
    ws.getCell(row, 1).value = `${date} 夜审报表`;
    ws.getCell(row, 1).font = { bold: true, size: 16 };
    ws.getCell(row, 1).alignment = { horizontal: 'center' };
    row += 2;

    ws.getCell(row, 1).value = '收入汇总';
    ws.getCell(row, 1).font = { bold: true, size: 13 };
    row++;
    const summaryData = [
      ['总收入', summary.total],
      ['房费收入', summary.roomFee],
      ['押金收入', summary.deposit],
      ['杂费收入', summary.incidental],
    ];
    for (const [label, val] of summaryData) {
      ws.getCell(row, 1).value = label;
      ws.getCell(row, 2).value = `¥${Number(val).toLocaleString('zh-CN')}`;
      row++;
    }
    row++;

    if (byRoomType && byRoomType.length > 0) {
      ws.getCell(row, 1).value = '按房型统计';
      ws.getCell(row, 1).font = { bold: true, size: 13 };
      row++;
      ws.getCell(row, 1).value = '房型';
      ws.getCell(row, 2).value = '金额';
      ws.getCell(row, 3).value = '订单数';
      ws.getRow(row).font = { bold: true };
      row++;
      for (const rt of byRoomType) {
        ws.getCell(row, 1).value = rt.room_type;
        ws.getCell(row, 2).value = `¥${Number(rt.total).toLocaleString('zh-CN')}`;
        ws.getCell(row, 3).value = rt.order_count;
        row++;
      }
      row++;
    }

    ws.getCell(row, 1).value = '按支付方式统计';
    ws.getCell(row, 1).font = { bold: true, size: 13 };
    row++;
    ws.getCell(row, 1).value = '支付方式';
    ws.getCell(row, 2).value = '金额';
    ws.getCell(row, 3).value = '占比';
    ws.getRow(row).font = { bold: true };
    row++;
    const grandTotal = summary.total || 1;
    for (const m of byMethod) {
      ws.getCell(row, 1).value = methodLabels[m.payment_method] || m.payment_method;
      ws.getCell(row, 2).value = `¥${Number(m.total).toLocaleString('zh-CN')}`;
      ws.getCell(row, 3).value = `${((m.total / grandTotal) * 100).toFixed(1)}%`;
      row++;
    }
    row++;

    ws.getCell(row, 1).value = '入住率统计';
    ws.getCell(row, 1).font = { bold: true, size: 13 };
    row++;
    const occRate = occupancy.totalRooms > 0
      ? `${((occupancy.occupiedRooms / occupancy.totalRooms) * 100).toFixed(0)}%`
      : '0%';
    ws.getCell(row, 1).value = `入住率: ${occRate} (${occupancy.occupiedRooms}/${occupancy.totalRooms}间)`;
    row++;
    ws.getCell(row, 1).value = `空房: ${occupancy.vacantRooms}间`;

    ws.columns = [
      { width: 16 },
      { width: 18 },
      { width: 12 },
      { width: 12 },
    ];

    await wb.xlsx.writeFile(filePath);
    return filePath;
  });

  // Revenue Analytics: monthly revenue breakdown
  ipcMain.handle('db:getMonthlyRevenue', (_event, year) => {
    const db = getDb();
    return db.prepare(`
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
    const db = getDb();
    return db.prepare(`
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
    const db = getDb();
    return db.prepare(`
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
    const db = getDb();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

    const current = db.prepare(`
      SELECT SUM(amount) as total FROM financial_logs
      WHERE strftime('%Y-%m', created_at) = ?
    `).get(currentMonth);

    const last = db.prepare(`
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
    const db = getDb();
    return db.prepare(`
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

  // Price Rules
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
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(updates)) {
      if (key === 'is_active') {
        fields.push(`${key} = ?`);
        values.push(val ? 1 : 0);
      } else {
        fields.push(`${key} = ?`);
        values.push(val);
      }
    }
    values.push(ruleId);
    getDb().prepare(`UPDATE price_rules SET ${fields.join(', ')} WHERE rule_id = ?`).run(...values);
    return getDb().prepare('SELECT * FROM price_rules WHERE rule_id = ?').get(ruleId);
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

  // Invoices
  ipcMain.handle('db:getInvoices', () => {
    return getDb().prepare(`
      SELECT i.*, o.guest_name, r.room_number, o.check_in_date, o.check_out_date, o.actual_amount
      FROM invoices i
      JOIN orders o ON i.order_id = o.order_id
      JOIN rooms r ON o.room_id = r.room_id
      ORDER BY i.created_at DESC
    `).all();
  });

  ipcMain.handle('db:insertInvoice', (_event, invoice) => {
    const stmt = getDb().prepare(`
      INSERT INTO invoices (order_id, title, tax_number, company_address, phone,
        bank_name, bank_account, invoice_type, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      invoice.order_id, invoice.title, invoice.tax_number || null,
      invoice.company_address || null, invoice.phone || null,
      invoice.bank_name || null, invoice.bank_account || null,
      invoice.invoice_type || 'normal', invoice.notes || null
    );
    return getDb().prepare('SELECT * FROM invoices WHERE invoice_id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('db:updateInvoice', (_event, invoiceId, updates) => {
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    values.push(invoiceId);
    getDb().prepare(`UPDATE invoices SET ${fields.join(', ')} WHERE invoice_id = ?`).run(...values);
    return getDb().prepare('SELECT * FROM invoices WHERE invoice_id = ?').get(invoiceId);
  });

  ipcMain.handle('db:deleteInvoice', (_event, invoiceId) => {
    getDb().prepare('DELETE FROM invoices WHERE invoice_id = ?').run(invoiceId);
    return true;
  });

  ipcMain.handle('db:markInvoiceIssued', (_event, invoiceId) => {
    getDb().prepare(`
      UPDATE invoices SET status = 'issued', issued_at = datetime('now')
      WHERE invoice_id = ?
    `).run(invoiceId);
    return getDb().prepare('SELECT * FROM invoices WHERE invoice_id = ?').get(invoiceId);
  });

  ipcMain.handle('db:exportInvoiceList', async (_event, status) => {
    const ExcelJS = require('exceljs');
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '导出发票清单',
      defaultPath: `发票清单_${new Date().toISOString().slice(0, 10)}.xlsx`,
      filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }],
    });
    if (canceled || !filePath) return null;

    let invoices;
    if (status !== 'all') {
      invoices = getDb().prepare(`
        SELECT i.*, o.guest_name, r.room_number, o.check_in_date, o.check_out_date, o.actual_amount
        FROM invoices i
        JOIN orders o ON i.order_id = o.order_id
        JOIN rooms r ON o.room_id = r.room_id
        WHERE i.status = ?
        ORDER BY i.created_at DESC
      `).all(status);
    } else {
      invoices = getDb().prepare(`
        SELECT i.*, o.guest_name, r.room_number, o.check_in_date, o.check_out_date, o.actual_amount
        FROM invoices i
        JOIN orders o ON i.order_id = o.order_id
        JOIN rooms r ON o.room_id = r.room_id
        ORDER BY i.created_at DESC
      `).all();
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('发票清单');
    ws.columns = [
      { header: '发票编号', key: 'invoice_id', width: 10 },
      { header: '状态', key: 'status', width: 10 },
      { header: '发票抬头', key: 'title', width: 30 },
      { header: '税号', key: 'tax_number', width: 20 },
      { header: '客人', key: 'guest_name', width: 15 },
      { header: '房号', key: 'room_number', width: 10 },
      { header: '入住日期', key: 'check_in_date', width: 15 },
      { header: '退房日期', key: 'check_out_date', width: 15 },
      { header: '金额', key: 'actual_amount', width: 12 },
      { header: '发票类型', key: 'invoice_type', width: 10 },
      { header: '开票时间', key: 'issued_at', width: 20 },
    ];

    const statusMap = { issued: '已开票', pending: '待开票', cancelled: '已取消' };
    const typeMap = { special: '专票', normal: '普票' };
    for (const inv of invoices) {
      ws.addRow({
        ...inv,
        status: statusMap[inv.status] || inv.status,
        invoice_type: typeMap[inv.invoice_type] || inv.invoice_type,
      });
    }

    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };

    await wb.xlsx.writeFile(filePath);
    return filePath;
  });

  // Guests
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
    const stmt = getDb().prepare(
      'INSERT INTO guests (name, phone, id_card, email, notes) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(guest.name, guest.phone || null, guest.id_card || null, guest.email || null, guest.notes || null);
    return getDb().prepare('SELECT * FROM guests WHERE guest_id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('db:updateGuest', (_event, guestId, updates) => {
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(guestId);
    getDb().prepare(`UPDATE guests SET ${fields.join(', ')} WHERE guest_id = ?`).run(...values);
    return getDb().prepare('SELECT * FROM guests WHERE guest_id = ?').get(guestId);
  });

  ipcMain.handle('db:deleteGuest', (_event, guestId) => {
    const order = getDb().prepare('SELECT order_id FROM orders WHERE guest_id = ? LIMIT 1').get(guestId);
    if (order) {
      return { error: '该客人有关联的订单，无法删除' };
    }
    getDb().prepare('DELETE FROM guests WHERE guest_id = ?').run(guestId);
    return true;
  });

  ipcMain.handle('db:getGuestsWithStats', () => {
    return getDb().prepare(`
      SELECT
        g.*,
        COUNT(DISTINCT o.order_id) as order_count,
        COALESCE(SUM(o.actual_amount), 0) as total_spent,
        MAX(o.check_in_date) as last_check_in,
        (
          SELECT r2.room_type
          FROM orders o2
          JOIN rooms r2 ON o2.room_id = r2.room_id
          WHERE o2.guest_id = g.guest_id
          GROUP BY r2.room_type
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as preferred_room_type
      FROM guests g
      LEFT JOIN orders o ON o.guest_id = g.guest_id
      GROUP BY g.guest_id
      ORDER BY g.name
    `).all();
  });

  ipcMain.handle('db:searchGuests', (_event, query) => {
    return getDb().prepare(`
      SELECT * FROM guests
      WHERE name LIKE ? OR phone LIKE ?
      ORDER BY name
      LIMIT 20
    `).all(`%${query}%`, `%${query}%`);
  });

  ipcMain.handle('db:getGuestOrders', (_event, guestName) => {
    return getDb().prepare(`
      SELECT o.*, r.room_number, r.room_type
      FROM orders o
      JOIN rooms r ON o.room_id = r.room_id
      WHERE o.guest_name = ?
      ORDER BY o.check_in_date DESC
    `).all(guestName);
  });

  ipcMain.handle('db:findOrCreateGuest', (_event, guestData) => {
    const db = getDb();

    if (guestData.phone) {
      const existing = db.prepare('SELECT * FROM guests WHERE phone = ?').get(guestData.phone);
      if (existing) {
        if (guestData.name && guestData.name !== existing.name) {
          db.prepare('UPDATE guests SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE guest_id = ?')
            .run(guestData.name, existing.guest_id);
        }
        return existing;
      }
    }

    const stmt = db.prepare(
      'INSERT INTO guests (name, phone, id_card, email, notes) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(
      guestData.name, guestData.phone || null, guestData.id_card || null,
      guestData.email || null, guestData.notes || null
    );
    return db.prepare('SELECT * FROM guests WHERE guest_id = ?').get(result.lastInsertRowid);
  });

  // Data Backup & Restore
  ipcMain.handle('db:getBackups', () => {
    const backupDir = path.join(app.getPath('userData'), 'LiteStay', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      return [];
    }
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.sqlite'))
      .map(f => {
        const filePath = path.join(backupDir, f);
        const stats = fs.statSync(filePath);
        return {
          filename: f,
          path: filePath,
          size: stats.size,
          created_at: stats.birthtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return files;
  });

  ipcMain.handle('db:createBackup', async (_event, customName) => {
    const dbPath = path.join(app.getPath('userData'), 'LiteStay', 'database.sqlite');
    const backupDir = path.join(app.getPath('userData'), 'LiteStay', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = customName
      ? `${customName}_${timestamp}.sqlite`
      : `backup_${timestamp}.sqlite`;
    const backupPath = path.join(backupDir, filename);
    fs.copyFileSync(dbPath, backupPath);
    const stats = fs.statSync(backupPath);
    if (stats.size === 0) {
      fs.unlinkSync(backupPath);
      throw new Error('备份文件为空，备份失败');
    }
    return {
      filename,
      path: backupPath,
      size: stats.size,
      created_at: stats.birthtime.toISOString(),
    };
  });

  ipcMain.handle('db:restoreBackup', async (_event, backupFilename) => {
    const backupDir = path.join(app.getPath('userData'), 'LiteStay', 'backups');
    const backupPath = path.join(backupDir, backupFilename);
    const dbPath = path.join(app.getPath('userData'), 'LiteStay', 'database.sqlite');
    if (!fs.existsSync(backupPath)) {
      throw new Error('备份文件不存在');
    }
    const stats = fs.statSync(backupPath);
    if (stats.size === 0) {
      throw new Error('备份文件损坏');
    }
    const tempBackup = dbPath + '.temp';
    fs.copyFileSync(dbPath, tempBackup);
    try {
      closeDb();
      fs.copyFileSync(backupPath, dbPath);
      const Database = require('better-sqlite3');
      const testDb = new Database(dbPath);
      testDb.prepare('SELECT COUNT(*) FROM rooms').get();
      testDb.close();
      fs.unlinkSync(tempBackup);
      getDb();
      return true;
    } catch (e) {
      closeDb();
      fs.copyFileSync(tempBackup, dbPath);
      fs.unlinkSync(tempBackup);
      getDb();
      throw new Error('备份文件损坏，恢复失败：' + e.message);
    }
  });

  ipcMain.handle('db:deleteBackup', (_event, backupFilename) => {
    const backupDir = path.join(app.getPath('userData'), 'LiteStay', 'backups');
    const backupPath = path.join(backupDir, backupFilename);
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
    return true;
  });

  ipcMain.handle('db:exportBackup', async (_event, backupFilename) => {
    const backupDir = path.join(app.getPath('userData'), 'LiteStay', 'backups');
    const backupPath = path.join(backupDir, backupFilename);
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: backupFilename,
      filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }],
    });
    if (filePath) {
      fs.copyFileSync(backupPath, filePath);
      return filePath;
    }
    return null;
  });

  ipcMain.handle('db:importBackup', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }],
      properties: ['openFile'],
    });
    if (filePaths && filePaths.length > 0) {
      const sourcePath = filePaths[0];
      const backupDir = path.join(app.getPath('userData'), 'LiteStay', 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const filename = `imported_${Date.now()}.sqlite`;
      const backupPath = path.join(backupDir, filename);
      fs.copyFileSync(sourcePath, backupPath);
      const stats = fs.statSync(backupPath);
      if (stats.size === 0) {
        fs.unlinkSync(backupPath);
        throw new Error('导入的文件为空');
      }
      return {
        filename,
        path: backupPath,
        size: stats.size,
        created_at: stats.birthtime.toISOString(),
      };
    }
    return null;
  });
}

module.exports = { registerIpcHandlers };
