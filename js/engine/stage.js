// 一關的流程（純邏輯，不碰 DOM；UI 和測試都用它）
// Nova 3.2 作答流程、3.5 關卡保護、3.7 關卡組成、4.2 讀題小幫手結果、5.1 建立錯題卡、6.1 星星、2.5 首航
import { CONFIG } from '../config.js';
import { generateQuestion, optionToEliminate } from './question.js';
import { errorTypeOf, pickDiagnosticCode } from './errors.js';
import {
  ensureSkill, recordAnswer, pickFocusType, pickPrereqKey, refreshUnlocks, recentSigs, effectiveGuidance, updateGuidance,
} from './skills.js';
import { addMistake, reviewMistake, dueMistakes } from './mistakes.js';
import { addDew, computeStars, markPractice } from './rewards.js';
import { checkBadges } from './badges.js';
import { markPlanDone, isTypeAllowed } from './plan.js';
import { splitKey, clampLevel } from '../data/units.js';
import { pickPhrase, MISTAKE_NOTE } from '../data/phrases.js';

let sessionCounter = 0;
export function newSessionId(now) {
  sessionCounter += 1;
  return `s-${now.toString(36)}-${sessionCounter.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export class StageRun {
  /**
   * @param {object} state  整份資料（會直接修改）
   * @param {object} o
   * @param {'stage'|'review'} [o.mode]
   * @param {string} [o.unitId]
   * @param {string} [o.focusKey]    指定題型；不給就照 pickFocusType
   * @param {boolean} [o.firstVoyage] 首航關卡（2.5）：全部 max(1, L − 1)、G3、保證 ≥ 2 顆星
   * @param {number} [o.planIdx]     每日任務的第幾關
   * @param {'input'|'choice'} [o.answerMode]
   * @param {() => number} [o.now]
   * @param {() => string} o.today
   * @param {(i:number) => string} [o.seedFor]  測試用：固定每題的種子
   */
  constructor(state, o = {}) {
    this.state = state;
    this.mode = o.mode || 'stage';
    this.now = o.now || (() => Date.now());
    this.day = o.today();
    this.startedAt = this.now();
    this.sessionId = o.sessionId || newSessionId(this.startedAt);
    this.answerMode = o.answerMode || state.settings.answerMode || 'input';
    this.seedFor = o.seedFor || null;
    this.unitId = o.unitId || null;
    this.firstVoyage = !!o.firstVoyage;
    this.planIdx = o.planIdx ?? null;
    this.inDailyPlan = this.planIdx != null;
    this.items = [];
    this.index = -1;
    this.cur = null;
    this.done = [];
    this.usedSigs = new Set();
    this.assistedMode = false;
    this.consecutiveWrong = 0;
    this.correctStreak = 0;
    this.quickWrong = 0;
    this.slowDownNext = false;
    this.explainedKeys = new Set();
    this.overcomeCount = 0;
    this.dewEarned = 0;
    this.levelUps = [];
    this.finished = null;
    this.mascotStageAtStart = state.rewards.mascotStage;

    if (this.mode === 'review') this._planReview();
    else this._planStage(o.focusKey);
  }

  _allowed(unitId) { return (typeId) => isTypeAllowed(this.state, unitId, typeId, this.day); }

  // -------------------------------------------------------------------------
  _planStage(focusKey) {
    const key = focusKey || pickFocusType(this.state, this.unitId, { allowed: this._allowed(this.unitId) });
    this.focusKey = key;
    if (!this.unitId) this.unitId = splitKey(key)[0];
    const s = ensureSkill(this.state, key);
    if (focusKey) s.unlocked = true;
    const q = [];
    q.push({ key, level: clampLevel(key, Math.max(1, s.level - 1)), kind: 'warmup' });
    const pending = this.firstVoyage ? [] : this.state.flags.pendingInserts.splice(0, CONFIG.STAGE_MAX_ITEMS - 6);
    for (const p of pending) q.push({ ...p });
    for (let i = 0; i < CONFIG.STAGE_MAIN_COUNT; i++) q.push({ key, level: 'live', kind: 'main' });
    q.push(this.firstVoyage ? { key, level: 'live', kind: 'main' } : this._pickSlot6(key));
    this.items = q;
  }

  _pickSlot6(key) {
    const due = dueMistakes(this.state, this.day, this.sessionId);
    if (due.length) return { mistakeId: due[0].id, key: due[0].key, kind: 'review' };
    return { key, level: 'live', kind: 'main' };    // 精熟保養題留到下一個里程碑
  }

  _planReview() {
    const due = dueMistakes(this.state, this.day, this.sessionId).slice(0, CONFIG.REVIEW_STAGE_MAX);
    this.items = due.map((m) => ({ mistakeId: m.id, key: m.key, kind: 'review' }));
    this.focusKey = null;
  }

  get total() { return this.items.length; }
  get position() { return this.index; }
  get isEmpty() { return this.items.length === 0; }

  // -------------------------------------------------------------------------
  next() {
    if (this.cur && !this.cur.completed) throw new Error('目前這題還沒完成');
    this.index += 1;
    if (this.index >= this.items.length) { this.cur = null; return null; }
    const desc = this.items[this.index];
    const s = ensureSkill(this.state, desc.key);
    let kind = desc.kind, level, example = null;
    if (desc.kind === 'review') {
      const m = this.state.mistakes[desc.mistakeId];
      level = clampLevel(desc.key, Math.max(1, (m ? m.level : s.level) - 1));
      if (m && m.needsHelp) example = true;
    } else if (desc.level === 'live') {
      level = s.level;
      if (desc.kind === 'main' && this.assistedMode) {
        kind = 'assisted';
        level = clampLevel(desc.key, Math.max(1, s.level - 1));
      }
    } else {
      level = clampLevel(desc.key, desc.level ?? s.level);
    }
    if (this.firstVoyage) level = clampLevel(desc.key, Math.max(1, s.level - 1));
    if (desc.kind === 'worked-example') example = true;
    const [unitId, typeId] = splitKey(desc.key);
    const avoid = new Set([...this.usedSigs, ...recentSigs(s, this.day)]);
    const seed = this.seedFor ? this.seedFor(this.index) : undefined;
    const question = generateQuestion({ unitId, typeId, level, seed, avoid, mode: this.answerMode });
    this.usedSigs.add(question.sig);
    if (example) {
      example = generateQuestion({ unitId, typeId, level, seed: seed ? `${seed}-ex` : undefined, avoid: new Set([...avoid, question.sig]), mode: this.answerMode });
      this.usedSigs.add(example.sig);
    }
    const G = s.guidance == null ? null : this.firstVoyage ? 3 : effectiveGuidance(s);
    this.cur = {
      desc, kind, key: desc.key, level, question, example: example || null,
      mistakeId: desc.mistakeId || null,
      attempts: 0, hintsShown: 0, hintUsed: false, explanationUsed: false,
      codes: [], eliminated: {}, outcome: null, errorType: null, completed: false,
      slowDown: this.slowDownNext, isPrereq: desc.kind === 'prereq',
      G, helperResult: null,
    };
    this.slowDownNext = false;
    if (kind === 'assisted') { this.cur.hintsShown = 1; this.cur.hintUsed = true; }
    return this.cur;
  }

  useHint() {
    const c = this._need();
    const hints = c.question.hints;
    if (c.hintsShown >= hints.length) return null;
    c.hintUsed = true;
    return hints[c.hintsShown++];
  }

  /** 讀題小幫手的結果（ReadingHelper.result()）；在 complete 之前呼叫 */
  setHelperResult(res) { this._need().helperResult = res; }

  submit(input, { secs = null } = {}) {
    const c = this._need();
    if (c.outcome) throw new Error('這題已經作答完成');
    const g = c.question.check(input);
    if (g.empty) return { status: 'incomplete', grade: g };
    if (c.firstSecs == null && secs != null) c.firstSecs = secs;
    if (g.correct) {
      c.outcome = c.attempts === 0 && !c.hintUsed ? 'correct' : 'half';
      const { praiseKind, celebrate } = this._praise(c, secs);
      c.praiseKind = praiseKind; c.celebrate = celebrate;
      return { status: 'correct', outcome: c.outcome, grade: g, phrase: pickPhrase(praiseKind), praiseKind, celebrate };
    }
    c.attempts += 1;
    c.codes.push(g.code);
    const hasChoice = c.question.parts.some((p) => p.kind === 'choice');
    if (hasChoice && secs != null && secs < CONFIG.QUICK_WRONG_SECS) {
      this.quickWrong += 1;
      if (this.quickWrong >= CONFIG.QUICK_WRONG_TRIGGER) { this.slowDownNext = true; this.quickWrong = 0; }
    }
    if (c.attempts === 1) {
      const hints = c.question.hints;
      const hint = hints[Math.min(c.hintsShown, hints.length - 1)];
      c.hintsShown = Math.min(hints.length, c.hintsShown + 1);
      const eliminated = {};
      const responses = Array.isArray(input) ? input : input && typeof input === 'object' ? c.question.parts.map((p) => input[p.id]) : [input];
      c.question.parts.forEach((p, i) => {
        const pr = g.parts[i];
        if (p.kind !== 'choice' || pr.correct) return;
        const already = c.eliminated[p.id] || [];
        const id = optionToEliminate(p, responses[i], already);
        if (id) { c.eliminated[p.id] = [...already, id]; eliminated[p.id] = id; }
      });
      return { status: 'retry', hint, phrase: pickPhrase('retry'), eliminated, grade: g };
    }
    c.outcome = 'wrong';
    return { status: 'solve', outcome: 'wrong', phrase: pickPhrase('solve'), grade: g };
  }

  /**
   * 答對時稱讚「過程」（Iris 2026-11-23，使用者試玩回饋）：依情境選鼓勵語類別與慶祝等級。
   * 類別優先順序：修好錯題卡 > 挑戰級一次就對 > 讀題小幫手步驟都對 > 看提示後答對 > 連續答對 > 又快又準 > 一般
   * 慶祝等級：challenge（L4 以上第一次就對）> streak（同一關連續答對 3 題）> normal
   */
  _praise(c, secs) {
    const hr = c.helperResult;
    const firstTry = c.outcome === 'correct' && !(hr && hr.anyDemo);
    const streakNow = firstTry ? this.correctStreak + 1 : 0;
    const m = c.mistakeId ? this.state.mistakes[c.mistakeId] : null;
    const willRepair = c.kind === 'review' && m && m.status === 'active' && m.consecutiveCorrect + 1 >= CONFIG.OVERCOME_STREAK;
    const challenge = firstTry && c.level >= CONFIG.CHALLENGE_LEVEL;
    const helperGood = hr && hr.required && !hr.anyDemo && !hr.anyMistake && !hr.diagnose;
    let fast = false;
    if (firstTry && secs != null) {
      const past = this.state.log.filter((l) => l.key === c.key && l.firstSecs > 0 && l.outcome === 'correct').map((l) => l.firstSecs).sort((a, b) => a - b);
      if (past.length >= CONFIG.FAST_MIN_SAMPLES) {
        const mid = past.length % 2 ? past[(past.length - 1) / 2] : (past[past.length / 2 - 1] + past[past.length / 2]) / 2;
        fast = secs < mid * CONFIG.FAST_RATIO;
      }
    }
    const praiseKind = willRepair ? 'repaired' : challenge ? 'challenge' : helperGood ? 'helperGood'
      : !firstTry ? 'hintWin' : streakNow >= CONFIG.STREAK_CELEBRATE ? 'streak' : fast ? 'fast' : 'correct';
    const celebrate = challenge ? 'challenge' : streakNow >= CONFIG.STREAK_CELEBRATE ? 'streak' : 'normal';
    return { praiseKind, celebrate };
  }

  /** 擊掌：答對後點吉祥物，+1 努力點，每題限 1 次（不點也可以直接下一題） */
  highFive() {
    const c = this._need();
    if (!c.outcome || c.outcome === 'wrong' || c.highFived) return { ok: false, dew: 0 };
    c.highFived = true;
    const dew = addDew(this.state, this.day, CONFIG.HIGH_FIVE_DEW);
    this.dewEarned += dew;
    return { ok: true, dew };
  }

  showSolution() {
    const c = this._need();
    if (!c.outcome) c.outcome = 'wrong';
    c.explanationUsed = true;
    return { status: 'solve', outcome: c.outcome, phrase: pickPhrase('solve') };
  }

  /** 結束這一題。secs：這題總主動秒數；firstSecs：第一次按「確定」前的秒數 */
  complete({ secs = 0, firstSecs = null } = {}) {
    const c = this._need();
    if (!c.outcome) throw new Error('還沒有作答結果');
    if (c.completed) throw new Error('重複完成');
    const st = this.state, day = this.day;
    if (c.outcome === 'wrong') c.explanationUsed = true;
    let code = c.outcome === 'correct' ? null : pickDiagnosticCode(c.codes);
    let errorType = c.outcome === 'correct' ? null : (errorTypeOf(code) || 'unknown');
    if (c.outcome === 'half' && !code) errorType = null;
    // 讀題小幫手（4.2）：①–③ 有需要示範 → 最高 half、記 reading；步驟都對但答案錯 → calc
    const hr = c.helperResult;
    if (hr) {
      if (hr.diagnose) {
        if (c.outcome !== 'correct') errorType = hr.anyMistake ? 'reading' : 'calc';
      } else if (hr.anyDemo) {
        if (c.outcome === 'correct') c.outcome = 'half';
        errorType = 'reading';
      } else if (hr.required && errorType === 'reading') {
        errorType = 'calc';
      }
    }
    c.errorType = errorType;
    c.code = code;
    c.secs = secs;
    c.firstSecs = firstSecs ?? c.firstSecs ?? secs;
    const s = ensureSkill(st, c.key);
    const messages = [];

    const { events } = recordAnswer(st, { key: c.key, level: c.level, outcome: c.outcome, kind: c.kind }, day);
    if (hr && s.guidance != null) {
      const gr = updateGuidance(s, { kind: c.kind, errorType: c.errorType, guidedSteps: hr.guidedSteps, usedOptionalHelper: hr.usedOptionalHelper });
      for (const ev of gr.events) if (ev.type === 'guidanceDown') messages.push('你讀題越來越厲害，這一步交給你自己了！');
    }

    const countsForMistake = c.kind === 'main' || c.kind === 'prereq';
    if (c.kind === 'review' && c.mistakeId) {
      const m = st.mistakes[c.mistakeId];
      const { overcome } = reviewMistake(st, c.mistakeId, c.outcome, c.G, day);
      if (overcome) {
        this.overcomeCount += 1;
        this.dewEarned += addDew(st, day, CONFIG.DEW.overcome);
      }
      if (c.outcome === 'wrong' && m && c.errorType && c.errorType !== m.errorType) {
        addMistake(st, { key: c.key, errorType: c.errorType, level: c.level }, day, this.sessionId);
      }
    } else if (countsForMistake && (c.outcome === 'wrong'
      || (c.outcome === 'half' && (c.errorType === 'reading' || c.errorType === 'visual')))) {
      addMistake(st, { key: c.key, errorType: c.errorType, level: c.level }, day, this.sessionId);
      if (c.outcome === 'wrong') messages.push(MISTAKE_NOTE);
    }

    st.log.push({
      t: this.now(), key: c.key, level: c.level, guidance: c.G, kind: c.kind,
      outcome: c.outcome, errorType: c.errorType, hintUsed: c.hintUsed, explanationUsed: c.explanationUsed,
      helperUsed: !!(hr && hr.usedOptionalHelper), secs, firstSecs: c.firstSecs, seed: c.question.seed, code, mode: c.question.mode,
      praise: c.praiseKind || null, highFive: !!c.highFived,
    });
    if (st.log.length > CONFIG.LOG_MAX) st.log.splice(0, st.log.length - CONFIG.LOG_MAX);
    s.recentSeeds.push({ seed: c.question.seed, sig: c.question.sig, date: day });

    let dew = CONFIG.DEW.answer;
    if (c.outcome === 'half') { dew += CONFIG.DEW.halfBonus; st.rewards.counters.halfCorrect += 1; }
    if (c.outcome === 'half' && c.attempts >= 1) st.rewards.counters.retryCorrect += 1;
    if (c.outcome !== 'wrong' && this.explainedKeys.has(c.key)) { dew += CONFIG.DEW.afterExplanation; this.explainedKeys.delete(c.key); }
    if (c.explanationUsed) this.explainedKeys.add(c.key);
    this.dewEarned += addDew(st, day, dew);
    if (c.kind === 'prereq') st.rewards.counters.prereqDone += 1;

    this.consecutiveWrong = c.outcome === 'wrong' ? this.consecutiveWrong + 1 : 0;
    this.correctStreak = c.outcome === 'correct' ? this.correctStreak + 1 : 0;
    if (this.consecutiveWrong >= CONFIG.ASSIST_TRIGGER_WRONGS) this.assistedMode = true;

    for (const ev of events) {
      if (ev.type === 'levelUp') { this.levelUps.push(ev); messages.push(CONFIG.LEVEL_UP_PHRASE); }
      if (this.firstVoyage) continue;
      if (ev.type === 'insertPrereq') {
        for (let i = 0; i < ev.count; i++) {
          const pk = pickPrereqKey(st, ev.key);
          this._insert(pk ? { key: pk, level: null, kind: 'prereq' } : { key: ev.key, level: null, kind: 'worked-example' });
        }
      }
      if (ev.type === 'insertWorkedExample') this._insert({ key: ev.key, level: null, kind: 'worked-example' });
    }

    const [u] = splitKey(c.key);
    refreshUnlocks(st, u, { allowed: this._allowed(u) });

    c.completed = true;
    this.done.push(c);
    return { events, messages };
  }

  _insert(desc) {
    if (desc.level == null) desc.level = ensureSkill(this.state, desc.key).level;
    if (this.items.length >= CONFIG.STAGE_MAX_ITEMS) { this.state.flags.pendingInserts.push(desc); return; }
    let pos = this.index + 1;
    while (pos < this.items.length && this.items[pos].inserted) pos++;
    this.items.splice(pos, 0, { ...desc, inserted: true });
  }

  /** 結算 */
  finish({ activeSecs = null } = {}) {
    if (this.finished) return this.finished;
    const st = this.state, day = this.day;
    const secs = activeSecs ?? this.done.reduce((a, c) => a + (c.secs || 0), 0);
    let prevRate = null;
    if (this.focusKey) {
      const prev = [...st.sessions].reverse().find((x) => x.focusKey === this.focusKey && x.type === 'stage');
      if (prev) prevRate = prev.rate;
    }
    const { stars, rate } = this.done.length
      ? computeStars({ items: this.done, prevRate, isFirstVoyage: this.firstVoyage })
      : { stars: 0, rate: 0 };
    st.rewards.stars += stars;
    markPractice(st, day, Math.round(secs), this.done.length ? 1 : 0);
    const type = this.firstVoyage ? 'first-voyage' : this.mode === 'review' ? 'review' : 'stage';
    st.sessions.push({
      id: this.sessionId, date: day, startedAt: this.startedAt, activeSecs: Math.round(secs),
      type, unitId: this.unitId, focusKey: this.focusKey,
      stars, rate, dew: this.dewEarned, inDailyPlan: this.inDailyPlan,
    });
    let dailyCompletedNow = false;
    if (this.firstVoyage && this.done.length) {
      st.flags.firstVoyageDone = true;
      const d = st.daily[day];
      if (d) for (const p of d.plan || []) p.done = true;     // 第一天：診斷 + 首航 = 今日航程完成
    }
    if (this.done.length && (this.inDailyPlan || this.firstVoyage)) {
      dailyCompletedNow = markPlanDone(st, day, this.planIdx ?? -1).completedNow;
    }
    const newBadges = checkBadges(st, day);
    const highlights = [];
    if (this.overcomeCount) highlights.push(`你今天修好了 ${this.overcomeCount} 個錯誤！`);
    if (this.done.some((c) => c.helperResult && c.helperResult.usedOptionalHelper && !c.helperResult.diagnose)) highlights.push('你主動用了讀題小幫手，好習慣！');
    if (this.levelUps.length) highlights.push(CONFIG.LEVEL_UP_PHRASE);
    if (dailyCompletedNow) highlights.unshift('今日航程完成了！');
    this.finished = {
      stars, rate, dew: this.dewEarned, items: this.done.length,
      highlights: highlights.slice(0, 2),
      dueAfter: dueMistakes(st, day, null).length,
      newBadges, dailyCompletedNow,
      mascotFrom: this.mascotStageAtStart, mascotTo: st.rewards.mascotStage,
      summary: pickPhrase('summary').replace('{n}', String(this.done.length)),
      highFives: this.done.filter((x) => x.highFived).length,
      firstVoyage: this.firstVoyage,
    };
    return this.finished;
  }

  _need() {
    if (!this.cur) throw new Error('沒有進行中的題目');
    return this.cur;
  }
}
