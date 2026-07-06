// LiteStay - Backup & Restore IPC Handlers

const { app, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { closeDb } = require('../database.cjs');

function registerHandlers(ipcMain, getDb, getMainWindow) {

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

module.exports = { registerHandlers };
