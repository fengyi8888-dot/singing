// 星星、努力點、每日紀錄、連續練習（Nova 第 6 節；徽章完整清單留到下一個里程碑）
import { CONFIG } from '../config.js';
import { addDays } from '../core/gameday.js';

export function dailyRecord(state, day) {
  if (!state.daily[day]) {
    state.daily[day] = { plan: [], stagesDone: 0, activeSecs: 0, completed: false, dewEarned: 0, practiced: false };
  }
  return state.daily[day];
}

/** 加努力點（每日上限 80）。回傳實際加了幾點 */
export function addDew(state, day, n) {
  const d = dailyRecord(state, day);
  const room = Math.max(0, CONFIG.DEW_DAILY_CAP - d.dewEarned);
  const add = Math.min(room, n);
  d.dewEarned += add;
  state.rewards.dew += add;
  state.rewards.mascotStage = mascotStageOf(state.rewards.dew);
  return add;
}

export function mascotStageOf(dew) {
  let stage = 1;
  CONFIG.MASCOT_STAGES.forEach((min, i) => { if (dew >= min) stage = i + 1; });
  return stage;
}

/** 6.1 星星 */
export function computeStars({ items, isFirstVoyage = false, prevRate = null }) {
  const counted = items.filter((i) => i.kind !== 'warmup');
  if (!counted.length) return { stars: 1, rate: 0 };
  const rate = counted.reduce((a, i) => a + CONFIG.SCORE[i.outcome], 0) / counted.length;
  let stars = 1;
  if (rate >= CONFIG.STAR2_RATE) stars = 2;
  if (rate >= CONFIG.STAR3_RATE) stars = 3;
  if (isFirstVoyage) stars = Math.max(stars, 2);
  if (prevRate != null && rate > prevRate) stars = Math.max(stars, 2);   // 比上一關進步 → 至少 2 顆
  return { stars, rate };
}

/** 練習日與連續天數（休息卡規則留到下一個里程碑） */
export function markPractice(state, day, activeSecs, stagesDone) {
  const d = dailyRecord(state, day);
  d.activeSecs += activeSecs;
  d.stagesDone += stagesDone;
  const was = d.practiced;
  d.practiced = d.practiced || d.activeSecs >= CONFIG.PRACTICE_DAY_SECS || d.stagesDone >= 1;
  if (!was && d.practiced) {
    state.rewards.counters.practiceDays += 1;
    const st = state.streak;
    if (st.lastPracticeDate !== day) {
      st.current = st.lastPracticeDate && addDays(st.lastPracticeDate, 1) === day ? st.current + 1 : 1;
      st.best = Math.max(st.best, st.current);
      st.lastPracticeDate = day;
    }
  }
  return d;
}
