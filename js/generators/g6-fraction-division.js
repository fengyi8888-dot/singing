// 產生器：g6-fraction-division 分數除法（翰林 6上-第2單元）
// 規格：projects/math-quest/curriculum/specs/g6-fraction-division-word.md
// 只涵蓋 frac-div-word、quotient-size 兩個題型（純計算題型之後再補）。
import { Frac, F } from '../core/frac.js';
import { pickNames, fmt, fmtMixed, misList, choiceMis, numberPart, helperSpec, GenRetry } from './common.js';

const UNIT_ID = 'g6-fraction-division';
const DENS = [2, 3, 4, 5, 6, 8, 9, 10, 12];

function properFrac(rng, dens = DENS) {
  const d = rng.pick(dens);
  let n;
  do { n = rng.int(1, d - 1); } while (F(n, d).d !== d);
  return F(n, d);
}
function mixedFrac(rng) { return F(rng.int(1, 3)).add(properFrac(rng)); }
const show = (v) => fmtMixed(v);
const improper = (v) => (v.isInt() ? String(v.n) : `${v.n}/${v.d}`);

// ===========================================================================
// 題型 1：frac-div-word
// ===========================================================================
function fracDivWord(level, rng) {
  const kinds = level === 3 ? ['quotitive', 'partitive', 'unit-rate', 'find-whole'] : level === 4 ? ['quotitive-rem', 'times-compare'] : ['remaining'];
  const kind = rng.pick(kinds);
  const [nm] = pickNames(rng, 1);
  const hint1 = '黃色筆點「要求什麼」，藍色筆點兩個數量和它們的單位。問自己：題目是在問「有幾個」、「一份是多少」，還是「全部是多少」？';
  const hint2 = '對照口訣：「A 裡面有幾個 b」→ A ÷ b；「b 份是 A，一份是多少」→ A ÷ b；「全部的 b 是 A」→ A ÷ b。除以分數 = 乘以它的倒數。除以小於 1 的數，商會變大。';
  if (kind === 'quotitive') {
    const b = properFrac(rng);
    const n = rng.int(2, 12);
    const A = b.mul(n);
    const ctx = rng.pick([['公升果汁', '每杯倒', '公升', '可以倒滿幾杯', '杯'], ['公尺緞帶', '每段剪', '公尺', '可以剪成幾段', '段'], ['公斤麵粉', '每個蛋糕用', '公斤', '可以做幾個蛋糕', '個']]);
    const prompt = `${nm}有 ${show(A)} ${ctx[0]}，${ctx[1]} ${show(b)} ${ctx[2]}，${ctx[3]}？`;
    const ans = F(n);
    const mis = misList(ans, [[() => A.mul(b), 'C-operation'], [() => b.div(A), 'C-base-swap']]);
    return out({ prompt, ans, mis, unit: ctx[4], kind, A, b, judge: `「${show(A)} ${ctx[2]}裡面有幾個 ${show(b)} ${ctx[2]}」→ 包含除`,
      goal: [ctx[3].replace('可以', '可以'), `每${ctx[4]}有多少${ctx[2]}`, `全部有多少${ctx[2]}`], known: [show(A), show(b)] });
  }
  if (kind === 'partitive') {
    const u = properFrac(rng);
    const k = rng.int(2, 9);
    const A = u.mul(k);
    const prompt = `${show(A)} 公斤的糖平分給 ${k} 個人，每人分到幾公斤？`;
    const mis = misList(u, [[() => A.mul(k), 'C-operation'], [() => F(k).div(A), 'C-base-swap']]);
    return out({ prompt, ans: u, mis, unit: '公斤', kind, A, b: F(k), judge: `「${show(A)} 公斤平分成 ${k} 份，一份是多少」→ 等分除`,
      goal: ['每人分到幾公斤', '一共有幾公斤', '可以分給幾個人'], known: [show(A), String(k)] });
  }
  if (kind === 'unit-rate') {
    const b = properFrac(rng, [2, 3, 4, 5, 6]);
    const u = F(rng.int(1, 6)).add(rng.chance(0.5) ? properFrac(rng, [2, 4]) : F(0));
    const A = u.mul(b);
    const prompt = `${nm}花了 ${show(b)} 小時走了 ${show(A)} 公里。照這樣的速度，1 小時可以走幾公里？`;
    const mis = misList(u, [[() => A.mul(b), 'C-operation'], [() => b.div(A), 'C-base-swap']]);
    return out({ prompt, ans: u, mis, unit: '公里', kind, A, b, judge: `「${show(b)} 小時對應 ${show(A)} 公里，1 小時是多少」→ 單位量`,
      goal: ['1 小時走幾公里', '走 1 公里要多久', `${show(b)} 小時走幾公里`], known: [show(b), show(A)], minutes: b.mul(60) });
  }
  if (kind === 'find-whole') {
    const b = properFrac(rng, [2, 3, 4, 5, 6, 8, 10]);
    const W = b.d * rng.int(2, 40);
    const A = b.mul(W);
    const prompt = `${nm}讀了一本書的 ${show(b)}，是 ${fmt(A)} 頁。這本書全部有幾頁？`;
    const ans = F(W);
    const mis = misList(ans, [[() => A.mul(b), 'C-operation'], [() => b.div(A), 'C-base-swap'], [() => A.add(b.n), 'K-calc']]);
    return out({ prompt, ans, mis, unit: '頁', kind, A, b, judge: `「全部的 ${show(b)} 是 ${fmt(A)} 頁」→ 求全體`,
      goal: ['全書有幾頁', '已經讀了幾頁', '還剩幾頁'], known: [show(b), fmt(A)] });
  }
  if (kind === 'times-compare') {
    const b = properFrac(rng);
    const r = F(rng.int(2, 5)).add(rng.chance(0.5) ? F(1, 2) : F(0));
    const A = b.mul(r);
    if (A.cmp(4) > 0) throw new GenRetry('太大');
    const prompt = `甲桶油漆用了 ${show(A)} 公升，乙桶用了 ${show(b)} 公升。甲用的是乙的幾倍？`;
    const mis = misList(r, [[() => b.div(A), 'C-base-swap'], [() => A.mul(b), 'C-operation']]);
    return out({ prompt, ans: r, mis, unit: '倍', kind, A, b, judge: `「甲是乙的幾倍」→ 甲 ÷ 乙`, goal: ['甲是乙的幾倍', '乙是甲的幾倍', '兩桶一共用了多少'], known: [show(A), show(b)] });
  }
  if (kind === 'quotitive-rem') {
    const b = properFrac(rng, [2, 3, 4, 5, 6]);
    const n = rng.int(2, 10);
    const r = b.mul(F(rng.int(1, 5), 6));
    if (!(r.gt(0) && r.lt(b)) || r.d > 12) throw new GenRetry('剩下的量');
    const A = b.mul(n).add(r);
    if (A.d > 12) throw new GenRetry('分母太大');
    const quotient = A.div(b);
    const prompt = `一條緞帶長 ${show(A)} 公尺，每 ${show(b)} 公尺剪成一段。最多可以剪成幾段？還剩下幾公尺？`;
    const parts = [
      numberPart(F(n), misList(F(n), [[() => quotient, 'C-goal'], [() => F(n + 1), 'M-round-up']]), { id: 'a', label: '段數', unit: '段' }),
      numberPart(r, misList(r, [[() => quotient.sub(n), 'M-remainder-unit'], [() => A.sub(b.mul(n + 1)).abs(), 'K-calc']]), { id: 'b', label: '剩下', unit: '公尺', allowFraction: true }),
    ];
    return {
      prompt,
      parts,
      hints: [hint1, hint2],
      explanation: [
        '第 1 步：要求什麼？→ 最多幾段、剩下幾公尺。',
        `第 2 步：判斷：「${show(A)} 公尺裡面有幾個 ${show(b)} 公尺」→ 包含除。`,
        `第 3 步：${show(A)} ÷ ${show(b)} = ${improper(A)} × ${b.inv().toFracString()} = ${show(quotient)}，所以最多 ${n} 段。`,
        `第 4 步：用掉 ${n} × ${show(b)} = ${show(b.mul(n))} 公尺；剩下 ${show(A)} − ${show(b.mul(n))} = ${show(r)} 公尺。`,
        `注意：剩下的量要用原來的單位（公尺）算，不是「${show(quotient.sub(n))} 段」。`,
        `答：${n} 段，剩下 ${show(r)} 公尺。`,
      ],
      answerText: `${n} 段，剩 ${show(r)} 公尺`,
      context: kind,
      helper: helperSpec({ goal: ['最多幾段、剩下幾公尺', '每段多長', '緞帶全長'], known: [show(A), show(b)], ops: [`${show(A)} ÷ ${show(b)}`, `${show(A)} × ${show(b)}`, `${show(b)} ÷ ${show(A)}`] }),
      params: { kind, A, b, n, r },
      sig: `fdw|rem|${A.toFracString()}|${b.toFracString()}`,
    };
  }
  // remaining（Level 5）
  const p1 = properFrac(rng, [2, 3, 4, 5]);
  const p2 = properFrac(rng, [2, 3, 4, 5]);
  const left1 = F(1).sub(p1);
  const left2 = left1.mul(F(1).sub(p2));
  const unit = left2.d * p1.d * p2.d;
  const W = unit * rng.int(1, Math.max(1, Math.floor(500 / unit)));
  if (W < 20 || W > 500) throw new GenRetry('W 範圍');
  const R = left2.mul(W);
  if (!R.isInt() || !left1.mul(W).isInt()) throw new GenRetry('不是整數');
  const prompt = `${nm}第一天讀了全書的 ${show(p1)}，第二天讀了剩下的 ${show(p2)}，還剩 ${fmt(R)} 頁沒讀。全書有幾頁？`;
  const ans = F(W);
  const mis = misList(ans, [[() => R.div(F(1).sub(p1).sub(p2)), 'M-remaining-of-whole'], [() => R.div(F(1).sub(p2)), 'C-step-missed'], [() => R.mul(left2), 'C-operation']]);
  return {
    prompt,
    parts: [numberPart(ans, mis, { unit: '頁' })],
    hints: [hint1, '「剩下的」幾分之幾，基準是剩下的量，不是全部。先把全部看成 1，算出最後剩下全部的幾分之幾。'],
    explanation: [
      '第 1 步：把全部看成 1。',
      `第 2 步：第一天讀 ${show(p1)}，剩下 1 − ${show(p1)} = ${show(left1)}。`,
      `第 3 步：第二天讀「剩下的」${show(p2)} → 讀了 ${show(left1)} × ${show(p2)} = ${show(left1.mul(p2))}。`,
      `第 4 步：還剩 ${show(left1)} − ${show(left1.mul(p2))} = ${show(left2)}（占全部）。`,
      `第 5 步：全部的 ${show(left2)} 是 ${fmt(R)} 頁 → 全部 = ${fmt(R)} ÷ ${show(left2)} = ${W}。`,
      `答：${W} 頁。`,
    ],
    answerText: `${W} 頁`,
    context: kind,
    helper: helperSpec({ goal: ['全書有幾頁', '第一天讀了幾頁', '還剩幾頁'], known: [show(p1), show(p2), fmt(R)], ops: [`${fmt(R)} ÷ [(1 − ${show(p1)}) × (1 − ${show(p2)})]`, `${fmt(R)} ÷ (1 − ${show(p1)} − ${show(p2)})`, `${fmt(R)} × (1 − ${show(p1)}) × (1 − ${show(p2)})`] }),
    params: { kind, p1, p2, W },
    sig: `fdw|remaining|${p1.toFracString()}|${p2.toFracString()}|${W}`,
  };

  function out({ prompt, ans, mis, unit, kind: k, A, b, judge, goal, known, minutes = null }) {
    return {
      prompt,
      parts: [numberPart(ans, mis, { unit, allowFraction: true })],
      hints: [hint1, hint2],
      explanation: [
        `第 1 步：要求什麼？→ ${goal[0]}。`,
        `第 2 步：判斷：${judge}。`,
        `第 3 步：列式：${show(A)} ÷ ${show(b)}。`,
        `第 4 步：計算：${A.isInt() || A.n < A.d ? '' : `帶分數先化成假分數：${show(A)} = ${improper(A)}；`}${improper(A)} ÷ ${improper(b)} = ${improper(A)} × ${b.inv().toFracString()} = ${show(ans)}。`,
        ...(minutes ? [`補充：${show(b)} 小時 = ${fmt(minutes)} 分鐘。`] : []),
        `第 5 步：驗算：${show(ans)} × ${show(b)} = ${show(A)} ✓`,
        `答：${show(ans)} ${unit}。`,
      ],
      answerText: `${show(ans)} ${unit}`,
      context: k,
      helper: helperSpec({ goal, known, ops: [`${show(A)} ÷ ${show(b)}`, `${show(A)} × ${show(b)}`, `${show(b)} ÷ ${show(A)}`] }),
      params: { kind: k, A, b },
      sig: `fdw|${k}|${A.toFracString()}|${b.toFracString()}`,
    };
  }
}

// ===========================================================================
// 題型 2：quotient-size 不計算，判斷商的大小
// ===========================================================================
function quotientSize(level, rng) {
  if (level === 3) {
    const A = rng.chance(0.5) ? F(rng.int(2, 20)) : mixedFrac(rng);
    const kind = rng.pick(['lt1', 'gt1', 'lt1', 'eq1']);
    const b = kind === 'lt1' ? properFrac(rng) : kind === 'eq1' ? F(1) : mixedFrac(rng);
    const ansId = kind === 'lt1' ? 'big' : kind === 'eq1' ? 'same' : 'small';
    const options = [{ id: 'big', label: `比 ${show(A)} 大` }, { id: 'small', label: `比 ${show(A)} 小` }, { id: 'same', label: `和 ${show(A)} 一樣大` }];
    return {
      prompt: `不用算，判斷 ${show(A)} ÷ ${show(b)} 的商，和 ${show(A)} 比起來是大還是小？`,
      parts: [{ id: 'a', kind: 'choice', options, answer: ansId, misconceptions: choiceMis(ansId, kind === 'lt1' ? [['small', 'M-div-smaller']] : kind === 'gt1' ? [['big', 'C-operation']] : [['small', 'M-div-smaller']]) }],
      hints: [`想一想：${show(A)} 裡有幾個 ${show(b)}？是比 ${show(A)} 多，還是比 ${show(A)} 少？`, '除數小於 1 → 商比被除數大；除數等於 1 → 一樣；除數大於 1 → 商比被除數小。'],
      explanation: [
        `用分裝的方式想：${show(A)} ÷ ${show(b)} = 「${show(A)} 裡面有幾個 ${show(b)}」。`,
        kind === 'lt1' ? `${show(b)} 比 1 小 → 一個 ${show(b)} 比 1 還小，所以可以裝下比 ${show(A)} 更多個 → 商比 ${show(A)} 大。`
          : kind === 'eq1' ? `除以 1，商就是 ${show(A)} 本身 → 一樣大。`
            : `${show(b)} 比 1 大 → 一個 ${show(b)} 比 1 大，裝不到 ${show(A)} 個 → 商比 ${show(A)} 小。`,
        `答：${options.find((o) => o.id === ansId).label}。`,
      ],
      answerText: options.find((o) => o.id === ansId).label,
      context: kind,
      params: { A, b, kind },
      sig: `qs|${A.toFracString()}|${b.toFracString()}`,
    };
  }
  // Level 4：哪一個結果最大
  const A = F(rng.int(2, 12));
  let bSmall, bMid, bBig;
  for (let i = 0; i < 40; i++) {
    bSmall = properFrac(rng); bMid = properFrac(rng); bBig = mixedFrac(rng);
    if (bSmall.lt(bMid)) break;
    bSmall = null;
  }
  if (!bSmall) throw new GenRetry('除數');
  const exprs = [
    { id: 'q0', label: `${show(A)} ÷ ${show(bSmall)}`, v: A.div(bSmall) },
    { id: 'q1', label: `${show(A)} ÷ ${show(bMid)}`, v: A.div(bMid) },
    { id: 'q2', label: `${show(A)} ÷ ${show(bBig)}`, v: A.div(bBig) },
    { id: 'q3', label: `${show(A)} × ${show(bMid)}`, v: A.mul(bMid) },
  ];
  const max = exprs.reduce((m, e) => (e.v.gt(m.v) ? e : m));
  if (max.id !== 'q0') throw new GenRetry('最大值');
  return {
    prompt: '不用算出答案，哪一個算式的結果最大？',
    parts: [{ id: 'a', kind: 'choice', options: exprs.map(({ id, label }) => ({ id, label })), answer: 'q0', shuffle: true, misconceptions: choiceMis('q0', [['q2', 'M-div-smaller'], ['q3', 'C-operation']]) }],
    hints: ['除以一個比 1 小的數，商會變大；而且除數越小，商越大。', `比較除數：${show(bSmall)}、${show(bMid)} 比 1 小，${show(bBig)} 比 1 大；× ${show(bMid)} 會變小。`],
    explanation: [
      `第 1 步：${show(A)} × ${show(bMid)} 會比 ${show(A)} 小（乘一個小於 1 的數）。`,
      `第 2 步：${show(A)} ÷ ${show(bBig)} 也比 ${show(A)} 小（除數比 1 大）。`,
      `第 3 步：${show(A)} ÷ ${show(bSmall)} 和 ${show(A)} ÷ ${show(bMid)} 都比 ${show(A)} 大；除數 ${show(bSmall)} 比較小，所以商比較大。`,
      `答：${show(A)} ÷ ${show(bSmall)}。`,
    ],
    answerText: `${show(A)} ÷ ${show(bSmall)}`,
    context: 'order',
    params: { A, bSmall, bMid, bBig },
    sig: `qs4|${A.n}|${bSmall.toFracString()}|${bMid.toFracString()}|${bBig.toFracString()}`,
  };
}

export default {
  unitId: UNIT_ID,
  types: {
    'frac-div-word': { levels: [3, 4, 5], isWordProblem: true, generate: fracDivWord },
    'quotient-size': { levels: [3, 4], isWordProblem: false, generate: quotientSize },
  },
};
