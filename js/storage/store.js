// 進度儲存：localStorage（主要）+ IndexedDB（鏡像）。
// iPad Safari 有可能清除網站資料（風險 R1），所以兩邊各存一份：
//   - 啟動時兩邊都讀；只有一邊有資料 → 用它並補寫另一邊；兩邊都有 → 用 savedAt 較新的。
//   - 每次儲存：先 JSON.stringify 成功才寫入（避免寫到一半損壞），兩邊都寫。
// 介面卡可注入（測試用記憶體版本）。
import { CONFIG } from '../config.js';
import { defaultData, validate, migrate, fillDefaults } from './schema.js';
import { gameDayOf, daysBetween, compactDate } from '../core/gameday.js';

// ---------------------------------------------------------------------------
// 介面卡
// ---------------------------------------------------------------------------
export function browserLocal() {
  try {
    const ls = globalThis.localStorage;
    const probe = '__mq_probe__';
    ls.setItem(probe, '1'); ls.removeItem(probe);
    return {
      get: (k) => ls.getItem(k),
      set: (k, v) => ls.setItem(k, v),
      remove: (k) => ls.removeItem(k),
    };
  } catch {
    return null;   // 私密瀏覽或被停用
  }
}

export function browserIdb(name = CONFIG.IDB_NAME, store = CONFIG.IDB_STORE) {
  if (!globalThis.indexedDB) return null;
  let dbp = null;
  const open = () => {
    if (!dbp) {
      dbp = new Promise((resolve, reject) => {
        const req = indexedDB.open(name, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('IndexedDB blocked'));
      });
    }
    return dbp;
  };
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const os = t.objectStore(store);
      const req = fn(os);
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  };
  return {
    get: (k) => tx('readonly', (os) => os.get(k)),
    set: (k, v) => tx('readwrite', (os) => os.put(v, k)),
    remove: (k) => tx('readwrite', (os) => os.delete(k)),
  };
}

export function memoryAdapter(async = false) {
  const m = new Map();
  const wrap = (f) => (async ? (...a) => Promise.resolve(f(...a)) : f);
  return {
    map: m,
    get: wrap((k) => (m.has(k) ? m.get(k) : null)),
    set: wrap((k, v) => { m.set(k, v); }),
    remove: wrap((k) => { m.delete(k); }),
  };
}

// ---------------------------------------------------------------------------
function parseStored(json) {
  if (!json || typeof json !== 'string') return null;
  try {
    const d = JSON.parse(json);
    return validate(d).ok ? d : null;
  } catch {
    return null;
  }
}

/** 只保留需要的量（9.2：log ≤ 2000、sessions／daily 180 天、reviews 10 筆、recentSeeds 7 天） */
export function prune(data, day) {
  if (data.log.length > CONFIG.LOG_MAX) data.log = data.log.slice(-CONFIG.LOG_MAX);
  data.sessions = data.sessions.filter((s) => !s.date || daysBetween(s.date, day) <= CONFIG.KEEP_DAYS);
  for (const k of Object.keys(data.daily)) if (daysBetween(k, day) > CONFIG.KEEP_DAYS) delete data.daily[k];
  for (const s of Object.values(data.skills)) {
    if (Array.isArray(s.recentSeeds)) s.recentSeeds = s.recentSeeds.filter((x) => daysBetween(x.date, day) < CONFIG.RECENT_SEED_DAYS);
    if (Array.isArray(s.demotionDates)) s.demotionDates = s.demotionDates.filter((d) => daysBetween(d, day) <= CONFIG.DEMOTION_KEEP_DAYS);
  }
  return data;
}

export class Store {
  constructor({ local = browserLocal(), idb = browserIdb(), now = () => Date.now() } = {}) {
    this.local = local;
    this.idb = idb;
    this.now = now;
    this.lastError = null;
  }

  /** 讀取：回傳 { data, source: 'local'|'idb'|'new', restored: string|null } */
  async load() {
    let localData = null, idbData = null;
    if (this.local) { try { localData = parseStored(this.local.get(CONFIG.STORAGE_KEY)); } catch (e) { this.lastError = e; } }
    if (this.idb) { try { idbData = parseStored(await this.idb.get(CONFIG.STORAGE_KEY)); } catch (e) { this.lastError = e; } }

    let data, source, restored = null;
    if (localData && idbData) {
      const lt = localData.savedAt || 0, it = idbData.savedAt || 0;
      [data, source] = it > lt ? [idbData, 'idb'] : [localData, 'local'];
      if (it !== lt) restored = it > lt ? 'local-from-idb' : 'idb-from-local';
    } else if (localData) { data = localData; source = 'local'; restored = this.idb ? 'idb-from-local' : null; }
    else if (idbData) { data = idbData; source = 'idb'; restored = this.local ? 'local-from-idb' : null; }
    else { data = defaultData(this.now()); source = 'new'; }

    if (source !== 'new' && data.schemaVersion < CONFIG.SCHEMA_VERSION) {
      // 9.3：升級前另存舊版
      this._writeRaw(CONFIG.BEFORE_IMPORT_KEY, JSON.stringify(data));
      data = migrate(data);
    }
    data = fillDefaults(data);
    if (restored) await this.save(data, { keepSavedAt: true });   // 補寫缺少或較舊的那一邊
    return { data, source, restored };
  }

  _writeRaw(key, json) {
    let localOk = false;
    if (this.local) { try { this.local.set(key, json); localOk = true; } catch (e) { this.lastError = e; } }
    const idbP = this.idb ? Promise.resolve().then(() => this.idb.set(key, json)).then(() => true, (e) => { this.lastError = e; return false; }) : Promise.resolve(false);
    return { localOk, idbP };
  }

  /** 儲存（先序列化成功才寫入）。回傳 Promise<{ localOk, idbOk }> */
  async save(data, { keepSavedAt = false } = {}) {
    if (!keepSavedAt) data.savedAt = this.now();
    prune(data, gameDayOf(this.now()));
    let json;
    try { json = JSON.stringify(data); } catch (e) { this.lastError = e; return { localOk: false, idbOk: false }; }
    const { localOk, idbP } = this._writeRaw(CONFIG.STORAGE_KEY, json);
    const idbOk = await idbP;
    return { localOk, idbOk };
  }

  /**
   * 同步產生備份內容（記錄 lastBackupAt）。iPad Safari 的「分享」必須在點擊當下呼叫，
   * 所以先同步做好檔案，再非同步存檔。
   */
  buildBackup(data) {
    data.settings.lastBackupAt = this.now();
    const day = gameDayOf(this.now());
    return { filename: `mathquest-backup-${compactDate(day)}.json`, json: JSON.stringify(data, null, 1) };
  }

  /** 匯出：記錄 lastBackupAt、存檔，回傳 { filename, json } */
  async exportBackup(data) {
    const out = this.buildBackup(data);
    await this.save(data);
    return out;
  }

  /** 解析備份檔：回傳 { ok, errors, data, info } */
  parseBackup(text) {
    let raw;
    try { raw = JSON.parse(text); } catch { return { ok: false, errors: ['檔案不是有效的 JSON'] }; }
    const v = validate(raw);
    if (!v.ok) return { ok: false, errors: v.errors };
    let data;
    try { data = fillDefaults(migrate(raw)); } catch (e) { return { ok: false, errors: [String(e.message || e)] }; }
    const info = {
      backupDate: raw.settings.lastBackupAt || raw.savedAt || null,
      nickname: data.profile.nickname || '',
      skills: Object.keys(data.skills).length,
      sessions: data.sessions.length,
      stars: data.rewards.stars,
    };
    return { ok: true, errors: [], data, info };
  }

  /** 家長按確認後才呼叫：先把目前資料另存到 before-import（只留 1 份），再寫入備份 */
  async applyImport(current, incoming) {
    const { idbP } = this._writeRaw(CONFIG.BEFORE_IMPORT_KEY, JSON.stringify(current));
    await idbP;
    await this.save(incoming);
    return incoming;
  }

  /** 8.5：每天第一次啟動時另存一份快照（只保留 1 份），資料損壞時可以還原 */
  async dailySnapshot(data, day) {
    let prev = null;
    if (this.local) { try { prev = JSON.parse(this.local.get(CONFIG.DAILY_SNAPSHOT_KEY) || 'null'); } catch { prev = null; } }
    if (prev && prev.snapshotDay === day) return false;
    const json = JSON.stringify({ snapshotDay: day, data });
    const { idbP } = this._writeRaw(CONFIG.DAILY_SNAPSHOT_KEY, json);
    await idbP;
    return true;
  }

  async readDailySnapshot() {
    let json = null;
    if (this.local) { try { json = this.local.get(CONFIG.DAILY_SNAPSHOT_KEY); } catch { /* ignore */ } }
    if (!json && this.idb) { try { json = await this.idb.get(CONFIG.DAILY_SNAPSHOT_KEY); } catch { /* ignore */ } }
    try { const o = JSON.parse(json); return o && validate(o.data).ok ? o : null; } catch { return null; }
  }

  async readBeforeImport() {
    let json = null;
    if (this.local) { try { json = this.local.get(CONFIG.BEFORE_IMPORT_KEY); } catch { /* ignore */ } }
    if (!json && this.idb) { try { json = await this.idb.get(CONFIG.BEFORE_IMPORT_KEY); } catch { /* ignore */ } }
    return parseStored(json);
  }
}

/** 啟動時請求「持久儲存」並記錄結果（navigator.storage.persist） */
export async function requestPersist(data, nav = globalThis.navigator, now = Date.now()) {
  let granted = null;
  try {
    if (nav && nav.storage && typeof nav.storage.persist === 'function') {
      granted = (await nav.storage.persisted?.()) || (await nav.storage.persist());
    }
  } catch {
    granted = null;
  }
  data.settings.storagePersisted = granted;
  data.settings.storagePersistCheckedAt = now;
  return granted;
}
