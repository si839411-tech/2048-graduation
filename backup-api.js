/* V19: 서명된 세이브 백업. 서버에는 세이브를 저장하지 않는다. */
'use strict';
const crypto = require('node:crypto');

const FORMAT = '2048-signed-save';
const VERSION = 1;
const ACHIEVEMENT_KEY = '2048_achievements_v14';
const ITEM_MAX = {1:5, 2:10, 3:1, 4:1, 5:10, 6:10, 7:1, 8:1,
  9:2, 10:2, 11:1, 12:1, 13:1, 14:1, 15:1, 16:1000};
const ONE_TIME = new Set([3,4,7,8,11,12,15]);
const STAGES = new Set();
for (let main = 1; main <= 9; main++) {
  const count = main <= 4 ? 4 : (main <= 6 ? 2 : 1);
  for (let sub = 1; sub <= count; sub++) STAGES.add(`${main}-${sub}`);
}
const COMPLETE_IDS = new Set(['first','clear14','unlock81','level925','level950','both100','spent100k','allMax']);
const THEMES = new Set(['classic','pastel','ocean','neon','ember','cyber','diamond','gold','rainbow']);
const KEYS = ['coin','unlocked','ai8Difficulty','inviteBlock',ACHIEVEMENT_KEY];
for (let n = 1; n <= 16; n++) KEYS.push(`item${n}${ONE_TIME.has(n) ? '' : 'Count'}`);
const KEY_SET = new Set(KEYS);

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
function integer(value, min, max, label) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${label}: 허용 범위를 벗어난 값입니다.`);
  }
  return value;
}
function numericString(value, min, max, label) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) {
    throw new Error(`${label}: 잘못된 숫자 형식입니다.`);
  }
  integer(Number(value), min, max, label);
  return value;
}
function parseJSON(text, label) {
  try { return JSON.parse(text); }
  catch (_) { throw new Error(`${label}: JSON 형식이 올바르지 않습니다.`); }
}
function validateAchievements(text) {
  const data = parseJSON(text, '업적 기록');
  if (!plainObject(data)) throw new Error('업적 기록이 올바르지 않습니다.');
  const safe = {};
  if (Object.hasOwn(data, 'firstPlayed')) safe.firstPlayed = data.firstPlayed === true;
  if (Object.hasOwn(data, 'cleared14')) safe.cleared14 = data.cleared14 === true;
  for (const key of ['spentCoins','best8','best9']) {
    if (Object.hasOwn(data, key)) safe[key] = integer(data[key],0,key === 'spentCoins' ? 1e12 : 100,key);
  }
  if (Object.hasOwn(data, 'completed')) {
    if (!plainObject(data.completed)) throw new Error('업적 달성 기록이 올바르지 않습니다.');
    const completed = {};
    for (const [key, flag] of Object.entries(data.completed)) {
      if (!COMPLETE_IDS.has(key) || typeof flag !== 'boolean') throw new Error('알 수 없는 업적 기록이 있습니다.');
      completed[key] = flag;
    }
    safe.completed = completed;
  }
  if (Object.hasOwn(data, 'theme')) {
    if (!THEMES.has(data.theme)) throw new Error('알 수 없는 테마입니다.');
    safe.theme = data.theme;
  }
  if (Object.keys(data).some(key => !['firstPlayed','cleared14','spentCoins','best8','best9','completed','theme'].includes(key))) {
    throw new Error('지원하지 않는 업적 기록입니다.');
  }
  return JSON.stringify(safe);
}
function validateSnapshot(data) {
  if (!plainObject(data)) throw new Error('백업 데이터가 올바르지 않습니다.');
  if (Object.keys(data).length > KEYS.length) throw new Error('백업 항목이 너무 많습니다.');
  for (const key of Object.keys(data)) {
    if (!KEY_SET.has(key)) throw new Error('지원하지 않는 저장 항목이 포함되어 있습니다.');
    if (typeof data[key] !== 'string' || data[key].length > 20000) throw new Error(`${key}: 저장값이 올바르지 않습니다.`);
  }
  const safe = {};
  for (const key of KEYS) {
    if (!Object.hasOwn(data,key)) continue;
    const value = data[key];
    if (key === 'coin') safe[key] = numericString(value,0,1e12,key);
    else if (key === 'ai8Difficulty') safe[key] = numericString(value,1,100,key);
    else if (key === 'inviteBlock') {
      if (value !== 'true' && value !== 'false') throw new Error('초대 차단 설정이 올바르지 않습니다.');
      safe[key] = value;
    }
    else if (key === 'unlocked') {
      const stages = parseJSON(value,'스테이지 해금');
      if (!Array.isArray(stages) || stages.length > STAGES.size || !stages.every(s => typeof s === 'string' && STAGES.has(s))) {
        throw new Error('스테이지 해금 기록이 올바르지 않습니다.');
      }
      safe[key] = JSON.stringify([...new Set(stages)]);
    }
    else if (key === ACHIEVEMENT_KEY) safe[key] = validateAchievements(value);
    else {
      const number = Number(key.match(/^item(\d+)/)[1]);
      if (ONE_TIME.has(number)) {
        if (value !== 'true') throw new Error(`${key}: 구매 기록이 올바르지 않습니다.`);
        safe[key] = value;
      } else safe[key] = numericString(value,0,ITEM_MAX[number],key);
    }
  }
  return safe;
}
function secretBuffer() {
  const secret = process.env.BACKUP_HMAC_SECRET;
  if (typeof secret !== 'string' || Buffer.byteLength(secret,'utf8') < 32) {
    throw Object.assign(new Error('서버 백업 서명키가 설정되지 않았습니다. Render 환경변수 BACKUP_HMAC_SECRET(32자 이상)을 등록해 주세요.'),{status:503});
  }
  return Buffer.from(secret,'utf8');
}
function unsignedData(backup) {
  return JSON.stringify({format:FORMAT,version:VERSION,createdAt:backup.createdAt,data:backup.data});
}
function sign(backup, secret) {
  return crypto.createHmac('sha256',secret).update(unsignedData(backup),'utf8').digest('hex');
}
function createBackup(data, secret=secretBuffer()) {
  const backup = {format: FORMAT, version: VERSION, createdAt: new Date().toISOString(), data: validateSnapshot(data)};
  return {...backup, signature: sign(backup,secret)};
}
function verifyBackup(backup, secret=secretBuffer()) {
  if (!plainObject(backup) || backup.format !== FORMAT || backup.version !== VERSION ||
    typeof backup.createdAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(backup.createdAt) ||
    !Number.isFinite(Date.parse(backup.createdAt)) || typeof backup.signature !== 'string' ||
    !/^[a-f0-9]{64}$/.test(backup.signature)) {
    throw new Error('올바른 V19 서명 백업 파일이 아닙니다.');
  }
  // 먼저 원본 데이터와 서명을 비교한다. 재정렬/정규화 후 검증하면 원본 조작을 놓칠 수 있다.
  const actual = Buffer.from(backup.signature,'hex');
  const expected = Buffer.from(sign(backup,secret),'hex');
  if (!crypto.timingSafeEqual(actual, expected)) throw new Error('파일 서명이 일치하지 않습니다. 변조되었거나 다른 서버 서명키로 생성한 백업입니다.');
  return validateSnapshot(backup.data);
}
function attachBackupRoutes(app) {
  app.post('/api/backup/export', (req,res) => {
    try {
      res.set('Cache-Control','no-store');
      res.json(createBackup(req.body && req.body.data));
    } catch (e) { res.status(e.status || 400).json({error:e.message}); }
  });
  app.post('/api/backup/verify', (req,res) => {
    try {
      res.set('Cache-Control','no-store');
      const data = verifyBackup(req.body && req.body.backup);
      res.json({ok:true,data});
    } catch (e) { res.status(e.status || 400).json({error:e.message}); }
  });
}
module.exports = {attachBackupRoutes,createBackup,verifyBackup,validateSnapshot,KEYS,FORMAT,VERSION};
