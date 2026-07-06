// LiteStay - IPC Handler Shared Utilities

function buildUpdateQuery(tableName, idField, idValue, updates, extraFields = []) {
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(val);
  }
  for (const extra of extraFields) {
    fields.push(extra);
  }
  values.push(idValue);
  const sql = `UPDATE ${tableName} SET ${fields.join(', ')} WHERE ${idField} = ?`;
  return { sql, values };
}

function notifyOrdersChanged(getMainWindow) {
  const mw = getMainWindow();
  if (mw) mw.webContents.send('orders:changed');
}

module.exports = { buildUpdateQuery, notifyOrdersChanged };
