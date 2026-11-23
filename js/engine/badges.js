// 徽章判定：依目前狀態檢查，回傳這次新拿到的徽章 id
import { BADGES } from '../data/badges.js';

const RULES = {
  'first-light': (st) => st.diagnostic.status === 'done',
  'set-sail': (st) => st.sessions.some((s) => s.type === 'stage' || s.type === 'first-voyage' || s.type === 'review'),
  'try-again': (st) => st.rewards.counters.retryCorrect >= 10,
  'repair-apprentice': (st) => st.rewards.counters.mistakesOvercome >= 1,
  'reading-detective': (st) => Object.values(st.skills).some((s) => s.guidanceMaxSeen === 3 && s.guidance != null && s.guidance <= 1),
  'three-day-sprout': (st) => st.rewards.counters.practiceDays >= 3,
  'week-sailor': (st) => st.rewards.counters.practiceDays >= 7,
  'daily-voyage': (st) => st.rewards.counters.dailyCompleted >= 5,
};

export function checkBadges(state, day) {
  const got = [];
  for (const b of BADGES) {
    if (state.rewards.badges[b.id]) continue;
    if (RULES[b.id] && RULES[b.id](state)) { state.rewards.badges[b.id] = day; got.push(b.id); }
  }
  return got;
}
