// 錯題本與間隔重複排程（Nova game-design.md 第 5 節）
import { CONFIG } from '../config.js';
import { addDays, daysBetween } from '../core/gameday.js';

/** 5.1 建立或合併錯題卡。回傳 { card, created } */
export function addMistake(state, item, day, sessionId) {
  const errorType = item.errorType || 'unknown';
  const id = `${item.key}|${errorType}`;
  const m = state.mistakes[id];
  if (m && m.status === 'active') {
    m.wrongCount += 1; m.step = 1; m.consecutiveCorrect = 0; m.dueDate = addDays(day, CONFIG.INTERVAL_DAYS[1]);
    if (m.wrongCount >= CONFIG.NEEDS_HELP_WRONG) m.needsHelp = true;
    return { card: m, created: false };
  }
  // 依 Nova 虛擬碼：已克服／封存的卡再錯時，建立新卡覆蓋（克服紀錄已計入獎勵）
  const card = {
    id, key: item.key, errorType, level: item.level,
    createdAt: day, step: 0, dueDate: day, createdInSession: sessionId,
    consecutiveCorrect: 0, wrongCount: 1, needsHelp: false, status: 'active', overcomeAt: null, reviews: [],
  };
  state.mistakes[id] = card;
  return { card, created: true };
}

/**
 * 5.2 複習一張卡。outcome: correct | half | wrong；guidanceUsed：複習時的引導等級（沒有 G 的題型傳 null）
 * 回傳 { overcome: boolean }
 */
export function reviewMistake(state, id, outcome, guidanceUsed, day) {
  const m = state.mistakes[id];
  if (!m) return { overcome: false };
  m.reviews.push({ date: day, outcome });
  while (m.reviews.length > CONFIG.MISTAKE_REVIEWS_KEEP) m.reviews.shift();
  if (outcome === 'wrong') {
    m.consecutiveCorrect = 0; m.step = 1; m.wrongCount += 1;
    if (m.wrongCount >= CONFIG.NEEDS_HELP_WRONG) m.needsHelp = true;
    if (m.status === 'overcome') m.status = 'active';
    m.dueDate = addDays(day, CONFIG.INTERVAL_DAYS[1]);
    return { overcome: false };
  }
  let overcome = false;
  m.consecutiveCorrect += 1;
  const okForOvercome = m.errorType !== 'reading' || guidanceUsed == null || guidanceUsed <= CONFIG.READING_OVERCOME_MAX_G;
  if (m.status === 'active' && m.consecutiveCorrect >= CONFIG.OVERCOME_STREAK && okForOvercome) {
    m.status = 'overcome'; m.overcomeAt = day; overcome = true;
    state.rewards.counters.mistakesOvercome += 1;
  }
  const last = CONFIG.INTERVAL_DAYS.length - 1;
  if (m.step >= last) { if (m.status === 'overcome') m.status = 'archived'; else m.step = last; }
  else m.step += 1;
  if (m.status !== 'archived') m.dueDate = addDays(day, CONFIG.INTERVAL_DAYS[m.step]);
  return { overcome };
}

/** 優先順序：逾期天數多 → needsHelp → wrongCount 多 → 建立時間早 */
export function byPriority(day) {
  return (a, b) => {
    const oa = daysBetween(a.dueDate, day), ob = daysBetween(b.dueDate, day);
    if (oa !== ob) return ob - oa;
    if (a.needsHelp !== b.needsHelp) return a.needsHelp ? -1 : 1;
    if (a.wrongCount !== b.wrongCount) return b.wrongCount - a.wrongCount;
    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
  };
}

/** 到期的卡：R1（step 0）只能在建立它的那一關之後出現 */
export function dueMistakes(state, day, currentSessionId = null) {
  return Object.values(state.mistakes)
    .filter((m) => (m.status === 'active' || m.status === 'overcome') && m.dueDate <= day
      && (m.step > 0 || currentSessionId !== m.createdInSession))
    .sort(byPriority(day));
}

export function countActiveMistakes(state) {
  return Object.values(state.mistakes).filter((m) => m.status === 'active').length;
}
