// 題目引擎：用可重現的種子呼叫產生器，補上 check()，並把迷思答案對應到錯誤類型。
// 介面（Forge skill.md）：generate(level, rng) → { prompt, answer, check(input), hints[], explanation, misconceptions }
import { makeRng, newSeed } from '../core/rng.js';
import { Frac } from '../core/frac.js';
import { parseNumber } from '../core/answer.js';
import { getGenerator } from '../generators/index.js';
import { GenRetry, joinSegs } from '../generators/common.js';
import { errorTypeOf, pickDiagnosticCode } from './errors.js';
import { CONFIG } from '../config.js';

/**
 * 產生一題。
 * @param {object} o
 * @param {string} o.unitId
 * @param {string} o.typeId
 * @param {number} o.level
 * @param {string} [o.seed]    給定種子即可重現同一題
 * @param {Set<string>} [o.avoid] 要避開的參數簽章（同一關、7 天內）
 */
export function generateQuestion({ unitId, typeId, level, seed, avoid, mode = 'input' }) {
  const gen = getGenerator(unitId, typeId);
  if (!gen) throw new Error(`找不到產生器 ${unitId}:${typeId}`);
  if (!gen.levels.includes(level)) throw new RangeError(`${unitId}:${typeId} 沒有 Level ${level}`);
  const baseSeed = seed || newSeed(typeId);
  let spec = null, usedSeed = null, lastErr = null, fallback = null;
  for (let i = 0; i < CONFIG.GEN_MAX_RETRIES; i++) {
    const s = i === 0 ? baseSeed : `${baseSeed}#${i}`;
    try {
      const candidate = gen.generate(level, makeRng(s));
      if (!fallback) fallback = { candidate, s };
      if (avoid && avoid.has(candidate.sig)) continue;
      spec = candidate; usedSeed = s; break;
    } catch (e) {
      if (!(e instanceof GenRetry)) throw e;
      lastErr = e;
    }
  }
  if (!spec && fallback) { spec = fallback.candidate; usedSeed = fallback.s; }   // 數字組合用完時，允許重複
  if (!spec) throw lastErr || new Error('產生題目失敗');
  return finalize(spec, { unitId, typeId, level, seed: usedSeed, isWordProblem: gen.isWordProblem, mode });
}

function finalize(spec, meta) {
  const key = `${meta.unitId}:${meta.typeId}`;
  const rng = makeRng(`${meta.seed}|shuffle`);
  const parts = spec.parts.map((p0) => {
    let p = normalizeChoicePart(p0);
    if (p.kind === 'number' && meta.mode === 'choice') p = numberToChoice(p, rng);
    else if (p.kind === 'choice' && p.shuffle) p = { ...p, options: rng.shuffle(p.options) };
    if (p.kind === 'choice') {
      const ids = new Set(p.options.map((o) => o.id));
      p = withChoiceIndex({ ...p, misconceptions: p.misconceptions.filter((m) => ids.has(m.value) && m.value !== p.answer) });
    }
    return p;
  });
  const prompt = spec.prompt != null ? spec.prompt : joinSegs(spec.segments || []);
  const q = {
    key, unitId: meta.unitId, typeId: meta.typeId, level: meta.level, seed: meta.seed, mode: meta.mode,
    isWordProblem: !!meta.isWordProblem,
    prompt,
    segments: spec.segments || null,
    figure: spec.figure || null,
    table: spec.table || null,
    tables: spec.tables || null,
    parts,
    hints: spec.hints,
    explanation: spec.explanation,
    answerText: spec.answerText,
    context: spec.context,
    params: spec.params,
    sig: spec.sig,
    helper: spec.helper ? normalizeHelper(spec.helper, rng) : null,
    noHelperReason: spec.noHelperReason || null,
    style: spec.style || 'standard',   // unit-map 的 styles：standard／literacy（literacy 題目在 P1 模擬考才會用到）
  };
  // 統一介面欄位
  q.answer = parts.length === 1 ? parts[0].answer : parts.map((p) => p.answer);
  q.misconceptions = parts.flatMap((p) => p.misconceptions.map((m) => ({ part: p.id, ...m })));
  q.check = (input) => gradeResponses(q, input);
  return q;
}

/** 單一 part 的判斷 → { correct, code } */
export function checkPart(part, response) {
  if (part.kind === 'multi') return checkMulti(part, response);
  if (part.kind === 'number') {
    const v = parseNumber(response);
    if (v == null) return { correct: false, code: null, empty: response == null || String(response).trim() === '' };
    if (v.eq(part.answer)) {
      // 診斷用：答對但沒有約分（例如 30/45）→ 仍算對，另外標記
      if (part.flagUnsimplified && isUnsimplifiedFraction(response)) return { correct: true, code: 'M-not-simplified', unsimplified: true };
      return { correct: true, code: null };
    }
    const hit = part.misconceptions.find((m) => Frac.of(m.value).eq(v));
    return { correct: false, code: hit ? hit.code : 'K-calc' };
  }
  // choice / tap：比對 id
  if (response == null || response === '') return { correct: false, code: null, empty: true };
  if (response === part.answer) return { correct: true, code: null };
  const hit = part.misconceptions.find((m) => m.value === response);
  return { correct: false, code: hit ? hit.code : 'unknown' };
}

/**
 * 整題判斷。input：單一 part 時可以是字串；多 part 時是 { partId: response } 或陣列。
 * 回傳 { correct, parts: [{id, correct, code}], code, errorType, empty }
 */
export function gradeResponses(q, input) {
  const responses = normalizeResponses(q, input);
  const results = q.parts.map((p, i) => ({ id: p.id, ...checkPart(p, responses[i]) }));
  const correct = results.every((r) => r.correct);
  const code = correct ? null : pickDiagnosticCode(results.filter((r) => !r.correct).map((r) => r.code || 'unknown'));
  return {
    correct,
    parts: results,
    code,
    errorType: errorTypeOf(code),
    empty: results.some((r) => r.empty),
  };
}

function normalizeResponses(q, input) {
  if (Array.isArray(input)) return input;
  if (input && typeof input === 'object') return q.parts.map((p) => input[p.id]);
  return [input];
}

/** 選擇題答錯時要刪掉的錯誤選項（Nova 3.2）：優先刪掉孩子剛選的那個 */
export function optionToEliminate(part, chosen, alreadyEliminated = []) {
  if (part.kind !== 'choice') return null;
  const wrong = part.options.map((o) => o.id).filter((id) => id !== part.answer && !alreadyEliminated.includes(id));
  if (wrong.length <= 1) return null;           // 至少留 2 個選項
  return wrong.includes(chosen) ? chosen : wrong[0];
}

/** 正確答案的字串（給測試、預覽、解說最後一步） */
export function answerString(part) {
  if (part.kind === 'number') return Frac.of(part.answer).toString();
  return part.answer;
}

// ---------------------------------------------------------------------------
// 4 選 1（choice）：競試格式是 25 題全部 4 選 1，所以 choice 是一等公民。
// 產生器可以直接給：{ kind: 'choice', options: ['…', …], answerIndex, distractorMisconceptions: [code|null, …] }
// 引擎也可以把數字題轉成 4 選 1：干擾選項優先用迷思答案，選錯時就能歸因到那個迷思。
// ---------------------------------------------------------------------------
export const CHOICE_COUNT = 4;

/** 把「options 是字串陣列 + answerIndex」的寫法轉成內部格式 */
export function normalizeChoicePart(p) {
  if (p.kind !== 'choice' || !Array.isArray(p.options) || typeof p.options[0] !== 'string') return p;
  if (!Number.isInteger(p.answerIndex)) throw new Error('choice part 缺少 answerIndex');
  const options = p.options.map((label, i) => ({ id: `o${i}`, label }));
  const dm = p.distractorMisconceptions || [];
  const misconceptions = options
    .map((o, i) => (i !== p.answerIndex && dm[i] ? { value: o.id, code: dm[i] } : null))
    .filter(Boolean);
  return { ...p, options, answer: `o${p.answerIndex}`, misconceptions };
}

/** 補上 answerIndex 與 distractorMisconceptions（對齊目前的選項順序） */
function withChoiceIndex(p) {
  const answerIndex = p.options.findIndex((o) => o.id === p.answer);
  const distractorMisconceptions = p.options.map((o) => {
    if (o.id === p.answer) return null;
    const m = p.misconceptions.find((x) => x.value === o.id);
    return m ? m.code : null;
  });
  return { ...p, answerIndex, distractorMisconceptions };
}

function niceValue(v, answer) {
  const places = v.decimalPlaces();
  if (places >= 0) return places <= Math.max(2, answer.decimalPlaces() + 1);
  return v.d <= Math.max(12, answer.d * 2);
}

/** 數字題 → 4 選 1 */
export function numberToChoice(p, rng) {
  const ans = Frac.of(p.answer);
  const picked = [];
  const taken = (v) => v.eq(ans) || picked.some((x) => x.value.eq(v));
  // 1) 迷思答案（先選非 K- 的，診斷價值較高；同代碼不要佔太多格）
  const mis = p.misconceptions.map((m) => ({ value: Frac.of(m.value), code: m.code }))
    .filter((m) => m.value.n > 0 && niceValue(m.value, ans));
  const byPriority = [...mis.filter((m) => !m.code.startsWith('K-')), ...mis.filter((m) => m.code.startsWith('K-'))];
  for (const m of byPriority) {
    if (picked.length >= CHOICE_COUNT - 1) break;
    if (!taken(m.value)) picked.push(m);
  }
  // 2) 不夠的話，用常見的「差一點」數字補滿（記 K-calc）
  const places = Math.max(0, ans.decimalPlaces());
  const step = places > 0 ? new Frac(1, 10 ** places) : Frac.of(1);
  const fill = [ans.mul(2), ans.div(2), ans.add(step), ans.sub(step), ans.mul(10), ans.div(10),
    ans.add(step.mul(2)), ans.sub(step.mul(2)), ans.add(step.mul(10)), ans.add(step.mul(5))];
  if (!ans.isInt() && places < 0) {   // 非有限小數的分數答案：用相近的分數當干擾選項
    const { n, d } = ans;
    fill.push(ans.inv(), new Frac(n + 1, d), new Frac(n, d + 1), ...(n > 1 ? [new Frac(n - 1, d)] : []), ...(d > 2 ? [new Frac(n, d - 1)] : []), new Frac(d, n + d));
  }
  for (const v of rng.shuffle(fill)) {
    if (picked.length >= CHOICE_COUNT - 1) break;
    if (v.n > 0 && niceValue(v, ans) && !taken(v)) picked.push({ value: v, code: 'K-calc' });
  }
  const unit = p.unit ? ` ${p.unit}` : '';
  const all = rng.shuffle([{ value: ans, code: null }, ...picked]);
  const options = all.map((o, i) => ({ id: `n${i}`, label: `${o.value.toString()}${unit}`, value: o.value }));
  const answerId = options[all.findIndex((o) => o.code === null)].id;
  return {
    id: p.id, kind: 'choice', label: p.label, unit: p.unit, fromNumber: true,
    numberAnswer: ans,
    options: options.map(({ id, label }) => ({ id, label })),
    optionValues: Object.fromEntries(options.map((o) => [o.id, o.value])),
    answer: answerId,
    misconceptions: all.map((o, i) => (o.code ? { value: options[i].id, code: o.code } : null)).filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// 複選（multi）：answer 是 id 陣列；response 是 id 陣列。
// misconceptionRules：[{ when: 'missing-any' | 'includes-any', ids: [...], code }]，依序檢查
// ---------------------------------------------------------------------------
function checkMulti(part, response) {
  const picked = Array.isArray(response) ? [...new Set(response)] : [];
  if (!picked.length) return { correct: false, code: null, empty: true };
  const want = new Set(part.answer);
  const correct = picked.length === want.size && picked.every((id) => want.has(id));
  if (correct) return { correct: true, code: null };
  for (const r of part.misconceptionRules || []) {
    if (r.when === 'missing-any' && r.ids.some((id) => !picked.includes(id))) return { correct: false, code: r.code };
    if (r.when === 'includes-any' && r.ids.some((id) => picked.includes(id))) return { correct: false, code: r.code };
  }
  return { correct: false, code: 'unknown' };
}

function isUnsimplifiedFraction(raw) {
  const m = /^\s*(\d+)\s*[/／]\s*(\d+)\s*$/.exec(String(raw).normalize('NFKC'));
  if (!m) return false;
  const a = Number(m[1]), b = Number(m[2]);
  let x = a, y = b; while (y) [x, y] = [y, x % y];
  return x > 1;
}

/** 讀題小幫手：打亂 ① 找問題、③ 選運算的選項，補上 id */
function normalizeHelper(hp, rng) {
  const choice = (c, prefix) => {
    if (!c) return null;
    const opts = c.options.map((label, i) => ({ id: `${prefix}${i}`, label }));
    return { options: rng.shuffle(opts), answer: `${prefix}${c.answer}` };
  };
  return { goal: choice(hp.goal, 'g'), known: hp.known, base: hp.base, nouns: hp.nouns || [], ops: choice(hp.ops, 'o') };
}
