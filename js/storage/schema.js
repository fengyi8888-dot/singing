// 資料結構（Nova game-design.md 9.2）+ 預設值 + 驗證 + 版本遷移。
// 相對於 9.2 的擴充欄位（都是向後相容的新增）：
//   savedAt（最後寫入時間，用來在 localStorage 與 IndexedDB 之間選較新的一份）
//   settings.answerMode（'input' 數字鍵盤／'choice' 4 選 1，競試格式）
//   settings.storagePersisted、settings.storagePersistCheckedAt（navigator.storage.persist() 結果）
//   flags.pendingInserts（超過 8 題上限、順延到下一關的插入題）
//   log[].seed、log[].code、log[].mode（題目種子、迷思代碼、作答模式，方便除錯與家長報告）
//   log[].firstSecs（第一次按「確定」前的思考秒數，Nova 8.3.1）
//   profile.pal（6.4 已定案的夥伴）、settings.setupDone／setupStep／unlockAll／launch
//   diagnostic.unitResults／readingType／priorities／summary、rewards.counters.retryCorrect
//   daily[].plan[].idx／done、snapshots（每週單元分數，算「本週變化」）
import { CONFIG } from '../config.js';

export function defaultData(now = Date.now()) {
  return {
    schemaVersion: CONFIG.SCHEMA_VERSION,
    createdAt: now,
    savedAt: now,
    profile: { nickname: '', avatarColor: 'sky', mascotId: 'C', pal: { candidateId: 'pal-duo-1', furColor: 'default' } },
    settings: {
      grade: 6, semester: 1, dailyMinutes: 10, ttsEnabled: true, soundEnabled: true,
      parentPinHash: null, lastBackupAt: null,
      answerMode: 'input',
      storagePersisted: null, storagePersistCheckedAt: null,
      setupDone: false, setupStep: 'ipad', unlockAll: false,
      launch: { standalone: null, everStandalone: false, lastAt: null, ipadCheckSkipped: false },
    },
    diagnostic: { status: 'not-started', day1: null, segmentIndex: 0, answers: [], results: {}, unitResults: {}, readingType: null, priorities: [], summary: [], completedAt: null, history: [] },
    route: { generatedAt: null, targetUnits: [], nodes: [] },
    skills: {},
    mistakes: {},
    log: [],
    sessions: [],
    daily: {},
    rewards: {
      stars: 0, dew: 0, mascotStage: 1, decorations: [], badges: {},
      counters: {
        halfCorrect: 0, mistakesOvercome: 0, prereqDone: 0, cutRearrangeDone: 0,
        keyNumberStreak: 0, dailyCompleted: 0, practiceDays: 0, slowThinkCorrect: 0, retryCorrect: 0,
      },
    },
    streak: { current: 0, best: 0, restTokens: 0, lastPracticeDate: null, lastTokenGrant: null },
    flags: { pauseTypeUnlock: false, firstVoyageDone: false, pendingInserts: [] },
    snapshots: {},
    scheduleState: { opened: {} },     // schedule.md v2：已經開放過的單元（之後不會再鎖回去）
  };
}

const REQUIRED = ['schemaVersion', 'profile', 'settings', 'skills', 'mistakes', 'rewards'];

/** 檢查備份或已存資料：回傳 { ok, errors } */
export function validate(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, errors: ['不是 JSON 物件'] };
  for (const k of REQUIRED) if (!(k in data)) errors.push(`缺少欄位 ${k}`);
  if (typeof data.schemaVersion !== 'number' || !Number.isInteger(data.schemaVersion)) errors.push('schemaVersion 不是整數');
  else if (data.schemaVersion > CONFIG.SCHEMA_VERSION) errors.push(`備份版本 ${data.schemaVersion} 比網站新（${CONFIG.SCHEMA_VERSION}），請先更新網站`);
  else if (data.schemaVersion < 1) errors.push('schemaVersion 不正確');
  for (const k of ['skills', 'mistakes']) {
    if (k in data && (typeof data[k] !== 'object' || data[k] === null || Array.isArray(data[k]))) errors.push(`${k} 格式不正確`);
  }
  if (data.profile && typeof data.profile.nickname === 'string' && data.profile.nickname.length > 8) errors.push('暱稱超過 8 個字');
  return { ok: errors.length === 0, errors };
}

/**
 * 版本遷移：MIGRATIONS[n] 把 vn 轉成 v(n+1)。目前只有 v1，之後新增版本時加在這裡。
 * 遷移前由 Store 自動另存一份舊版到 BEFORE_IMPORT_KEY（9.3）。
 */
export const MIGRATIONS = {
  // 1: (d) => { ...; d.schemaVersion = 2; return d; },
};

export function migrate(data) {
  let d = data;
  while (d.schemaVersion < CONFIG.SCHEMA_VERSION) {
    const step = MIGRATIONS[d.schemaVersion];
    if (!step) throw new Error(`沒有 v${d.schemaVersion} 的遷移函式`);
    d = step(d);
  }
  return d;
}

/** 用預設值補齊缺少的欄位（舊資料或手動修改過的備份） */
export function fillDefaults(data, defaults = defaultData(data.createdAt || Date.now())) {
  const out = { ...defaults, ...data };
  for (const k of ['profile', 'settings', 'diagnostic', 'route', 'rewards', 'streak', 'flags']) {
    out[k] = { ...defaults[k], ...(data[k] || {}) };
  }
  out.rewards.counters = { ...defaults.rewards.counters, ...((data.rewards && data.rewards.counters) || {}) };
  for (const k of ['log', 'sessions']) if (!Array.isArray(out[k])) out[k] = [];
  out.scheduleState = { opened: {}, ...((data.scheduleState) || {}) };
  for (const k of ['skills', 'mistakes', 'daily', 'snapshots']) if (!out[k] || typeof out[k] !== 'object') out[k] = {};
  out.settings.launch = { ...defaults.settings.launch, ...((data.settings && data.settings.launch) || {}) };
  out.profile.pal = { ...defaults.profile.pal, ...((data.profile && data.profile.pal) || {}) };
  if (!Array.isArray(out.flags.pendingInserts)) out.flags.pendingInserts = [];
  return out;
}
