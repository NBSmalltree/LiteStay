// LiteStay - Financial IPC Handlers

const { CH, dialog } = require('electron');
const { buildUpdateQuery } = require('./utils.cjs');
const ExcelJS = require('exceljs');

const METHOD_LABELS = { WeChat: '微信', Alipay: '支付宝', Cash: '现金' };

async function saveExcelDialog(title, defaultPath) {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title, defaultPath, filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }],
  });
  return canceled || !filePath ? null : filePath;
}

function registerHandlers(ipcMain, getDb, getMainWindow) {

  // Financial Logs
  ipcMain.handle('CH.insertFinancialLog', (_event, log) => {
    const stmt = getDb().prepare(
      'INSERT INTO financial_logs (order_id, type, amount, payment_method) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(log.order_id, log.type, log.amount, log.payment_method);
    return getDb().prepare('SELECT * FROM financial_logs WHERE log_id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('CH.getFinancialLogs', (_event, date) => {
    if (date) {
      return getDb().prepare("SELECT * FROM financial_logs WHERE DATE(created_at) = ? ORDER BY created_at DESC").all(date);
    }
    return getDb().prepare('SELECT * FROM financial_logs ORDER BY created_at DESC').all();
  });

  ipcMain.handle('CH.getFinancialLogsByOrder', (_event, orderId) => {
    return getDb().prepare('SELECT * FROM financial_logs WHERE order_id = ? ORDER BY created_at DESC').all(orderId);
  });

  ipcMain.handle('CH.updateFinancialLogPayment', (_event, orderId, paymentMethod) => {
    getDb().prepare('UPDATE financial_logs SET payment_method = ? WHERE order_id = ?').run(paymentMethod, orderId);
    return true;
  });

  ipcMain.handle('CH.updateFinancialLogAmount', (_event, orderId, type, amount) => {
    getDb().prepare('UPDATE financial_logs SET amount = ? WHERE order_id = ? AND type = ?').run(amount, orderId, type);
    return true;
  });

  ipcMain.handle('CH.deleteFinancialLog', (_event, logId) => {
    getDb().prepare('DELETE FROM financial_logs WHERE log_id = ?').run(logId);
    return true;
  });

  ipcMain.handle('CH.updateFinancialLog', (_event, logId, updates) => {
    const db = getDb();
    const { sql, values } = buildUpdateQuery('financial_logs', 'log_id', logId, updates);
    db.prepare(sql).run(...values);
    return true;
  });

  ipcMain.handle('CH.getIncidentalSums', () => {
    return getDb().prepare(`SELECT order_id, SUM(amount) as total
FROM financial_logs WHERE type = 'INCIDENTAL' AND order_id IS NOT NULL GROUP BY order_id`).all();
  });

  // Financial summary
  ipcMain.handle('CH.getFinancialSummary', (_event, dateFrom, dateTo) => {
    const db = getDb();
    const byMethod = db.prepare(`SELECT payment_method, SUM(amount) as total
FROM financial_logs WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY payment_method`).all(dateFrom, dateTo);
    const daily = db.prepare(`SELECT DATE(created_at) as date, SUM(amount) as total
FROM financial_logs WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY DATE(created_at) ORDER BY date`).all(dateFrom, dateTo);
    const row = db.prepare(`SELECT COALESCE(SUM(CASE WHEN type = 'ROOM_FEE' THEN amount ELSE 0 END), 0) as roomFee,
COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END), 0) as deposit,
COALESCE(SUM(CASE WHEN type = 'INCIDENTAL' THEN amount ELSE 0 END), 0) as incidental
FROM financial_logs WHERE DATE(created_at) BETWEEN ? AND ?`).get(dateFrom, dateTo);
    return { byMethod, daily, ...row };
  });

  // Financial logs with order/room detail
  ipcMain.handle('CH.getFinancialLogsDetailed', (_event, dateFrom, dateTo) => {
    return getDb().prepare(`SELECT fl.*, o.guest_name, r.room_number
FROM financial_logs fl LEFT JOIN orders o ON fl.order_id = o.order_id
LEFT JOIN rooms r ON o.room_id = r.room_id
WHERE DATE(fl.created_at) BETWEEN ? AND ? ORDER BY fl.created_at DESC`).all(dateFrom, dateTo);
  });

  // Night audit: revenue by room type
  ipcMain.handle('CH.getRevenueByRoomType', (_event, dateFrom, dateTo) => {
    return getDb().prepare(`SELECT r.room_type, SUM(fl.amount) as total, COUNT(DISTINCT fl.order_id) as order_count
FROM financial_logs fl JOIN orders o ON fl.order_id = o.order_id JOIN rooms r ON o.room_id = r.room_id
WHERE fl.type = 'ROOM_FEE' AND DATE(fl.created_at) BETWEEN ? AND ? GROUP BY r.room_type`).all(dateFrom, dateTo);
  });

  // Night audit: occupancy stats for a given date
  ipcMain.handle('CH.getOccupancyStats', (_event, date) => {
    const db = getDb();
    const totalRooms = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
    const occupiedRooms = db.prepare(`SELECT COUNT(DISTINCT room_id) as count FROM orders
WHERE status = 'IN_HOUSE' AND check_in_date <= ? AND check_out_date > ?`).get(date, date).count;
    return { totalRooms, occupiedRooms, vacantRooms: totalRooms - occupiedRooms };
  });

  // Export financial logs to Excel
  ipcMain.handle('CH.exportFinancialLogs', async (_event, dateFrom, dateTo) => {
    const filePath = await saveExcelDialog('导出财务报表', `财务报表_${dateFrom}_${dateTo}.xlsx`);
    if (!filePath) return null;

    const logs = getDb().prepare(`SELECT fl.created_at, fl.type, fl.amount, fl.payment_method, o.guest_name, r.room_number
FROM financial_logs fl LEFT JOIN orders o ON fl.order_id = o.order_id LEFT JOIN rooms r ON o.room_id = r.room_id
WHERE DATE(fl.created_at) BETWEEN ? AND ? ORDER BY fl.created_at DESC`).all(dateFrom, dateTo);

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
    for (const log of logs) {
      ws.addRow({ ...log, type: typeMap[log.type] || log.type, payment_method: METHOD_LABELS[log.payment_method] || log.payment_method });
    }
    await wb.xlsx.writeFile(filePath);
    return filePath;
  });

  // Night audit: export night audit report to Excel
  ipcMain.handle('CH.exportNightAudit', async (_event, auditData) => {
    const { date, summary, byRoomType, byMethod, occupancy } = auditData;
    const filePath = await saveExcelDialog('导出夜审报表', `夜审报表_${date}.xlsx`);
    if (!filePath) return null;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`${date} 夜审报表`);
    let row = 1;

    const section = (label) => { ws.getCell(row, 1).value = label; ws.getCell(row, 1).font = { bold: true, size: 13 }; row++; };
    const cell = (col, val) => { ws.getCell(row, col).value = val; };
    const headerRow = (cols) => { cols.forEach((c, i) => cell(i + 1, c)); ws.getRow(row).font = { bold: true }; row++; };
    const money = (v) => `¥${Number(v).toLocaleString('zh-CN')}`;

    ws.mergeCells(row, 1, row, 4);
    cell(1, `${date} 夜审报表`);
    ws.getCell(row, 1).font = { bold: true, size: 16 };
    ws.getCell(row, 1).alignment = { horizontal: 'center' };
    row += 2;

    section('收入汇总');
    [['总收入', summary.total], ['房费收入', summary.roomFee], ['押金收入', summary.deposit], ['杂费收入', summary.incidental]]
      .forEach(([label, val]) => { cell(1, label); cell(2, money(val)); row++; });
    row++;

    if (byRoomType?.length) {
      section('按房型统计');
      headerRow(['房型', '金额', '订单数']);
      byRoomType.forEach(rt => { cell(1, rt.room_type); cell(2, money(rt.total)); cell(3, rt.order_count); row++; });
      row++;
    }

    section('按支付方式统计');
    headerRow(['支付方式', '金额', '占比']);
    const grandTotal = summary.total || 1;
    byMethod.forEach(m => {
      cell(1, METHOD_LABELS[m.payment_method] || m.payment_method);
      cell(2, money(m.total));
      cell(3, `${((m.total / grandTotal) * 100).toFixed(1)}%`);
      row++;
    });
    row++;

    section('入住率统计');
    const occRate = occupancy.totalRooms > 0 ? `${((occupancy.occupiedRooms / occupancy.totalRooms) * 100).toFixed(0)}%` : '0%';
    cell(1, `入住率: ${occRate} (${occupancy.occupiedRooms}/${occupancy.totalRooms}间)`); row++;
    cell(1, `空房: ${occupancy.vacantRooms}间`);

    ws.columns = [{ width: 16 }, { width: 18 }, { width: 12 }, { width: 12 }];
    await wb.xlsx.writeFile(filePath);
    return filePath;
  });
}

module.exports = { registerHandlers };
