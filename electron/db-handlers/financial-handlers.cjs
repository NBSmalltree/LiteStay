// LiteStay - Financial IPC Handlers

const { app, dialog } = require('electron');
const { buildUpdateQuery } = require('./utils.cjs');

function registerHandlers(ipcMain, getDb, getMainWindow) {

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
    const db = getDb();
    const { sql, values } = buildUpdateQuery('financial_logs', 'log_id', logId, updates);
    db.prepare(sql).run(...values);
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
}

module.exports = { registerHandlers };
