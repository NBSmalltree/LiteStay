// LiteStay - 版本/授权管理
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const EDITION_FILE = 'edition.json';
const TRIAL_DAYS = 30;

function getEditionDataPath() {
  return path.join(app.getPath('userData'), 'LiteStay', EDITION_FILE);
}

function readEditionData() {
  const filePath = getEditionDataPath();
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.log('[LiteStay] 读取 edition.json 失败:', error.message);
    if (fs.existsSync(filePath)) {
      console.log('[LiteStay] 文件存在但读取失败，返回默认值但保留可能的 trialStartDate');
      try {
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(rawData);
        if (data.trialStartDate) {
          return {
            edition: 'trial',
            trialStartDate: data.trialStartDate,
            lastLaunchTime: data.lastLaunchTime || 0,
            activatedAt: data.activatedAt || null,
            licenseKey: data.licenseKey || null
          };
        }
      } catch (e) {
        // If it still fails, fall through to defaults
      }
    }
    return {
      edition: 'trial',
      trialStartDate: new Date().toISOString(),
      lastLaunchTime: 0,
      activatedAt: null,
      licenseKey: null
    };
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
  const filePath = getEditionDataPath();
  if (!fs.existsSync(filePath)) {
    console.log('[LiteStay] edition.json 不存在，创建默认文件');
    const defaultData = {
      edition: 'trial',
      trialStartDate: new Date().toISOString(),
      lastLaunchTime: 0,
      activatedAt: null,
      licenseKey: null
    };
    writeEditionData(defaultData);
  }
}

function checkTrialCore(update = false) {
  const data = readEditionData();
  if (data.edition !== 'trial') {
    return { expired: false, clockRollback: false };
  }

  const now = Date.now();
  const clockRollback = data.lastLaunchTime > 0 && now < data.lastLaunchTime;
  const trialStart = new Date(data.trialStartDate).getTime();
  const daysElapsed = (now - trialStart) / (24 * 60 * 60 * 1000);
  const expired = daysElapsed >= TRIAL_DAYS || clockRollback;

  if (update && !clockRollback) {
    data.lastLaunchTime = Math.max(now, data.lastLaunchTime);
    writeEditionData(data);
  }

  return { expired, clockRollback };
}

function getEditionInfo() {
  const data = readEditionData();
  const now = Date.now();

  if (data.edition !== 'trial') {
    return {
      edition: data.edition,
      trialExpired: false,
      trialDaysRemaining: null,
      trialStartDate: null,
      activatedAt: data.activatedAt
    };
  }

  const trialStart = new Date(data.trialStartDate).getTime();
  const daysElapsed = (now - trialStart) / (24 * 60 * 60 * 1000);
  const daysRemaining = Math.max(0, Math.floor(TRIAL_DAYS - daysElapsed));
  const clockRollback = data.lastLaunchTime > 0 && now < data.lastLaunchTime;
  const expired = daysElapsed >= TRIAL_DAYS || clockRollback;

  return {
    edition: 'trial',
    trialExpired: expired,
    trialDaysRemaining: daysRemaining,
    trialStartDate: data.trialStartDate,
    activatedAt: null
  };
}

function activateLicense(licenseKey) {
  try {
    const parts = licenseKey.split('-');
    if (parts.length < 2) {
      return { success: false, error: '授权码格式无效' };
    }

    const edition = parts[0].toLowerCase();
    if (!['basic', 'pro', 'ultimate'].includes(edition)) {
      return { success: false, error: '授权码版本无效' };
    }

    const timestamp = parseInt(parts[1]);
    if (isNaN(timestamp) || timestamp <= 0) {
      return { success: false, error: '授权码时间戳无效' };
    }

    const data = readEditionData();
    data.edition = edition;
    data.activatedAt = new Date().toISOString();
    data.licenseKey = licenseKey;

    if (writeEditionData(data)) {
      return { success: true, edition };
    } else {
      return { success: false, error: '保存授权信息失败' };
    }
  } catch (error) {
    console.error('[LiteStay] 授权码激活失败:', error.message);
    return { success: false, error: '授权码处理失败' };
  }
}

module.exports = {
  getEditionDataPath,
  readEditionData,
  writeEditionData,
  ensureEditionFile,
  checkTrialCore,
  getEditionInfo,
  activateLicense
};
