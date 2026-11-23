// 家長報告（Nova 第 8 節的最小版本）：本週一覽、單元熟練度、作答時間、錯誤類型、錯題本。
// 一週 = 週一 04:00 到下週一 04:00（遊戲日）。報告只在本機產生，不上傳。
import { CONFIG } from '../config.js';
import { addDays, daysBetween } from '../core/gameday.js';
import { UNITS, typeOfKey } from '../data/units.js';
import { unitStatus, unitScore, statusOf, effectiveGuidance } from './skills.js';
import { getGenerator } from '../generators/index.js';

export function weekStartOf(day) {
  const [y, m, d] = day.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();     // 0 = 週日
  return addDays(day, -((dow + 6) % 7));
}

/** 每週第一次打開時記錄各單元分數，用來算「本週變化」 */
export function ensureWeekSnapshot(state, day) {
  const ws = weekStartOf(day);
  state.snapshots ||= {};
  if (!state.snapshots[ws]) {
    state.snapshots[ws] = { unitScores: Object.fromEntries(UNITS.map((u) => [u.id, unitScore(state, u.id)])) };
    const keys = Object.keys(state.snapshots).sort();
    while (keys.length > CONFIG.SNAPSHOT_WEEKS) delete state.snapshots[keys.shift()];
  }
  return state.snapshots[ws];
}

function median(arr) {
  if (!arr.length) return null;
  const a = [...arr].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

const COUNTED = ['main', 'review', 'prereq'];

/** range：'this' 本週、'last' 上週、'all' 全部 */
export function buildReport(state, today, range = 'this') {
  const thisStart = weekStartOf(today);
  const start = range === 'last' ? addDays(thisStart, -7) : range === 'all' ? '0000-01-01' : thisStart;
  const end = range === 'last' ? thisStart : '9999-12-31';
  const inRange = (day) => day >= start && day < end;
  const days = range === 'all' ? Object.keys(state.daily).sort() : Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const daily = days.map((d) => ({ day: d, secs: state.daily[d]?.activeSecs || 0, practiced: !!state.daily[d]?.practiced, completed: !!state.daily[d]?.completed }));
  const dayOf = (t) => {
    const dt = new Date(t - CONFIG.DAY_START_HOUR * 3600 * 1000);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };
  const logs = state.log.filter((l) => inRange(dayOf(l.t)));
  const counted = logs.filter((l) => COUNTED.includes(l.kind));
  const firstSecs = counted.map((l) => l.firstSecs ?? l.secs).filter((x) => typeof x === 'number' && x > 0);
  const avg = firstSecs.length ? Math.round(firstSecs.reduce((a, b) => a + b, 0) / firstSecs.length) : null;
  const errorTypes = { reading: 0, visual: 0, calc: 0, concept: 0, unknown: 0 };
  for (const l of logs) if (l.errorType && l.outcome !== 'correct') errorTypes[l.errorType] = (errorTypes[l.errorType] || 0) + 1;
  const snap = range === 'this' ? state.snapshots?.[thisStart] : null;
  const units = UNITS.map((u) => {
    const score = unitScore(state, u.id);
    const touched = u.questionTypes.some((t) => state.skills[`${u.id}:${t.id}`]?.attempts > 0);
    const levels = u.questionTypes.map((t) => state.skills[`${u.id}:${t.id}`]).filter((s) => s && s.attempts > 0).map((s) => s.level);
    const unitLogs = counted.filter((l) => l.key.startsWith(`${u.id}:`));
    const fs = unitLogs.map((l) => l.firstSecs ?? l.secs).filter((x) => x > 0);
    const first = unitLogs.length ? Math.round((100 * unitLogs.filter((l) => l.outcome === 'correct').length) / unitLogs.length) : null;
    return {
      unitId: u.id, title: u.title, status: unitStatus(state, u.id), score, touched,
      delta: snap && snap.unitScores[u.id] != null ? score - snap.unitScores[u.id] : null,
      levelRange: levels.length ? `L${Math.min(...levels)}–L${Math.max(...levels)}` : '—',
      medianSecs: fs.length >= 5 ? median(fs) : null, firstTryRate: first, answered: unitLogs.length,
    };
  });
  const mistakes = Object.values(state.mistakes);
  const active = mistakes.filter((m) => m.status === 'active');
  const guidance = Object.entries(state.skills)
    .filter(([key, s]) => s.guidance != null && s.attempts > 0)
    .map(([key, s]) => ({ key, desc: typeOfKey(key)?.desc || key, G: effectiveGuidance(s), isWord: !!getGenerator(...key.split(':'))?.isWordProblem }));
  // 可能有點急（Nova 8.3.1）：思考時間 < max(5, 0.3 × 該技能鍵中位數) 且第一次沒答對
  const byKey = {};
  for (const l of state.log.filter((x) => COUNTED.includes(x.kind) && x.firstSecs > 0)) (byKey[l.key] ||= []).push(l.firstSecs);
  const rushed = {}, patient = [];
  for (const l of counted) {
    const med = median(byKey[l.key] || []) || 0;
    const fsec = l.firstSecs ?? l.secs;
    if (fsec < Math.max(5, 0.3 * med) && l.outcome !== 'correct') rushed[l.key] = (rushed[l.key] || 0) + 1;
    if (fsec >= Math.max(60, 2 * med) && l.outcome !== 'wrong') patient.push(l.key);
  }
  return {
    range, start, end,
    practiceDays: daily.filter((d) => d.practiced).length,
    totalDays: daily.length,
    activeMinutes: Math.round(daily.reduce((a, d) => a + d.secs, 0) / 60),
    daily,
    dailyCompleted: daily.filter((d) => d.completed).length,
    answered: counted.length,
    avgFirstSecs: avg,
    medianFirstSecs: median(firstSecs),
    errorTypes,
    units,
    mistakes: {
      active: active.length,
      newInRange: mistakes.filter((m) => inRange(m.createdAt)).length,
      overcomeInRange: mistakes.filter((m) => m.overcomeAt && inRange(m.overcomeAt)).length,
      needsHelp: active.filter((m) => m.needsHelp).map((m) => ({ key: m.key, desc: typeOfKey(m.key)?.desc || m.key, errorType: m.errorType })),
      list: active.map((m) => ({ key: m.key, desc: typeOfKey(m.key)?.desc || m.key, errorType: m.errorType, wrongCount: m.wrongCount })),
    },
    guidance,
    rushed: Object.entries(rushed).filter(([, n]) => n >= 1).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([key, n]) => ({ key, desc: typeOfKey(key)?.desc || key, n })),
    patientCount: patient.length,
    badgesInRange: Object.entries(state.rewards.badges).filter(([, d]) => inRange(d)).map(([id]) => id),
    mascotStage: state.rewards.mascotStage,
    statusOfKey: (key) => statusOf(state, key),
  };
}

/** 「該備份囉」：距離上次備份的天數（沒備份過回傳 null） */
export function daysSinceBackup(state, today) {
  const t = state.settings.lastBackupAt;
  if (!t) return null;
  const dt = new Date(t - CONFIG.DAY_START_HOUR * 3600 * 1000);
  const d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  return daysBetween(d, today);
}
