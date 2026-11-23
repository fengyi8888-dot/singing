// 技能狀態與自適應難度（Nova game-design.md 3.3–3.6、4.2）
import { CONFIG } from '../config.js';
import { addDays, daysBetween } from '../core/gameday.js';
import { getUnit, typeOfKey, levelRange, clampLevel, splitKey, SKILL_PREREQS, skillKey } from '../data/units.js';
import { getGenerator } from '../generators/index.js';

const { SCORE } = CONFIG;

/** 這個技能鍵是否套用引導等級 G（應用題或幾何題型才有） */
export function usesGuidance(key) {
  const [unitId, typeId] = splitKey(key);
  const unit = getUnit(unitId);
  const gen = getGenerator(unitId, typeId);
  return !!((unit && unit.strand === 'S') || (gen && gen.isWordProblem));
}

/** 新技能狀態（2.3：尚未診斷時用「未測到，其他」L2、G2；應用題與幾何 G 不低於 2） */
export function newSkill(key, init = {}) {
  const g = usesGuidance(key)
    ? Math.max(CONFIG.GUIDANCE_FLOOR_WORD_GEO, init.guidance ?? CONFIG.INITIAL_GUIDANCE_UNTESTED)
    : null;
  return {
    level: clampLevel(key, init.level ?? CONFIG.INITIAL_LEVEL_UNTESTED),
    streak: 0,
    errorPoints: 0,
    history: [],
    attempts: 0,
    firstTryCorrect: 0,
    guidance: g,
    guidanceMaxSeen: g ?? 0,           // 徽章「讀題偵探」：曾經是 G3，之後降到 G1
    guideStreak: 0,
    readErrorsAtG: 0,
    unlocked: false,
    levelUps: 0,
    levelDowns: 0,
    demotionDates: [],
    masteredAt: null,
    maintenanceStep: 0,
    lastPracticedAt: null,
    recentSeeds: [],
  };
}

export function ensureSkill(state, key) {
  if (!state.skills[key]) state.skills[key] = newSkill(key);
  return state.skills[key];
}

/**
 * 3.4 recordAnswer。item: { key, level, outcome, kind }
 * kind: main | warmup | assisted | review | prereq | worked-example
 * 和 Nova 虛擬碼的差異：升降級的上下限用「該題型的等級範圍」（例如圓周長題型 1 只有 L1–2）。
 */
export function recordAnswer(state, item, day) {
  const s = ensureSkill(state, item.key);
  if (item.kind === 'warmup' || item.kind === 'assisted' || item.kind === 'worked-example') return { events: [] };

  s.history.push(SCORE[item.outcome]);
  while (s.history.length > CONFIG.HISTORY_LEN) s.history.shift();
  s.attempts += 1;
  if (item.outcome === 'correct') s.firstTryCorrect += 1;
  s.lastPracticedAt = day;

  if (item.kind === 'review') return { events: [] };   // 錯題複習不觸發升降級

  const [minL, maxL] = levelRange(item.key);
  const events = [];
  if (item.outcome === 'correct') s.streak += 1;
  if (item.outcome === 'wrong') s.streak = 0;
  s.errorPoints += CONFIG.ERROR_POINTS[item.outcome];

  if (s.streak >= CONFIG.PROMOTE_STREAK && s.level < maxL) {
    s.level += 1; s.streak = 0; s.errorPoints = 0; s.levelUps += 1;
    events.push({ type: 'levelUp', key: item.key, level: s.level });
  } else if (s.errorPoints >= CONFIG.DEMOTE_POINTS) {
    if (s.level > minL) {
      s.level -= 1;
      events.push({ type: 'insertPrereq', key: item.key, count: CONFIG.PREREQ_INSERT_ON_DEMOTE });
    } else {
      events.push({ type: 'insertPrereq', key: item.key, count: CONFIG.PREREQ_INSERT_AT_FLOOR });
      events.push({ type: 'insertWorkedExample', key: item.key });
    }
    s.streak = 0; s.errorPoints = 0; s.levelDowns += 1;
    s.demotionDates.push(day);
    s.demotionDates = s.demotionDates.filter((d) => daysBetween(d, day) <= CONFIG.DEMOTION_KEEP_DAYS);
  }
  return { events };
}

// ---------------------------------------------------------------------------
// 3.6 熟練度
// ---------------------------------------------------------------------------
export function recentAccuracy(s) {
  if (!s) return 0;
  const n = s.history.length;
  const sum = s.history.reduce((a, b) => a + b, 0);
  return n < CONFIG.RECENT_MIN_DENOM ? sum / CONFIG.RECENT_MIN_DENOM : sum / n;
}

export function masteryScore(s) {
  if (!s) return 0;
  return Math.round(20 * (s.level - 1) + 20 * recentAccuracy(s));
}

function thresholdLevel(base, key) {
  if (!CONFIG.CLAMP_MASTERY_LEVEL_TO_TYPE_MAX || !key) return base;
  const [, maxL] = levelRange(key);
  return Math.min(base, maxL);
}

export function masteryStatus(s, activeMistakeCount = 0, key = null) {
  if (!s || s.attempts === 0) return 'new';
  const acc = recentAccuracy(s);
  const M = CONFIG.MASTERED, Fm = CONFIG.FAMILIAR;
  if (s.level >= thresholdLevel(M.level, key) && acc >= M.accuracy && s.history.length >= M.history
    && activeMistakeCount === 0) return 'mastered';
  if (s.level >= thresholdLevel(Fm.level, key) && acc >= Fm.accuracy && s.history.length >= Fm.history) return 'familiar';
  return 'learning';
}

export function activeMistakes(state, key) {
  return Object.values(state.mistakes).filter((m) => m.key === key && m.status === 'active').length;
}

export function statusOf(state, key) {
  return masteryStatus(state.skills[key], activeMistakes(state, key), key);
}

const RANK = { new: 0, learning: 1, familiar: 2, mastered: 3 };
export const atLeast = (status, min) => RANK[status] >= RANK[min];

/** 單元狀態：所有題型都 ≥ familiar → familiar；都 mastered → mastered */
export function unitStatus(state, unitId) {
  const unit = getUnit(unitId);
  const statuses = unit.questionTypes.map((t) => statusOf(state, skillKey(unitId, t.id)));
  if (statuses.every((x) => x === 'mastered')) return 'mastered';
  if (statuses.every((x) => atLeast(x, 'familiar'))) return 'familiar';
  if (statuses.every((x) => x === 'new')) return 'new';
  return 'learning';
}

export function unitScore(state, unitId) {
  const unit = getUnit(unitId);
  const scores = unit.questionTypes.map((t) => masteryScore(state.skills[skillKey(unitId, t.id)]));
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * 題型解鎖：第 1 個題型一開始就開放；前一個達到 familiar 時開放下一個（已開放的不再鎖回去）。
 * opts.allowed(typeId)：source 篩選（01/10 前只出 textbook），不允許的題型不參與排序。
 */
export function refreshUnlocks(state, unitId, opts = {}) {
  const unit = getUnit(unitId);
  const newly = [];
  const types = unit.questionTypes.filter((t) => !opts.allowed || opts.allowed(t.id));
  types.forEach((t, i) => {
    const key = skillKey(unitId, t.id);
    const s = ensureSkill(state, key);
    if (s.unlocked) return;
    const prevKey = i > 0 ? skillKey(unitId, types[i - 1].id) : null;
    const open = opts.unlockAll || i === 0
      || (!state.flags.pauseTypeUnlock && state.skills[prevKey]?.unlocked && atLeast(statusOf(state, prevKey), 'familiar'));
    if (open) { s.unlocked = true; newly.push(key); }
  });
  return newly;
}

/** 3.7 pickFocusType：第一個已解鎖但未達 familiar 的題型；都 familiar 了就選分數最低、未 mastered 的 */
export function pickFocusType(state, unitId, opts = {}) {
  refreshUnlocks(state, unitId, opts);
  const unit = getUnit(unitId);
  const keys = unit.questionTypes.filter((t) => !opts.allowed || opts.allowed(t.id))
    .map((t) => skillKey(unitId, t.id)).filter((k) => state.skills[k].unlocked);
  const notFamiliar = keys.find((k) => !atLeast(statusOf(state, k), 'familiar'));
  if (notFamiliar) return notFamiliar;
  const notMastered = keys.filter((k) => statusOf(state, k) !== 'mastered');
  const pool = notMastered.length ? notMastered : keys;
  return minBy(pool, (k) => masteryScore(state.skills[k]));
}

/** 3.4 pickPrereqKey：選最弱、尚未精熟的先備；沒有先備回傳 null（改插示範題） */
export function pickPrereqKey(state, key) {
  const candidates = SKILL_PREREQS[key] || [];
  if (!candidates.length) return null;
  candidates.forEach((k) => ensureSkill(state, k));
  const notMastered = candidates.filter((k) => statusOf(state, k) !== 'mastered');
  const pool = notMastered.length ? notMastered : candidates;
  return minBy(pool, (k) => masteryScore(state.skills[k]));
}

function minBy(arr, f) {
  let best = arr[0], bv = f(best);
  for (const x of arr.slice(1)) { const v = f(x); if (v < bv) { best = x; bv = v; } }
  return best;
}

// ---------------------------------------------------------------------------
// 4.2 引導等級（讀題小幫手 UI 在下一個里程碑；規則先實作並有測試）
// ---------------------------------------------------------------------------
export function effectiveGuidance(s) {
  if (!s || s.guidance == null) return null;
  return Math.max(CONFIG.GUIDE_FLOOR_BY_LEVEL[s.level], s.guidance);
}

export function updateGuidance(s, item) {
  if (s.guidance == null) return { events: [] };
  if (item.kind !== 'main' && item.kind !== 'prereq') return { events: [] };
  const events = [];
  const stepsAllFirstTry = (item.guidedSteps || []).every((st) => st.firstTry);
  if (item.errorType === 'reading') {
    s.readErrorsAtG += 1; s.guideStreak = 0;
    if (s.readErrorsAtG >= CONFIG.RAISE_READ_ERRORS && s.guidance < 3) {
      s.guidance += 1; s.readErrorsAtG = 0;
      s.guidanceMaxSeen = Math.max(s.guidanceMaxSeen || 0, s.guidance);
      events.push({ type: 'guidanceUp', level: s.guidance });
    }
  } else if (stepsAllFirstTry && !item.usedOptionalHelper) {
    s.guideStreak += 1;
    if (s.guideStreak >= CONFIG.FADE_STREAK && s.guidance > 0) {
      s.guidance -= 1; s.guideStreak = 0; s.readErrorsAtG = 0;
      events.push({ type: 'guidanceDown', level: s.guidance });
    }
  } else {
    s.guideStreak = 0;
  }
  return { events };
}

/** 7 天內出過的參數簽章（避免重複） */
export function recentSigs(s, day) {
  return new Set((s.recentSeeds || []).filter((x) => daysBetween(x.date, day) < CONFIG.RECENT_SEED_DAYS).map((x) => x.sig));
}

export function pruneRecentSeeds(s, day) {
  s.recentSeeds = (s.recentSeeds || []).filter((x) => daysBetween(x.date, day) < CONFIG.RECENT_SEED_DAYS);
}

export { typeOfKey, addDays };
