// 診斷測驗（diagnostic.md、Nova 2.2–2.3）：作答不顯示對錯；應用題答錯或「還沒學過」時做拆題小步驟。
import { CONFIG } from '../config.js';
import { DIAG_ITEMS, DIAG_SEGMENTS, UNIT_TITLES } from '../data/diagnostic.js';
import { gradeResponses } from './question.js';
import { errorTypeOf } from './errors.js';
import { UNITS, getUnit, skillKey, clampLevel } from '../data/units.js';
import { ensureSkill, usesGuidance } from './skills.js';
import { getGenerator } from '../generators/index.js';
import { addDew } from './rewards.js';

export function diagItem(no) { return DIAG_ITEMS.find((x) => x.no === no); }

/** 把診斷題轉成和一般題目相同介面的物件（畫面元件與 check() 共用） */
export function diagQuestion(item) {
  const prompt = item.prompt ?? item.segments.map((s) => (s.text === '\n' ? '' : s.text)).join('');
  const q = {
    key: item.key || `${item.unitId}:diag`, unitId: item.unitId, typeId: 'diag', level: 0, seed: `diag-${item.no}`,
    prompt, segments: item.segments || null, figure: item.figure || null, table: null, tables: null,
    parts: item.parts, hints: [], explanation: [], answerText: '', helper: null, isDiagnostic: true, no: item.no,
  };
  q.check = (input) => gradeResponses(q, input);
  return q;
}

/** 記錄一題。回傳 { needSplit }：應用題答錯或略過時要做拆題 */
export function recordDiagAnswer(state, no, { responses = null, skipped = false, secs = 0 } = {}) {
  const item = diagItem(no);
  const d = state.diagnostic;
  let isCorrect = null, code = null, unsimplified = false;
  if (!skipped) {
    const g = diagQuestion(item).check(responses);
    isCorrect = g.correct;
    code = g.correct ? null : g.code;
    unsimplified = g.parts.some((p) => p.unsimplified);
  }
  d.answers = d.answers.filter((a) => a.itemId !== `d${no}`);
  d.answers.push({
    itemId: `d${no}`, key: item.key || `${item.unitId}:diag`, unitId: item.unitId,
    response: skipped ? null : JSON.stringify(responses), isCorrect, skipped, secs,
    code, errorType: code ? errorTypeOf(code) : null, unsimplified, split: null,
  });
  return { needSplit: !!(item.word && item.split && (skipped || !isCorrect)) };
}

/**
 * 拆題結果。input：{ goal: 選項 id, op: 選項 id }（舊寫法 { goalOk, opOk } 也接受）。
 * 判讀（Euclid 2026-11-23）：
 *  - 「這題最後要問什麼」選錯 → 讀題（C-，看不懂題目在問什麼，優先於算式）
 *  - 算式選錯：選項帶 M- → 概念；帶 C- 或沒有代碼 → 讀題
 *  - 兩步都對：原本的答案符合 M- 迷思 → 概念；K- 迷思、對不到迷思或「還沒學過」→ 計算
 */
export function recordDiagSplit(state, no, input) {
  const a = state.diagnostic.answers.find((x) => x.itemId === `d${no}`);
  if (!a) return;
  const sp = diagItem(no).split;
  const pickOpt = (step, id) => sp[step].options.find((o) => o.id === id) || null;
  let goalOk, opOk, goalOpt = null, opOpt = null;
  if ('goal' in input || 'op' in input) {
    goalOpt = pickOpt('goal', input.goal); opOpt = pickOpt('op', input.op);
    goalOk = input.goal === sp.goal.answer; opOk = input.op === sp.op.answer;
  } else { goalOk = !!input.goalOk; opOk = !!input.opOk; }
  a.split = { goalOk, opOk, goal: input.goal ?? null, op: input.op ?? null };
  if (!goalOk) {
    a.code = goalOpt?.code && goalOpt.code.startsWith('C-') ? goalOpt.code : 'C-goal';
    a.errorType = 'reading';
  } else if (!opOk) {
    const c = opOpt?.code || null;
    if (c && c.startsWith('M-')) { a.code = c; a.errorType = 'concept'; }
    else { a.code = c && c.startsWith('C-') ? c : 'C-operation'; a.errorType = 'reading'; }
  } else if (a.code && a.code.startsWith('M-')) {
    a.errorType = 'concept';
  } else {
    a.errorType = 'calc';
    if (!a.code || !a.code.startsWith('K-')) a.code = 'K-calc';
  }
}

export function segmentItems(i) { return DIAG_SEGMENTS[i] || []; }

/** 一段做完：+5 努力點；兩段都完成 → status done */
export function finishSegment(state, day) {
  const d = state.diagnostic;
  d.segmentIndex = Math.min(DIAG_SEGMENTS.length, d.segmentIndex + 1);
  addDew(state, day, CONFIG.DEW.diagnosticSegment);
  d.status = d.segmentIndex >= DIAG_SEGMENTS.length ? 'done' : 'in-progress';
  if (d.status === 'done' && !d.day1) d.day1 = day;      // schedule.md v2：第 1 天 = 完成診斷第 2 段的那一天
  return { done: d.status === 'done' };
}

// ---------------------------------------------------------------------------
// 判讀（diagnostic.md「怎麼判讀結果」）
// ---------------------------------------------------------------------------
export function judgeDiagnostic(state) {
  const answers = state.diagnostic.answers;
  const byUnit = {};
  for (const a of answers) (byUnit[a.unitId] ||= []).push(a);
  const unitStatus = {};
  for (const [u, list] of Object.entries(byUnit)) {
    const right = list.filter((a) => a.isCorrect && !a.unsimplified).length;
    const anyRight = list.some((a) => a.isCorrect);
    if (right === list.length) unitStatus[u] = 'known';
    else if (!anyRight) unitStatus[u] = 'unknown';
    else unitStatus[u] = 'partial';
  }
  // 應用題總判讀：讀題（C）vs 計算（K）
  const word = answers.filter((a) => diagItem(Number(a.itemId.slice(1))).word && (a.skipped || !a.isCorrect));
  // 只算讀題（C）與計算（K）；概念錯（M-）兩邊都不算
  const C = word.filter((a) => a.split && a.errorType === 'reading').length;
  const K = word.filter((a) => a.split && a.errorType === 'calc').length;
  let readingType = 'none';
  if (C >= CONFIG.DIAG_READING_TYPE_MIN) readingType = 'reading';
  else if (K >= CONFIG.DIAG_READING_TYPE_MIN) readingType = 'calc';
  else if (C >= 2 && K >= 2) readingType = 'mixed';
  // 優先補強：缺口中年級最低的；一定要包含兩量關係
  const grade = (u) => Number(u.slice(1, 2));
  const gaps = Object.keys(unitStatus).filter((u) => unitStatus[u] === 'unknown').sort((a, b) => grade(a) - grade(b));
  const priorities = gaps.slice(0, 3);
  if (!priorities.includes('g6-two-quantity')) {
    if (priorities.length >= 3) priorities[2] = 'g6-two-quantity'; else priorities.push('g6-two-quantity');
  }
  return { unitStatus, readingType, priorities, C, K };
}

const INIT = { known: { level: 3, guidance: 1 }, partial: { level: 2, guidance: 2 }, unknown: { level: 1, guidance: 3 }, untested: { level: 2, guidance: 2 } };

/** 依診斷設定起始難度與引導（2.3）。只改還沒開始練習的技能鍵，已有進度的不覆蓋。 */
export function applyDiagnostic(state, day) {
  const j = judgeDiagnostic(state);
  const results = {};
  for (const unit of UNITS) {
    let status = j.unitStatus[unit.id] || 'untested';
    // 圓周長還沒教：先備（圓、扇形）有缺口時，從 L1、全引導開始
    if (unit.id === 'g6-circumference' && ['g3-circle', 'g5-sector'].some((u) => j.unitStatus[u] === 'unknown')) status = 'unknown';
    for (const t of unit.questionTypes) {
      const key = skillKey(unit.id, t.id);
      if (status !== 'untested') results[key] = status;
      const s = ensureSkill(state, key);
      if (s.attempts > 0) continue;
      const init = INIT[status];
      s.level = clampLevel(key, init.level);
      if (usesGuidance(key)) {
        let g = Math.max(CONFIG.GUIDANCE_FLOOR_WORD_GEO, init.guidance);
        if (j.readingType === 'reading' && getGenerator(unit.id, t.id)?.isWordProblem) g = 3;
        s.guidance = g;
        s.guidanceMaxSeen = Math.max(s.guidanceMaxSeen || 0, g);
      }
    }
  }
  const d = state.diagnostic;
  d.results = results;
  d.unitResults = j.unitStatus;
  d.readingType = j.readingType;
  d.priorities = j.priorities;
  d.completedAt = Date.now();
  d.history = [...(d.history || []), { completedAt: d.completedAt, results: j.unitStatus }].slice(-5);
  d.summary = parentSummary(j);
  if (j.readingType === 'reading') state.settings.ttsEnabled = true;
  void day;
  return j;
}

function title(u) { return getUnit(u)?.title || UNIT_TITLES[u] || u; }

/** 給家長的白話摘要（只寫觀察到的事實和計畫，不寫分數） */
export function parentSummary(j) {
  const known = Object.keys(j.unitStatus).filter((u) => j.unitStatus[u] === 'known').map(title);
  const partial = Object.keys(j.unitStatus).filter((u) => j.unitStatus[u] === 'partial').map(title);
  const gaps = Object.keys(j.unitStatus).filter((u) => j.unitStatus[u] === 'unknown').map(title);
  const lines = [];
  if (known.length) lines.push(`已經很穩的：${known.join('、')}。`);
  if (partial.length) lines.push(`還不太穩的：${partial.join('、')}。`);
  if (gaps.length) lines.push(`還需要補的：${gaps.join('、')}。`);
  const rt = { reading: '應用題主要卡在讀題（看清楚題目在問什麼、選對算式），我們會先開啟讀題小幫手的全引導，並開啟朗讀。',
    calc: '應用題大多讀得懂，主要是計算細節，我們會另外安排計算練習。',
    mixed: '應用題的讀題和計算都有一些卡住的地方，會先練讀題，再每週檢查計算。',
    none: '應用題的讀題和計算目前沒有明顯偏向哪一邊。' }[j.readingType];
  lines.push(rt);
  lines.push(`接下來先練：${j.priorities.map(title).join('、')}。`);
  return lines;
}
