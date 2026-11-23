// 航線（Nova 2.4）、單元解鎖日與 source 篩選（schedule.md）、每日任務（Nova 7）
import { CONFIG } from '../config.js';
import { SCHEDULE } from '../data/schedule.js';
import { UNITS, getUnit, skillKey } from '../data/units.js';
import { unitStatus, unitScore, atLeast, recentAccuracy } from './skills.js';
import { unlockDate, rolesOn } from './schedule.js';
import { gameDayOf, addDays, daysBetween } from '../core/gameday.js';
import { dueMistakes, countActiveMistakes } from './mistakes.js';
import { dailyRecord, addDew } from './rewards.js';

/** day1：孩子完成診斷第 2 段的日期（schedule.md v2）。舊存檔沒有這個欄位時，從 completedAt 推回來 */
export function getDay1(state) {
  const d = state.diagnostic;
  if (d.day1) return d.day1;
  if (d.status === 'done' && d.completedAt) return gameDayOf(d.completedAt);
  return null;
}

function diagGapUnits(state) {
  const r = state.diagnostic.unitResults || {};
  return Object.keys(r).filter((u) => r[u] === 'unknown').sort((a, b) => Number(a.slice(1, 2)) - Number(b.slice(1, 2)));
}
function geoWrongUnits(state) {
  const r = state.diagnostic.unitResults || {};
  return SCHEDULE.GEO_WRONG_UNITS.filter((u) => r[u] && r[u] !== 'known');
}

/** 單元的解鎖日（依 day1 與壓縮規則；還沒完成診斷 → null） */
export function unlockDateOf(state, unitId) { return unlockDate(unitId, getDay1(state)); }

/** 主線進度（以 Level 1–3 計算）：每個已開放題型 (20 × (min(L, 3) − 1) + 20 × 最近正確率) ÷ 60 的平均 */
export function mainlineProgress(state, unitId) {
  const u = getUnit(unitId);
  if (!u) return 1;                 // 網站還沒有的單元：無法量測，不延後
  const keys = u.questionTypes.map((t) => skillKey(unitId, t.id)).filter((k) => state.skills[k]?.unlocked);
  if (!keys.length) return 0;
  const v = keys.map((k) => { const sk = state.skills[k]; return (20 * (Math.min(sk.level, 3) - 1) + 20 * recentAccuracy(sk)) / 60; });
  return v.reduce((a, b) => a + b, 0) / v.length;
}

/**
 * 單元是否開放。規則（schedule.md v2）：
 *  - 診斷完成前不解鎖任何單元
 *  - 依解鎖日；已經開放過的單元不會再鎖回去（記在 state.scheduleState.opened）
 *  - 主線延後：前一個主線熟練度未達 70% → 延後 3 天，但不超過 01/11
 */
export function isUnitOpen(state, unitId, day) {
  if (state.settings.unlockAll) return true;
  const opened = (state.scheduleState ||= { opened: {} }).opened ||= {};
  if (opened[unitId]) return true;
  const d = unlockDateOf(state, unitId);
  if (!d || day < d) return false;
  const i = SCHEDULE.MAIN_ORDER.indexOf(unitId);
  if (i > 0) {
    const prev = SCHEDULE.MAIN_ORDER[i - 1];
    const delayed = addDays(d, SCHEDULE.MAIN_DELAY_DAYS);
    const limit = delayed < SCHEDULE.P3_START ? delayed : SCHEDULE.P3_START;
    if (day < limit && mainlineProgress(state, prev) < SCHEDULE.MAIN_DELAY_THRESHOLD) return false;
  }
  opened[unitId] = day;
  return true;
}

/** 01/10 前只出 textbook 題型（例外清單除外） */
export function allowedSources(day) {
  return day >= SCHEDULE.contestExtensionFrom ? ['textbook', 'contest-extension'] : ['textbook'];
}

export function isTypeAllowed(state, unitId, typeId, day) {
  if (state.settings.unlockAll) return true;
  const t = getUnit(unitId)?.questionTypes.find((x) => x.id === typeId);
  if (!t) return false;
  if (SCHEDULE.EXCEPTIONS.includes(skillKey(unitId, typeId))) return true;
  return allowedSources(day).includes(t.source || 'textbook');
}

/** 航線：依排程順序列出網站有的單元；五年級以下的單元在畫面上叫「秘密捷徑」 */
export function buildRoute(state) {
  // 依解鎖日排序（同一天：主線 → 其他）；還沒完成診斷時用標準開始日估算
  const day1 = getDay1(state) || SCHEDULE.standardStart;
  const order = UNITS.map((u) => u.id).sort((a, b) => {
    const da = unlockDate(a, day1) || '9999', db = unlockDate(b, day1) || '9999';
    if (da !== db) return da < db ? -1 : 1;
    return (SCHEDULE.MAIN_ORDER.includes(a) ? 0 : 1) - (SCHEDULE.MAIN_ORDER.includes(b) ? 0 : 1);
  });
  state.route = {
    generatedAt: Date.now(),
    targetUnits: order,
    nodes: order.map((id) => ({ unitId: id, track: getUnit(id).track, isPrereq: getUnit(id).grade < 6 })),
  };
  return state.route;
}

/** 每條航道開放 1 個節點：第一個已解鎖、還沒「熟悉」的單元 */
export function openRouteNodes(state, day) {
  if (!state.route.nodes.length) buildRoute(state);
  const open = { number: null, geometry: null };
  for (const tr of ['number', 'geometry']) {
    const nodes = state.route.nodes.filter((n) => n.track === tr && isUnitOpen(state, n.unitId, day));
    const next = nodes.find((n) => !atLeast(unitStatus(state, n.unitId), 'familiar'));
    open[tr] = next ? next.unitId : (nodes.length ? nodes.reduce((m, n) => (unitScore(state, n.unitId) < unitScore(state, m.unitId) ? n : m)).unitId : null);
  }
  return open;
}

/**
 * 每日任務（Nova 7.2 + schedule.md v2「主線 50%、補洞或複習 25%、預習 ≤ 25%」）。
 * 每天 2 關（10 分鐘）：主線 + 補洞；3 關（15 分鐘）：再加 1 關預習或複習（沒有就再一關補洞）。
 * 到期錯題 ≥ 3 張：第 1 關改成錯題小站。修補中 > 20 張：消化模式。
 * 補洞欄有好幾個單元時，依「第幾天」輪流；並行模式下百分率在名單裡放兩次（至少占一半）。
 */
export function buildDailyPlan(state, day) {
  const minutes = Math.min(Math.max(...CONFIG.DAILY_MINUTES_OPTIONS), state.settings.dailyMinutes || CONFIG.DAILY_MINUTES_DEFAULT);
  const total = Math.max(1, Math.round(minutes / CONFIG.MINUTES_PER_STAGE));
  const day1 = getDay1(state);
  const due = dueMistakes(state, day, null);
  const active = countActiveMistakes(state);
  const openSite = (id) => !!getUnit(id) && isUnitOpen(state, id, day);
  const roles = rolesOn(day, day1, diagGapUnits(state), geoWrongUnits(state), openSite);
  const byScore = (ids) => [...new Set(ids)].sort((a, b) => unitScore(state, a) - unitScore(state, b));
  const allOpen = UNITS.map((u) => u.id).filter(openSite);
  const expand = (list) => list.flatMap((id) => (id === '*contest' ? byScore(allOpen) : id === '*all-g6-s1' ? byScore(allOpen.filter((x) => getUnit(x).grade === 6 && getUnit(x).semester === 1)) : [id]));
  const pick = (list, k) => { const l = expand(list).filter(openSite); return l.length ? l[((k % l.length) + l.length) % l.length] : null; };
  const k = day1 ? Math.max(0, daysBetween(day1, day)) : 0;
  const used = new Set();
  const choose = (...cands) => { for (const c of cands) if (c && !used.has(c)) { used.add(c); return c; } return null; };
  const mainU = () => choose(pick(roles.main, k), pick(roles.main, k + 1), ...byScore(allOpen));
  const gapU = () => choose(pick(roles.gap, k), pick(roles.gap, k + 1), pick(roles.gap, k + 2), pick(roles.review, k), ...byScore(allOpen));
  const extraU = () => choose(pick(roles.preview, k), pick(roles.review, k), pick(roles.gap, k + 1), pick(roles.gap, k + 2), ...byScore(allOpen));
  const plan = [];
  const pushNew = (unitId, role) => plan.push({ kind: 'new', unitId, role });
  if (active > CONFIG.DIGEST_MODE_ACTIVE) {
    state.flags.pauseTypeUnlock = true;
    plan.push({ kind: 'review', unitId: null, role: 'review' });
  } else {
    if (active <= CONFIG.DIGEST_RESUME_ACTIVE) state.flags.pauseTypeUnlock = false;
    if (due.length >= CONFIG.REVIEW_FIRST_DUE) plan.push({ kind: 'review', unitId: null, role: 'review' });
  }
  const order = [['main', mainU], ['gap', gapU], ['extra', extraU]];
  for (let i = 0; plan.length < total && i < 6; i++) {
    const [role, fn] = order[i % 3];
    const u = fn();
    if (u) pushNew(u, role);
  }
  return plan.map((p, idx) => ({ ...p, idx, done: false }));
}

/** 取得（必要時建立）今天的每日任務 */
export function ensureDailyPlan(state, day) {
  const d = dailyRecord(state, day);
  if (!d.plan || !d.plan.length || d.plan.some((p) => p.idx == null)) d.plan = buildDailyPlan(state, day);
  return d.plan;
}

export function nextPlanItem(state, day) {
  return ensureDailyPlan(state, day).find((p) => !p.done) || null;
}

/** 一關做完：標記並檢查是否完成每日任務。回傳 { completedNow } */
export function markPlanDone(state, day, idx) {
  const d = dailyRecord(state, day);
  const p = (d.plan || []).find((x) => x.idx === idx);
  if (p) p.done = true;
  return checkDailyComplete(state, day);
}

export function checkDailyComplete(state, day, { force = false } = {}) {
  const d = dailyRecord(state, day);
  if (d.completed) return { completedNow: false };
  const total = (d.plan || []).length;
  const doneCount = (d.plan || []).filter((p) => p.done).length;
  const minutes = state.settings.dailyMinutes || CONFIG.DAILY_MINUTES_DEFAULT;
  const ok = force || (total > 0 && doneCount >= total)
    || (d.activeSecs >= minutes * 60 && doneCount >= Math.max(1, total - 1));
  if (!ok) return { completedNow: false };
  d.completed = true;
  state.rewards.counters.dailyCompleted += 1;
  addDew(state, day, CONFIG.DEW.daily);
  return { completedNow: true };
}
