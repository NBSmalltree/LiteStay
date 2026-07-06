// LiteStay - Invoice IPC Handlers

const { dialog } = require('electron');
const { buildUpdateQuery } = require('./utils.cjs');
const ExcelJS = require('exceljs');

async function saveExcelDialog(title, defaultPath) {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title, defaultPath, filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }],
  });
  return canceled || !filePath ? null : filePath;
}

function registerHandlers(ipcMain, getDb) {

  const invoiceJoinSQL = `SELECT i.*, o.guest_name, r.room_number, o.check_in_date, o.check_out_date, o.actual_amount
FROM invoices i JOIN orders o ON i.order_id = o.order_id JOIN rooms r ON o.room_id = r.room_id`;

  ipcMain.handle('db:getInvoices', () => {
    return getDb().prepare(`${invoiceJoinSQL} ORDER BY i.created_at DESC`).all();
  });

  ipcMain.handle('db:insertInvoice', (_event, invoice) => {
    const stmt = getDb().prepare(`INSERT INTO invoices (order_id, title, tax_number, company_address, phone,
bank_name, bank_account, invoice_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const result = stmt.run(
      invoice.order_id, invoice.title, invoice.tax_number || null,
      invoice.company_address || null, invoice.phone || null,
      invoice.bank_name || null, invoice.bank_account || null,
      invoice.invoice_type || 'normal', invoice.notes || null,
    );
    return getDb().prepare('SELECT * FROM invoices WHERE invoice_id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('db:updateInvoice', (_event, invoiceId, updates) => {
    const db = getDb();
    const { sql, values } = buildUpdateQuery('invoices', 'invoice_id', invoiceId, updates);
    db.prepare(sql).run(...values);
    return db.prepare('SELECT * FROM invoices WHERE invoice_id = ?').get(invoiceId);
  });

  ipcMain.handle('db:deleteInvoice', (_event, invoiceId) => {
    getDb().prepare('DELETE FROM invoices WHERE invoice_id = ?').run(invoiceId);
    return true;
  });

  ipcMain.handle('db:markInvoiceIssued', (_event, invoiceId) => {
    getDb().prepare(`UPDATE invoices SET status = 'issued', issued_at = datetime('now') WHERE invoice_id = ?`).run(invoiceId);
    return getDb().prepare('SELECT * FROM invoices WHERE invoice_id = ?').get(invoiceId);
  });

  ipcMain.handle('db:exportInvoiceList', async (_event, status) => {
    const filePath = await saveExcelDialog('导出发票清单', `发票清单_${new Date().toISOString().slice(0, 10)}.xlsx`);
    if (!filePath) return null;

    const whereClause = status !== 'all' ? ' WHERE i.status = ?' : '';
    const invoices = status !== 'all'
      ? getDb().prepare(`${invoiceJoinSQL}${whereClause} ORDER BY i.created_at DESC`).all(status)
      : getDb().prepare(`${invoiceJoinSQL}${whereClause} ORDER BY i.created_at DESC`).all();

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
      ws.addRow({ ...inv, status: statusMap[inv.status] || inv.status, invoice_type: typeMap[inv.invoice_type] || inv.invoice_type });
    }

    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

    await wb.xlsx.writeFile(filePath);
    return filePath;
  });
}

module.exports = { registerHandlers };
