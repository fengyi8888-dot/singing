// 排程 v2 的計算（curriculum/schedule.md v2）。純函式：給 day1、日期，算出區塊日期、單元解鎖日、當天的主線／補洞／預習。
import { SCHEDULE } from '../data/schedule.js';
import { addDays, daysBetween } from '../core/gameday.js';

const S = SCHEDULE;

/** N = P1_END − day1 + 1（第一階段可用天數） */
export function p1Days(day1) { return daysBetween(day1, S.P1_END) + 1; }

/**
 * 第一階段的區塊日期。
 * 回傳 { N, mode: 'normal'|'parallel'|'extended'|'late', blocks: { [id]: { startDay, endDay, startDate, endDate, dropped, role, units } } }
 *  startDay／endDay 是「第幾天」（第 1 天 = day1；N > 20 時以 11/24 為第 1 天，多出的暖身天數是負的）
 */
export function computePhase1(day1) {
  const N = p1Days(day1);
  const blocks = {};
  if (N <= 0) {
    // 規則 5：第一階段整個跳過；percent → geo → word 依序移到當時所在階段的補洞，各至少 3 天
    S.LATE_ORDER.forEach((id, i) => {
      const b = S.P1_BLOCKS.find((x) => x.id === id);
      const startDate = addDays(day1, i * S.LATE_MIN_DAYS);
      blocks[id] = { startDay: null, endDay: null, startDate, endDate: addDays(startDate, S.LATE_MIN_DAYS - 1), dropped: false, role: b.role, units: b.units, late: true };
    });
    for (const b of S.P1_BLOCKS) if (!blocks[b.id]) blocks[b.id] = { dropped: true, late: true, role: b.role, units: b.units, startDate: null, endDate: null };
    return { N, mode: 'late', blocks };
  }
  if (N > S.NOMINAL) {
    // 規則 6：區塊日期從 11/24 起算；多出來的天數只排 diag-gaps 和 percent（暖身）
    const base = addDays(S.P1_END, -(S.NOMINAL - 1));
    for (const b of S.P1_BLOCKS) {
      const startDate = ['p1-diag-gaps', 'p1-percent', 'p1-current'].includes(b.id) ? day1 : addDays(base, b.start - 1);
      blocks[b.id] = { startDay: b.start, endDay: b.end, startDate, endDate: addDays(base, b.end - 1), dropped: false, role: b.role, units: b.units };
    }
    return { N, mode: 'extended', blocks };
  }
  const parallel = N < S.PARALLEL_IF_N_BELOW;
  for (const b of S.P1_BLOCKS) {
    if (b.min === null) {   // 全程都有的區塊
      blocks[b.id] = { startDay: 1, endDay: N, startDate: day1, endDate: addDays(day1, N - 1), dropped: false, role: b.role, units: b.units };
      continue;
    }
    if (b.dropIfNBelow && N < b.dropIfNBelow) {
      blocks[b.id] = { dropped: true, movedTo: S.P2_START, role: b.role, units: b.units, startDate: null, endDate: null };
      continue;
    }
    let start = 1 + Math.floor(((b.start - 1) * N) / S.NOMINAL);                              // 規則 1
    if (parallel && ['p1-percent', 'p1-word', 'p1-geo'].includes(b.id)) start = 1;           // 規則 4
    const end = Math.min(N, Math.max(start + b.min - 1, Math.ceil((b.end * N) / S.NOMINAL))); // 規則 2
    blocks[b.id] = { startDay: start, endDay: end, startDate: addDays(day1, start - 1), endDate: addDays(day1, end - 1), dropped: false, role: b.role, units: b.units };
  }
  return { N, mode: parallel ? 'parallel' : 'normal', blocks };
}

/** 單元的解鎖日（還沒完成診斷 → null，代表不開放） */
export function unlockDate(unitId, day1) {
  if (!day1) return null;
  const p1 = computePhase1(day1);
  const fromBlocks = Object.values(p1.blocks)
    .filter((b) => Array.isArray(b.units) && b.units.includes(unitId))
    .map((b) => (b.dropped ? (b.movedTo || null) : b.startDate))
    .filter(Boolean)
    .sort();
  const fixed = S.FIXED_UNLOCK[unitId] || null;
  const d = fromBlocks[0] || fixed;
  if (!d) return null;
  return d < day1 ? day1 : d;          // 診斷完成前不開放任何單元
}

export function phaseOf(day, day1) {
  if (day >= S.P4_START) return 4;
  if (day >= S.P3_START) return 3;
  if (day >= S.P2_START) return 2;
  return day1 && day >= day1 ? 1 : 0;
}

/**
 * 當天各欄位的單元（不檢查網站是否有這個單元；呼叫端再過濾）。
 * 回傳 { phase, parallel, main: [], gap: [], preview: [], review: [] }
 */
export function rolesOn(day, day1, diagGapUnits = [], geoWrongUnits = [], available = () => true) {
  const phase = phaseOf(day, day1);
  const out = { phase, parallel: false, main: [], gap: [], preview: [], review: [] };
  if (!day1 || day < day1) return out;
  const p1 = computePhase1(day1);
  out.parallel = p1.mode === 'parallel';
  const expand = (units) => (units === 'diag-gaps' ? diagGapUnits : units.flatMap((u) => (u === 'geo-wrong' ? geoWrongUnits : [u])));
  const k = Math.max(0, daysBetween(day1, day));
  // 每個區塊每天輪流挑 1 個單元（份額以「區塊」計算，不受區塊裡單元個數影響）；優先挑 available 的單元
  const oneOf = (units) => {
    const list = expand(units);
    const ok = list.filter(available);
    const pool = ok.length ? ok : list;
    return pool.length ? pool[k % pool.length] : null;
  };
  for (const [id, b] of Object.entries(p1.blocks)) {
    if (b.dropped) {   // 捨棄的預習／複習區塊：第二階段第 1 天起解鎖，放在預習／複習欄
      if (b.movedTo && day >= b.movedTo && phase === 2) { const u = oneOf(b.units); if (u) out[b.role].push(u); }
      continue;
    }
    if (day < b.startDate || day > b.endDate) continue;
    if (phase === 1 || b.late) {
      const u = oneOf(b.units);
      if (!u) continue;
      out[b.late ? 'gap' : b.role].push(u);
      if (out.parallel && id === 'p1-percent') out.gap.push(u);   // 規則 4：並行時補洞欄百分率至少占一半
    }
  }
  if (phase >= 2) {
    const w = S.WEEKS.find((x) => day >= x.from && day <= x.to);
    if (w) { out.main.push(...w.main); out.gap.push(...w.gap); out.preview.push(...w.preview); }
  }
  return out;
}

export { daysBetween };
