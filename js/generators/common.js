// 產生器共用工具：人名池、比值池、數字格式、迷思答案清單。
import { Frac, F, gcd } from '../core/frac.js';

// Euclid g6-two-quantity.md「人名與情境池」（原創、不使用真實人物）
export const NAMES = Object.freeze(['小晴', '阿凱', '米雅', '柏宇', '思妤', '阿德', '安娜', '宥辰', '小禾', '佳恩']);

export function pickNames(rng, k) { return rng.sample(NAMES, k); }

/** 數字顯示：有限小數用小數，其他用分數 */
export function fmt(x) { return Frac.of(x).toString(); }

// ---------------------------------------------------------------------------
// 比值池（g6-two-quantity.md「比值的參數池」）
// ---------------------------------------------------------------------------
const FRAC_DENS = [2, 3, 4, 5, 6, 8, 10];
export const POOLS = Object.freeze({
  int: Object.freeze([2, 3, 4, 5, 6].map((k) => F(k))),
  frac: Object.freeze(FRAC_DENS.flatMap((q) => {
    const out = [];
    for (let p = 1; p < q; p++) if (gcd(p, q) === 1) out.push(F(p, q));
    return out;
  })),
  dec: Object.freeze([
    ...[2, 3, 4, 5, 6, 7, 8, 9].map((k) => F(k, 10)),
    ...[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25].map((k) => F(k, 10)),
  ]),
  improper: Object.freeze([F(5, 4), F(4, 3), F(3, 2), F(5, 3), F(7, 4), F(7, 5), F(6, 5)]),
  pct: Object.freeze([
    ...range(10, 90, 5), ...range(110, 200, 5),
  ].map((k) => F(k, 100))),
});

function range(lo, hi, step) { const a = []; for (let x = lo; x <= hi; x += step) a.push(x); return a; }

/** 比值物件：value（Frac）、kind、text（算式裡的寫法）、phrase（「的」後面的寫法） */
export function ratioOf(kind, value) {
  value = Frac.of(value);
  let text, phrase;
  switch (kind) {
    case 'int': text = String(value.n); phrase = `${text} 倍`; break;
    case 'dec': text = value.toDecimalString(); phrase = `${text} 倍`; break;
    case 'pct': text = `${value.mul(100).toDecimalString()}%`; phrase = text; break;
    case 'frac':
    case 'improper': text = value.toFracString(); phrase = text; break;
    default: throw new Error(`未知比值種類 ${kind}`);
  }
  return Object.freeze({ kind, value, text, phrase });
}

/**
 * 從指定種類中選一個比值。filter(valueFrac) 可限制範圍（例如 < 1）。
 * 先平均選種類，再選數值；若某種類被 filter 篩光就換別的種類。
 */
export function pickRatio(rng, kinds, filter = () => true) {
  const usable = kinds
    .map((k) => [k, POOLS[k].filter(filter)])
    .filter(([, vals]) => vals.length > 0);
  if (!usable.length) throw new GenRetry('沒有可用的比值');
  const [kind, vals] = rng.pick(usable);
  return ratioOf(kind, rng.pick(vals));
}

/** 基準量：在 [lo, hi] 內、是 multiple 的倍數 */
export function pickMultiple(rng, multiple, lo, hi) {
  const kLo = Math.ceil(lo / multiple);
  const kHi = Math.floor(hi / multiple);
  if (kHi < kLo) throw new GenRetry(`範圍 ${lo}–${hi} 內沒有 ${multiple} 的倍數`);
  return rng.int(kLo, kHi) * multiple;
}

/** 產生器遇到不合限制的組合時丟出，由引擎換種子重試 */
export class GenRetry extends Error {}

// ---------------------------------------------------------------------------
// 迷思答案清單：去掉無法計算、等於正解、重複的值（先列的優先）
// ---------------------------------------------------------------------------
export function misList(answer, entries) {
  const out = [];
  for (const [fn, code] of entries) {
    let v;
    try { v = typeof fn === 'function' ? fn() : fn; } catch { continue; }
    if (v == null) continue;
    v = Frac.of(v);
    if (v.eq(answer)) continue;
    if (v.n <= 0) continue;                         // 負數或 0 不會是孩子輸入的有意義答案
    if (out.some((m) => m.value.eq(v))) continue;
    out.push({ value: v, code });
  }
  return out;
}

/** 選擇題的迷思：value 是選項 id */
export function choiceMis(answerId, entries) {
  const out = [];
  for (const [id, code] of entries) {
    if (id === answerId || out.some((m) => m.value === id)) continue;
    out.push({ value: id, code });
  }
  return out;
}

/** 數字題的 part */
export function numberPart(answer, misconceptions, extra = {}) {
  return { id: extra.id || 'a', kind: 'number', answer: Frac.of(answer), misconceptions, ...extra };
}

/** 文字片段：字串或 { text, tap } */
export function segs(...items) {
  return items.flat().map((x) => (typeof x === 'string' ? { text: x } : x));
}
export function joinSegs(list) { return list.map((s) => s.text).join(''); }

// ---------------------------------------------------------------------------
// 分數顯示：帶分數「2又1/2」或假分數「5/2」
// ---------------------------------------------------------------------------
export function fmtMixed(x) {
  const v = Frac.of(x);
  if (v.isInt()) return String(v.n);
  if (v.n > v.d) {
    const w = Math.floor(v.n / v.d);
    return `${w}又${v.n - w * v.d}/${v.d}`;
  }
  return `${v.n}/${v.d}`;
}

// ---------------------------------------------------------------------------
// 讀題小幫手資料（Nova 4.2、ui-spec 5-C-1）
//   goal：① 找問題的選項（第一個是正解）
//   known：② 必須圈的數字（要和題目文字裡的寫法一模一樣）
//   base／nouns：② 兩量關係題用綠筆點基準量（nouns 是可以點的名詞）
//   ops：③ 選運算的選項（第一個是正解）
// 引擎會打亂選項順序。
// ---------------------------------------------------------------------------
export function helperSpec({ goal = null, known = [], base = null, nouns = null, ops }) {
  const uniq = (arr) => arr.filter((x, i) => arr.indexOf(x) === i);
  return {
    goal: goal ? { options: uniq(goal), answer: 0 } : null,
    known: uniq(known.map(String)),
    base,
    nouns: nouns ? uniq(nouns) : (base ? [base] : []),
    ops: { options: uniq(ops), answer: 0 },
  };
}
