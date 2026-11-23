// 讀題小幫手（Nova 4.2、ui-spec 5-C-1）：① 找問題 ② 圈已知 ③ 選運算 ④ 計算
// 幾何題只有 ② 找關鍵數字 ③ 選公式 ④ 計算。這個檔案是純邏輯（UI 與測試共用）。
import { CONFIG } from '../config.js';

const PI_NOTE = /（圓周率用 3\.14）/g;
const NUM_RE = /\d+又\d+\/\d+|\d+(?:\.\d+)?(?:\/\d+)?%?/g;

/**
 * 把題目切成片段：數字（可圈）、名詞（可點基準量）、一般文字。
 * 回傳 [{ text, kind: 'num'|'noun'|'text', i }]；「圓周率用 3.14」的說明不切。
 */
export function tokenize(prompt, helper) {
  const nouns = [...(helper?.nouns || [])].sort((a, b) => b.length - a.length);
  const out = [];
  const pushText = (t) => { if (t) out.push({ text: t, kind: 'text' }); };
  // 先把圓周率說明拿出來
  let last = 0;
  const pieces = [];
  prompt.replace(PI_NOTE, (m, idx) => { pieces.push([prompt.slice(last, idx), false]); pieces.push([m, true]); last = idx + m.length; return m; });
  pieces.push([prompt.slice(last), false]);
  for (const [chunk, plain] of pieces) {
    if (plain) { pushText(chunk); continue; }
    let pos = 0;
    while (pos < chunk.length) {
      NUM_RE.lastIndex = pos;
      const nm = NUM_RE.exec(chunk);
      const numAt = nm ? nm.index : Infinity;
      let nounAt = Infinity, noun = null;
      for (const n of nouns) {
        const at = chunk.indexOf(n, pos);
        if (at >= 0 && (at < nounAt || (at === nounAt && n.length > noun.length))) { nounAt = at; noun = n; }
      }
      const next = Math.min(numAt, nounAt);
      if (next === Infinity) { pushText(chunk.slice(pos)); break; }
      pushText(chunk.slice(pos, next));
      if (numAt <= nounAt) { out.push({ text: nm[0], kind: 'num' }); pos = numAt + nm[0].length; }
      else { out.push({ text: noun, kind: 'noun' }); pos = nounAt + noun.length; }
    }
  }
  return out.map((t, i) => ({ ...t, i }));
}

/** ② 圈已知的檢查：必要數字都圈到、干擾數字 ≤ 1 個；兩量關係題的基準量要點對（綠筆） */
export function checkKnown(tokens, helper, marks) {
  const blue = new Set(marks.blue || []), green = new Set(marks.green || []);
  const need = new Set(helper.known);
  const markedTexts = new Set(tokens.filter((t) => blue.has(t.i) && t.kind === 'num').map((t) => t.text));
  const missing = [...need].filter((x) => !markedTexts.has(x));
  const noise = tokens.filter((t) => blue.has(t.i) && t.kind === 'num' && !need.has(t.text)).length;
  let baseOk = true;
  if (helper.base) {
    const greens = tokens.filter((t) => green.has(t.i));
    baseOk = greens.length > 0 && greens.every((t) => t.text === helper.base);
  }
  const ok = missing.length === 0 && noise <= CONFIG.HELPER_NOISE_MAX && baseOk;
  const missingIdx = tokens.filter((t) => t.kind === 'num' && missing.includes(t.text)).map((t) => t.i);
  return { ok, missing, missingIdx, noise, baseOk };
}

/** 示範時要標出的片段 */
export function demoMarks(tokens, helper) {
  const need = new Set(helper.known);
  return {
    blue: tokens.filter((t) => t.kind === 'num' && need.has(t.text)).map((t) => t.i),
    green: helper.base ? tokens.filter((t) => t.text === helper.base).map((t) => t.i) : [],
    noise: tokens.filter((t) => t.kind === 'num' && !need.has(t.text)).map((t) => t.i),
  };
}

/** 依引導等級 G 決定步驟：回傳 [{ id, required }] */
export function planSteps(helper, G) {
  const isWord = !!helper.goal;
  const steps = isWord ? ['goal', 'known', 'op'] : ['known', 'op'];
  return steps.map((id) => {
    let required;
    if (G >= 3) required = true;
    else if (G === 2) required = id !== 'known';
    else if (G === 1) required = id === 'op';
    else required = false;
    return { id, required };
  });
}

export const STEP_LABEL = {
  goal: '找問題', known: '圈已知', op: '選運算', calc: '計算',
};
export const GEO_STEP_LABEL = { known: '找關鍵數字', op: '選公式', calc: '計算' };

/**
 * 一題的小幫手狀態機。
 * G：有效引導等級；diagnose = true 時是「G0 答錯後叫出小幫手」用來判斷讀題錯還是計算錯。
 */
export class ReadingHelper {
  constructor(question, G, { diagnose = false } = {}) {
    this.q = question;
    this.h = question.helper;
    this.G = G;
    this.tokens = tokenize(question.prompt, this.h);
    this.isGeo = !this.h.goal;
    this.steps = planSteps(this.h, diagnose ? 3 : G).map((s) => ({ ...s, attempts: 0, done: false, firstTry: null, demoed: false, optionalUsed: false }));
    this.usedOptionalHelper = diagnose;
    this.diagnose = diagnose;
    this.opened = G > 0 || diagnose;       // G0：要按「讀題小幫手」才出現
  }

  get active() { return this.opened ? this.steps.find((s) => s.required && !s.done) || null : null; }
  get finished() { return !this.active; }
  step(id) { return this.steps.find((s) => s.id === id); }

  /** G0 主動叫出小幫手（不扣分，只是不累積拿掉引導的進度） */
  open() {
    if (this.opened) return;
    this.opened = true;
    this.usedOptionalHelper = true;
    for (const s of this.steps) s.required = true;
  }

  /** 選用步驟：按「幫我圈重點」「幫我找問題」→ 直接示範那一步 */
  useOptional(id) {
    const s = this.step(id);
    if (!s || s.required || s.done) return null;
    s.done = true; s.optionalUsed = true; s.demoed = true;
    this.usedOptionalHelper = true;
    return this._demoOf(id);
  }

  _demoOf(id) {
    if (id === 'goal') return { goal: this.h.goal.answer };
    if (id === 'op') return { op: this.h.ops.answer };
    return { marks: demoMarks(this.tokens, this.h) };
  }

  /** 回答目前步驟。input：goal/op 是選項 id，known 是 { blue: [i], green: [i] } */
  answer(id, input) {
    const s = this.step(id);
    if (!s || s.done) throw new Error(`步驟 ${id} 不能作答`);
    let ok, detail = null;
    if (id === 'goal') ok = input === this.h.goal.answer;
    else if (id === 'op') ok = input === this.h.ops.answer;
    else { detail = checkKnown(this.tokens, this.h, input || {}); ok = detail.ok; }
    s.attempts += 1;
    if (ok) {
      s.done = true;
      if (s.firstTry == null) s.firstTry = s.attempts === 1;
      return { ok: true, detail };
    }
    if (s.attempts >= CONFIG.HELPER_STEP_TRIES) {
      s.done = true; s.firstTry = false; s.demoed = true;
      return { ok: false, demo: this._demoOf(id), detail };
    }
    return { ok: false, retry: true, detail };
  }

  /** 給 StageRun 的結果（只看必做步驟） */
  result() {
    const req = this.steps.filter((s) => s.required && !s.optionalUsed);
    return {
      guidedSteps: req.map((s) => ({ id: s.id, firstTry: s.firstTry === true, demoed: s.demoed })),
      usedOptionalHelper: this.usedOptionalHelper,
      anyDemo: req.some((s) => s.demoed),
      anyMistake: req.some((s) => s.firstTry === false),
      diagnose: this.diagnose,
      required: req.length > 0,
    };
  }
}
