// LiteStay - 版本/授权管理
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const EDITION_FILE = 'edition.json';
const TRIAL_DAYS = 30;

function getEditionDataPath() {
  return path.join(app.getPath('userData'), 'LiteStay', EDITION_FILE);
}

function defaultTrialData() {
  return { edition: 'trial', trialStartDate: new Date().toISOString(), lastLaunchTime: 0, activatedAt: null, licenseKey: null };
}

function trialStatus(data) {
  const now = Date.now();
  const trialStart = new Date(data.trialStartDate).getTime();
  const daysElapsed = (now - trialStart) / (24 * 60 * 60 * 1000);
  const clockRollback = data.lastLaunchTime > 0 && now < data.lastLaunchTime;
  return { daysElapsed, clockRollback, expired: daysElapsed >= TRIAL_DAYS || clockRollback };
}

function readEditionData() {
  const filePath = getEditionDataPath();
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    console.log('[LiteStay] 读取 edition.json 失败');
    return defaultTrialData();
  }
}

function writeEditionData(data) {
  const filePath = getEditionDataPath();
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('[LiteStay] 写入 edition.json 失败:', error.message);
    return false;
  }
}

function ensureEditionFile() {
  if (!fs.existsSync(getEditionDataPath())) {
    console.log('[LiteStay] edition.json 不存在，创建默认文件');
    writeEditionData(defaultTrialData());
  }
}

function checkTrialCore(update = false) {
  const data = readEditionData();
  if (data.edition !== 'trial') return { expired: false, clockRollback: false };
  const { clockRollback } = trialStatus(data);
  const now = Date.now();
  if (update && !clockRollback) {
    data.lastLaunchTime = Math.max(now, data.lastLaunchTime);
    writeEditionData(data);
  }
  return trialStatus(data);
}

function getEditionInfo() {
  const data = readEditionData();
  if (data.edition !== 'trial') {
    return { edition: data.edition, trialExpired: false, trialDaysRemaining: null, trialStartDate: null, activatedAt: data.activatedAt };
  }
  const { daysElapsed, expired } = trialStatus(data);
  return { edition: 'trial', trialExpired: expired, trialDaysRemaining: Math.max(0, Math.floor(TRIAL_DAYS - daysElapsed)), trialStartDate: data.trialStartDate, activatedAt: null };
}

function activateLicense(licenseKey) {
  try {
    const parts = licenseKey.split('-');
    if (parts.length < 2) return { success: false, error: '授权码格式无效' };
    const edition = parts[0].toLowerCase();
    if (!['basic', 'pro', 'ultimate'].includes(edition)) return { success: false, error: '授权码版本无效' };
    const timestamp = parseInt(parts[1]);
    if (isNaN(timestamp) || timestamp <= 0) return { success: false, error: '授权码时间戳无效' };
    const data = readEditionData();
    data.edition = edition;
    data.activatedAt = new Date().toISOString();
    data.licenseKey = licenseKey;
    return writeEditionData(data) ? { success: true, edition } : { success: false, error: '保存授权信息失败' };
  } catch (error) {
    console.error('[LiteStay] 授权码激活失败:', error.message);
    return { success: false, error: '授权码处理失败' };
  }
}

module.exports = { getEditionDataPath, readEditionData, writeEditionData, ensureEditionFile, checkTrialCore, getEditionInfo, activateLicense };
