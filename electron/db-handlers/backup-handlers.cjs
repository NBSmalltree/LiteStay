// LiteStay - Backup & Restore IPC Handlers

const { app, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { closeDb } = require('../database.cjs');

const backupDir = () => path.join(app.getPath('userData'), 'LiteStay', 'backups');
const dbPath = () => path.join(app.getPath('userData'), 'LiteStay', 'database.sqlite');
const backupPath = (name) => path.join(backupDir(), name);
const ensureDir = (d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); };
const backupMeta = (filename, filePath) => {
  const stats = fs.statSync(filePath);
  return { filename, path: filePath, size: stats.size, created_at: stats.birthtime.toISOString() };
};

function registerHandlers(ipcMain, getDb) {

  ipcMain.handle('db:getBackups', () => {
    const dir = backupDir();
    if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); return []; }
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.sqlite'))
      .map(f => backupMeta(f, path.join(dir, f)))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });

  ipcMain.handle('db:createBackup', async (_event, customName) => {
    ensureDir(backupDir());
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = customName ? `${customName}_${timestamp}.sqlite` : `backup_${timestamp}.sqlite`;
    const dest = backupPath(filename);
    fs.copyFileSync(dbPath(), dest);
    if (fs.statSync(dest).size === 0) { fs.unlinkSync(dest); throw new Error('备份文件为空，备份失败'); }
    return backupMeta(filename, dest);
  });

  ipcMain.handle('db:restoreBackup', async (_event, backupFilename) => {
    const src = backupPath(backupFilename);
    if (!fs.existsSync(src)) throw new Error('备份文件不存在');
    if (fs.statSync(src).size === 0) throw new Error('备份文件损坏');
    const dest = dbPath();
    const temp = dest + '.temp';
    fs.copyFileSync(dest, temp);
    try {
      closeDb();
      fs.copyFileSync(src, dest);
      const Database = require('better-sqlite3');
      const testDb = new Database(dest);
      testDb.prepare('SELECT COUNT(*) FROM rooms').get();
      testDb.close();
      fs.unlinkSync(temp);
      getDb();
      return true;
    } catch (e) {
      closeDb();
      fs.copyFileSync(temp, dest);
      fs.unlinkSync(temp);
      getDb();
      throw new Error('备份文件损坏，恢复失败：' + e.message);
    }
  });

  ipcMain.handle('db:deleteBackup', (_event, backupFilename) => {
    const file = backupPath(backupFilename);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return true;
  });

  ipcMain.handle('db:exportBackup', async (_event, backupFilename) => {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: backupFilename,
      filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }],
    });
    if (filePath) { fs.copyFileSync(backupPath(backupFilename), filePath); return filePath; }
    return null;
  });

  ipcMain.handle('db:importBackup', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }],
      properties: ['openFile'],
    });
    if (!filePaths?.length) return null;
    const dir = backupDir();
    ensureDir(dir);
    const filename = `imported_${Date.now()}.sqlite`;
    const dest = path.join(dir, filename);
    fs.copyFileSync(filePaths[0], dest);
    if (fs.statSync(dest).size === 0) { fs.unlinkSync(dest); throw new Error('导入的文件为空'); }
    return backupMeta(filename, dest);
  });
}

module.exports = { registerHandlers };
