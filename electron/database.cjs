// LiteStay - 数据库初始化与连接管理
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

let db = null;

function getDb() {
  if (!db) {
    const Database = require('better-sqlite3');
    const dbPath = path.join(app.getPath('userData'), 'LiteStay', 'database.sqlite');
    console.log('[LiteStay] 数据库路径:', dbPath);
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables(db);
    console.log('[LiteStay] 数据库初始化成功');
  }
  return db;
}

function closeDb() {
  if (db) { db.close(); db = null; }
}

function migrateColumn(database, table, column, alterSQL) {
  try { database.prepare(`SELECT ${column} FROM ${table} LIMIT 1`).get(); }
  catch { database.exec(alterSQL); }
}

function initTables(database) {
  database.exec(`
CREATE TABLE IF NOT EXISTS room_types (type_id INTEGER PRIMARY KEY AUTOINCREMENT, type_name TEXT NOT NULL UNIQUE, sort_order INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS rooms (room_id INTEGER PRIMARY KEY AUTOINCREMENT, room_number TEXT NOT NULL UNIQUE, room_type TEXT NOT NULL, base_price REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS orders (order_id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, guest_name TEXT NOT NULL, check_in_date TEXT NOT NULL, check_out_date TEXT NOT NULL, actual_amount REAL DEFAULT 0, deposit REAL DEFAULT 0, status TEXT DEFAULT 'IN_HOUSE', FOREIGN KEY(room_id) REFERENCES rooms(room_id));
CREATE TABLE IF NOT EXISTS financial_logs (log_id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, type TEXT NOT NULL, amount REAL NOT NULL, payment_method TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS price_rules (rule_id INTEGER PRIMARY KEY AUTOINCREMENT, room_type TEXT NOT NULL, rule_name TEXT NOT NULL, rule_type TEXT NOT NULL, start_date TEXT, end_date TEXT, price_multiplier REAL DEFAULT 1.0, fixed_price REAL, priority INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS guests (guest_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, id_card TEXT, email TEXT, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS invoices (invoice_id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, title TEXT NOT NULL, tax_number TEXT, company_address TEXT, phone TEXT, bank_name TEXT, bank_account TEXT, invoice_type TEXT DEFAULT 'normal', status TEXT DEFAULT 'pending', issued_at DATETIME, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(order_id) REFERENCES orders(order_id));
`);

  // Seed default room types if empty
  if (database.prepare('SELECT COUNT(*) as c FROM room_types').get().c === 0) {
    ['标准间', '大床房', '双床房', '豪华套房', '家庭房']
      .forEach((name, i) => database.prepare('INSERT OR IGNORE INTO room_types (type_name, sort_order) VALUES (?, ?)').run(name, i + 1));
  }

  // Migrations
  migrateColumn(database, 'orders', 'notes', "ALTER TABLE orders ADD COLUMN notes TEXT");
  migrateColumn(database, 'orders', 'source', 'ALTER TABLE orders ADD COLUMN source TEXT DEFAULT "direct"');
  migrateColumn(database, 'orders', 'guest_id', 'ALTER TABLE orders ADD COLUMN guest_id INTEGER REFERENCES guests(guest_id)');
}

module.exports = { getDb, initTables, closeDb };
