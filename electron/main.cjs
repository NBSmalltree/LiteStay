// LiteStay - Electron 主进程
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

// --- Database ---
let db = null;

function getDb() {
  if (!db) {
    const Database = require('better-sqlite3');
    const dbPath = path.join(app.getPath('userData'), 'LiteStay', 'database.sqlite');
    console.log('[LiteStay] 数据库路径:', dbPath);

    const fs = require('fs');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables(db);
    console.log('[LiteStay] 数据库初始化成功');
  }
  return db;
}

function initTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS room_types (
      type_id INTEGER PRIMARY KEY AUTOINCREMENT,
      type_name TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS rooms (
      room_id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_number TEXT NOT NULL UNIQUE,
      room_type TEXT NOT NULL,
      base_price REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS orders (
      order_id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      guest_name TEXT NOT NULL,
      check_in_date TEXT NOT NULL,
      check_out_date TEXT NOT NULL,
      actual_amount REAL DEFAULT 0,
      deposit REAL DEFAULT 0,
      status TEXT DEFAULT 'IN_HOUSE',
      FOREIGN KEY(room_id) REFERENCES rooms(room_id)
    );
    CREATE TABLE IF NOT EXISTS financial_logs (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default room types if empty
  const count = database.prepare('SELECT COUNT(*) as c FROM room_types').get();
  if (count.c === 0) {
    const defaults = ['标准间', '大床房', '双床房', '豪华套房', '家庭房'];
    const stmt = database.prepare('INSERT OR IGNORE INTO room_types (type_name, sort_order) VALUES (?, ?)');
    defaults.forEach((name, i) => stmt.run(name, i + 1));
  }

  // Migration: add notes column to orders if missing
  try {
    database.prepare('SELECT notes FROM orders LIMIT 1').get();
  } catch (e) {
    database.exec('ALTER TABLE orders ADD COLUMN notes TEXT');
  }
}

// --- IPC Handlers ---
function registerIpcHandlers() {
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
      'INSERT INTO orders (room_id, guest_name, check_in_date, check_out_date, actual_amount, deposit, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(
      order.room_id, order.guest_name, order.check_in_date,
      order.check_out_date, order.actual_amount, order.deposit, order.status, order.notes || null
    );
    return getDb().prepare('SELECT * FROM orders WHERE order_id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('db:getOrders', () => {
    return getDb().prepare('SELECT * FROM orders ORDER BY check_in_date DESC').all();
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
    getDb().prepare('DELETE FROM orders WHERE order_id = ?').run(orderId);
    if (mainWindow) mainWindow.webContents.send('orders:changed');
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

  // Phase 4: Financial summary
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

  // Phase 4: Financial logs with order/room detail
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

  // Phase 4: Export to Excel
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

    // Title
    ws.mergeCells(row, 1, row, 4);
    ws.getCell(row, 1).value = `${date} 夜审报表`;
    ws.getCell(row, 1).font = { bold: true, size: 16 };
    ws.getCell(row, 1).alignment = { horizontal: 'center' };
    row += 2;

    // Summary section
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

    // By room type
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

    // By payment method
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

    // Occupancy
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

// --- Window ---
let mainWindow = null;

// Window control IPC — registered once, outside createWindow
ipcMain.on('win:minimize', () => mainWindow?.minimize());
ipcMain.on('win:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('win:close', () => {
  mainWindow?.close();
  app.quit();
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: 'LiteStay',
    icon: path.join(__dirname, '../build/icon.png'),
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Notify renderer of maximize state changes
  mainWindow.on('maximize', () => mainWindow.webContents.send('win:maximized', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('win:maximized', false));

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// --- App Lifecycle ---
registerIpcHandlers();

app.whenReady().then(() => {
  // Set dock icon on macOS
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(path.join(__dirname, '../build/icon.png'));
  }
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
