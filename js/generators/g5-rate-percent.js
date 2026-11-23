// 產生器：g5-rate-percent 比率與百分率（翰林 5下-第8單元）
// 規格：projects/math-quest/curriculum/specs/g5-percentage.md
// 一律先選全體量和百分率，再算出題目的數字。百分率的答案用數字鍵盤，後面固定顯示「%」。
import { Frac, F, gcd } from '../core/frac.js';
import { pickNames, fmt, misList, choiceMis, numberPart, helperSpec, GenRetry } from './common.js';

const UNIT_ID = 'g5-rate-percent';

const pctText = (p) => `${fmt(p)}%`;                 // p 是百分率的數字（Frac），例如 37.5
const decOf = (p) => Frac.of(p).div(100);

function pctPool(level) {
  const out = [];
  const step = level <= 2 ? 10 : 5;
  for (let p = step; p < 100; p += step) out.push(F(p));
  if (level >= 4) out.push(F(25, 2), F(75, 2), F(125, 2), F(175, 2));
  return out;
}

/** 讓 W × p% 是整數：W 是 100 ÷ gcd 的倍數（p 可以是 12.5 這種） */
function wholeFor(rng, p, lo, hi) {
  const r = decOf(p);                                // 例如 3/8
  const m = r.d;
  const kLo = Math.ceil(lo / m), kHi = Math.floor(hi / m);
  if (kHi < kLo) throw new GenRetry('沒有合適的全體量');
  return rng.int(kLo, kHi) * m;
}

// 折數：八折 = 80%、七五折 = 75%
const ZHE = { 90: '九折', 80: '八折', 70: '七折', 50: '五折', 85: '八五折', 75: '七五折', 95: '九五折', 65: '六五折', 60: '六折' };
const ZHE_WRONG = { 85: 80, 75: 70, 95: 90, 65: 60 };   // 七五折誤當七折

// ===========================================================================
// 題型 1：rate-meaning 認識比率
// ===========================================================================
const RATE_DENS = [2, 4, 5, 10, 20, 25, 50];
function rateMeaning(level, rng) {
  let n, k, r;
  for (let i = 0; i < 80; i++) {
    n = rng.int(10, 100); k = rng.int(1, n - 1);
    r = F(k, n);
    if (RATE_DENS.includes(r.d)) break;
    r = null;
  }
  if (!r) throw new GenRetry('比率分母');
  const context = rng.pick(['class', 'shoot', 'seed']);
  const [nm] = pickNames(rng, 1);
  const other = level === 2 && rng.chance(0.6);
  const ansFrac = other ? F(n - k, n) : r;
  let prompt, whole, part, partOther;
  if (context === 'class') {
    whole = '全班'; part = '戴眼鏡的人'; partOther = '沒戴眼鏡的人';
    prompt = `全班 ${n} 人，有 ${k} 人戴眼鏡。${other ? '沒戴眼鏡' : '戴眼鏡'}的人占全班的比率是多少？`;
  } else if (context === 'shoot') {
    whole = '投籃的次數'; part = '進球數'; partOther = '沒進的球數';
    prompt = `${nm}投籃 ${n} 次，進了 ${k} 球。${other ? '沒進的球' : '進球'}占投籃次數的比率是多少？`;
  } else {
    whole = '種下的種子'; part = '發芽的種子'; partOther = '沒發芽的種子';
    prompt = `${nm}種了 ${n} 顆種子，有 ${k} 顆發芽。${other ? '沒發芽' : '發芽'}的種子占全部的比率是多少？`;
  }
  const kk = other ? n - k : k;
  const mis = misList(ansFrac, [
    [() => F(n, kk), 'C-base-swap'],
    [() => F(kk, n - kk), 'M-wrong-base'],
    [() => F(n - kk, n), 'C-goal'],
  ]);
  return {
    prompt: `${prompt}（用分數或小數回答）`,
    parts: [numberPart(ansFrac, mis, { allowFraction: true })],
    hints: ['黃色筆點出「誰占誰」。「占」後面的那個是全體，就是分母。', `比率 = 部分 ÷ 全體 = ${kk} ÷ ${n}。`],
    explanation: [
      `第 1 步：全體是${whole}，有 ${n}；部分是${other ? partOther : part}，有 ${other ? `${n} − ${k} = ${kk}` : kk}。`,
      `第 2 步：比率 = ${kk} ÷ ${n} = ${kk}/${n} = ${ansFrac.toFracString()}${ansFrac.decimalPlaces() >= 0 ? ` = ${ansFrac.toDecimalString()}` : ''}。`,
      '第 3 步：檢查：部分比全體少，所以比率要小於 1 ✓',
      `答：${ansFrac.toFracString()}。`,
    ],
    answerText: `${ansFrac.toFracString()}（${ansFrac.toDecimalString()}）`,
    context,
    helper: level === 2 ? helperSpec({
      goal: [`${other ? partOther : part}占全體的比率`, `${other ? part : partOther}占全體的比率`, '全體有多少'],
      known: [String(n), String(k)],
      ops: [other ? `(${n} − ${k}) ÷ ${n}` : `${k} ÷ ${n}`, other ? `${n} ÷ (${n} − ${k})` : `${n} ÷ ${k}`, other ? `${k} ÷ ${n}` : `${k} ÷ (${n} − ${k})`],
    }) : null,
    params: { n, k, other },
    sig: `rm|${n}|${k}|${other}`,
  };
}

// ===========================================================================
// 題型 2：percent-convert 互換
// ===========================================================================
const CONV_DENS = [2, 4, 5, 10, 20, 25, 50];
function percentConvert(level, rng) {
  let p, from, to;   // p：百分率的數字（Frac）
  if (level === 1) {
    p = F(10 * rng.int(1, 9));
    [from, to] = rng.pick([['pct', 'dec'], ['dec', 'pct']]);
  } else if (level === 2) {
    let r;
    do { const d = rng.pick(CONV_DENS); r = F(rng.int(1, d - 1), d); } while (r.d === 1);
    p = r.mul(100);
    [from, to] = rng.pick([['pct', 'frac'], ['frac', 'pct'], ['dec', 'pct']]);
  } else {
    p = rng.pick([F(25, 2), F(75, 2), F(125, 2), F(175, 2), F(125), F(150), F(175), F(120), F(250)]);
    [from, to] = rng.pick([['frac', 'pct'], ['pct', 'dec'], ['dec', 'pct'], ['pct', 'frac']]);
    if (from === 'frac' && !p.div(100).isInt() && p.div(100).d > 8) throw new GenRetry('分數太複雜');
  }
  const r = p.div(100);
  const show = { pct: pctText(p), dec: r.toDecimalString(), frac: r.toFracString() };
  const name = { pct: '百分率', dec: '小數', frac: '最簡分數' };
  const ans = to === 'pct' ? p : r;
  const unit = to === 'pct' ? '%' : null;
  const mis = to === 'pct'
    ? misList(ans, [
      [() => p.div(10), 'K-convert'], [() => p.mul(10), 'K-convert'],
      ...(from === 'frac' ? [[() => (r.n < 10 && r.d < 10 ? F(Number(`${r.n}${r.d}`)) : null), 'K-convert'], [() => F(r.d), 'K-convert']] : []),
    ])
    : misList(ans, [[() => r.mul(10), 'K-convert'], [() => r.div(10), 'K-convert'], [() => p, 'K-convert']]);
  return {
    prompt: `把 ${show[from]} 寫成${name[to]}。`,
    parts: [numberPart(ans, mis, { unit, allowFraction: to === 'frac' })],
    hints: [
      '百分率是「每 100 份中占幾份」。先想：這個數是 100 份中的幾份？',
      '小數 → 百分率：× 100，再加 %。百分率 → 小數：÷ 100。分數 → 百分率：先擴分成分母是 100，或先化成小數。',
    ],
    explanation: [
      from === 'frac'
        ? `第 1 步：${show.frac} = ${show.frac} 化成小數 = ${show.dec}。`
        : `第 1 步：${show[from]} 是「每 100 份中占 ${fmt(p)} 份」。`,
      to === 'pct' ? `第 2 步：${show.dec} × 100% = ${show.pct}。` : to === 'dec' ? `第 2 步：${show.pct} = ${fmt(p)} ÷ 100 = ${show.dec}。` : `第 2 步：${show.pct} = ${fmt(p)}/100 = ${show.frac}（約分）。`,
      `答：${to === 'pct' ? show.pct : to === 'dec' ? show.dec : show.frac}。`,
    ],
    answerText: to === 'pct' ? show.pct : to === 'dec' ? show.dec : show.frac,
    context: `${from}-${to}`,
    params: { p, from, to },
    sig: `pc|${p.toFracString()}|${from}|${to}`,
  };
}

// ===========================================================================
// 題型 3：find-part 求部分量
// ===========================================================================
function findPart(level, rng) {
  const pool = level === 1 ? pctPool(2) : [...pctPool(3), F(25), F(75)].filter((x, i, a) => a.findIndex((y) => y.eq(x)) === i);
  const p = rng.pick(pool);
  const W = wholeFor(rng, p, 10, level === 1 ? 500 : 1200);
  const part = F(W).mul(decOf(p));
  const other = level === 3 && rng.chance(0.4);
  const ans = other ? F(W).sub(part) : part;
  const context = rng.pick(['school', 'save', 'book']);
  const [nm] = pickNames(rng, 1);
  let prompt, unit, what, whole, otherWhat;
  if (context === 'school') {
    unit = '人'; whole = '全校人數';
    what = other ? '沒有搭校車的人' : '搭校車的人'; otherWhat = other ? '搭校車的人' : '沒有搭校車的人';
    prompt = `全校 ${W} 人，${pctText(p)} 的人搭校車上學。${other ? '沒有搭校車的有幾人' : '搭校車的有幾人'}？`;
  } else if (context === 'save') {
    unit = '元'; whole = '全部的錢';
    what = other ? '沒有存的錢' : '存起來的錢'; otherWhat = other ? '存起來的錢' : '沒有存的錢';
    prompt = `${nm}把 ${W} 元的 ${pctText(p)} 存起來。${other ? '沒有存起來的有多少元' : '存了多少元'}？`;
  } else {
    unit = '頁'; whole = '全書頁數';
    what = other ? '還沒讀的頁數' : '讀了的頁數'; otherWhat = other ? '讀了的頁數' : '還沒讀的頁數';
    prompt = `一本書 ${W} 頁，${nm}已經讀了 ${pctText(p)}。${other ? '還剩幾頁沒讀' : '讀了幾頁'}？`;
  }
  const dec = decOf(p);
  const mis = misList(ans, [
    [() => F(W).div(dec), 'C-base-swap'],
    [() => F(W).mul(p), 'M-percent-as-int'],
    [() => (other ? part : F(W).sub(part)), 'C-goal'],
    [() => ans.mul(10), 'K-decimal'],
  ]);
  return {
    prompt,
    parts: [numberPart(ans, mis, { unit })],
    hints: ['用綠色筆點出全體量（「的」前面那個）。題目已經告訴你全體了嗎？', `部分量 = 全體 × 百分率 = ${W} × ${pctText(p)} = ${W} × ${dec.toString()}。`],
    explanation: [
      `第 1 步：全體 = ${W}，百分率 = ${pctText(p)}。`,
      `第 2 步：${pctText(p)} = ${fmt(p)}/100 = ${dec.toString()}。`,
      `第 3 步：部分量 = ${W} × ${dec.toString()} = ${fmt(part)}。`,
      ...(other ? [`第 4 步：題目問的是另一部分：${W} − ${fmt(part)} = ${fmt(ans)}。`] : []),
      `答：${fmt(ans)} ${unit}。`,
    ],
    answerText: `${fmt(ans)} ${unit}`,
    context,
    helper: helperSpec({
      goal: [what, otherWhat, whole],
      known: [String(W), pctText(p)],
      base: null,
      ops: other ? [`${W} × (1 − ${dec.toString()})`, `${W} × ${dec.toString()}`, `${W} ÷ ${dec.toString()}`] : [`${W} × ${dec.toString()}`, `${W} ÷ ${dec.toString()}`, `${W} × ${fmt(p)}`],
    }),
    params: { W, p, other },
    sig: `fp|${W}|${p.toFracString()}|${other}`,
  };
}

// ===========================================================================
// 題型 4：find-rate-whole 求百分率、求全體量
// ===========================================================================
function findRateWhole(level, rng) {
  const kind = level === 2 ? 'rate' : level === 3 ? 'whole' : rng.pick(['whole-other', 'whole']);
  const p = rng.pick(pctPool(3));
  const W = wholeFor(rng, p, 20, 1200);
  const k = F(W).mul(decOf(p));
  const [nm] = pickNames(rng, 1);
  if (kind === 'rate') {
    const ans = p;
    const mis = misList(ans, [[() => F(W).div(k).mul(100), 'C-base-swap'], [() => k, 'M-percent-as-int'], [() => F(100).sub(p), 'C-goal']]);
    return {
      prompt: `參加檢定的有 ${W} 人，合格 ${fmt(k)} 人。合格率是百分之多少？`,
      parts: [numberPart(ans, mis, { unit: '%' })],
      hints: ['這題要求的是「百分率」、「部分」，還是「全體」？用黃色筆點出來。', `百分率 = 部分 ÷ 全體 × 100% = ${fmt(k)} ÷ ${W} × 100%。`],
      explanation: [
        '第 1 步：關係式：全體 × 百分率 = 部分。',
        `第 2 步：已知部分 ${fmt(k)} 人、全體 ${W} 人，要求百分率。`,
        `第 3 步：${fmt(k)} ÷ ${W} = ${decOf(p).toString()} = ${pctText(p)}。`,
        `第 4 步：驗算：${W} × ${pctText(p)} = ${fmt(k)} ✓`,
        `答：${pctText(p)}。`,
      ],
      answerText: pctText(p),
      context: 'exam',
      helper: helperSpec({ goal: ['合格率', '合格的人數', '不合格的人數'], known: [String(W), fmt(k)], ops: [`${fmt(k)} ÷ ${W} × 100%`, `${W} ÷ ${fmt(k)} × 100%`, `${W} − ${fmt(k)}`] }),
      params: { kind, W, p },
      sig: `frw|rate|${W}|${p.toFracString()}`,
    };
  }
  if (kind === 'whole') {
    const ans = F(W);
    const distract = level === 4;
    const extra = distract ? rng.int(2, 9) * 10 : null;
    const mis = misList(ans, [[() => k.mul(decOf(p)), 'C-base-swap'], [() => k.add(p), 'M-percent-as-int'], [() => k.div(p), 'K-decimal'], ...(distract ? [[() => F(extra), 'C-goal']] : [])]);
    const extraLine = distract ? `${nm}每週可以存 ${extra} 元。` : '';
    return {
      prompt: `${nm}想買一台腳踏車，已經存了 ${fmt(k)} 元，是目標金額的 ${pctText(p)}。${extraLine}目標金額是多少元？`,
      parts: [numberPart(ans, mis, { unit: '元' })],
      hints: ['這題要求的是「百分率」、「部分」，還是「全體」？用黃色筆點出來。', `全體 × ${pctText(p)} = ${fmt(k)}，所以全體 = ${fmt(k)} ÷ ${decOf(p).toString()}。`],
      explanation: [
        '第 1 步：關係式：全體 × 百分率 = 部分。',
        `第 2 步：已知部分 ${fmt(k)} 元、百分率 ${pctText(p)}，要求全體（目標金額）。`,
        `第 3 步：全體 = ${fmt(k)} ÷ ${decOf(p).toString()} = ${W}。`,
        `第 4 步：驗算：${W} × ${pctText(p)} = ${fmt(k)} ✓`,
        `答：${W} 元。`,
      ],
      answerText: `${W} 元`,
      context: 'goal',
      helper: helperSpec({ goal: ['目標金額', '已經存的錢', '還差多少錢'], known: [fmt(k), pctText(p)], ops: [`${fmt(k)} ÷ ${decOf(p).toString()}`, `${fmt(k)} × ${decOf(p).toString()}`, `${fmt(k)} + ${fmt(p)}`] }),
      params: { kind, W, p, extra },
      sig: `frw|whole|${W}|${p.toFracString()}`,
    };
  }
  // whole-other：蘋果樹占 p%，其他的樹有 m 棵
  const m = F(W).sub(k);
  const ans = F(W);
  const mis = misList(ans, [[() => m.div(decOf(p)), 'M-wrong-base'], [() => m.mul(F(1).sub(decOf(p))), 'C-base-swap'], [() => m.add(m.mul(decOf(p))), 'M-wrong-base']]);
  return {
    prompt: `果園裡的蘋果樹占全部的 ${pctText(p)}，其他的樹有 ${fmt(m)} 棵。果園共有幾棵樹？`,
    parts: [numberPart(ans, mis, { unit: '棵' })],
    hints: ['用黃色筆點出要求什麼。其他的樹占全部的百分之多少？', `其他的樹占 100% − ${pctText(p)} = ${pctText(F(100).sub(p))}。全體 = ${fmt(m)} ÷ ${decOf(F(100).sub(p)).toString()}。`],
    explanation: [
      `第 1 步：蘋果樹占 ${pctText(p)}，其他的樹占 100% − ${pctText(p)} = ${pctText(F(100).sub(p))}。`,
      `第 2 步：全部 × ${pctText(F(100).sub(p))} = ${fmt(m)}。`,
      `第 3 步：全部 = ${fmt(m)} ÷ ${decOf(F(100).sub(p)).toString()} = ${W}。`,
      `第 4 步：驗算：${W} × ${pctText(p)} = ${fmt(k)}，${fmt(k)} + ${fmt(m)} = ${W} ✓`,
      `答：${W} 棵。`,
    ],
    answerText: `${W} 棵`,
    context: 'orchard',
    helper: helperSpec({ goal: ['果園全部的樹', '蘋果樹的棵數', '其他的樹的棵數'], known: [pctText(p), fmt(m)], ops: [`${fmt(m)} ÷ (1 − ${decOf(p).toString()})`, `${fmt(m)} ÷ ${decOf(p).toString()}`, `${fmt(m)} × ${decOf(p).toString()}`] }),
    params: { kind, W, p },
    sig: `frw|other|${W}|${p.toFracString()}`,
  };
}

// ===========================================================================
// 題型 5：discount 打折
// ===========================================================================
function discount(level, rng) {
  const kind = level === 2 ? rng.pick(['sale-price', 'saving'])
    : level === 3 ? rng.pick(['original', 'saving'])
      : level === 4 ? rng.pick(['compare', 'algebra'])
        : 'coupon';
  const zheList = level === 2 ? [90, 80, 70, 50] : [90, 80, 70, 50, 85, 75, 95, 65];
  const z = rng.pick(zheList);
  const dec = F(z, 100);
  const pick = () => { const base = 100 / gcd(z, 100); const m = Math.max(20, base * 20 / gcd(base, 20)); return pickMultipleRange(rng, m, 100, 5000); };
  const [nm] = pickNames(rng, 1);
  if (kind === 'sale-price' || kind === 'saving' || kind === 'original') {
    const P = pick();
    const S = dec.mul(P);
    const off = F(P).sub(S);
    const wrongZ = ZHE_WRONG[z] ? F(ZHE_WRONG[z], 100) : null;
    let prompt, ans, mis, ops, goal;
    if (kind === 'sale-price') {
      ans = S;
      prompt = `一雙球鞋原價 ${P} 元，週年慶打${ZHE[z]}。打折後要付多少元？`;
      mis = misList(ans, [[() => off, 'M-off-part'], [() => (wrongZ ? wrongZ.mul(P) : null), 'M-discount-meaning'], [() => F(P - z), 'M-percent-as-int'], [() => F(P).mul(F(z, 10)), 'K-decimal']]);
      ops = [`${P} × ${dec.toString()}`, `${P} × (1 − ${dec.toString()})`, `${P} − ${z}`];
      goal = ['打折後要付的錢', '便宜的錢', '原價'];
    } else if (kind === 'saving') {
      ans = off;
      prompt = `一個書包原價 ${P} 元，打${ZHE[z]}出售。比原價便宜多少元？`;
      mis = misList(ans, [[() => S, 'M-off-part'], [() => (wrongZ ? F(P).sub(wrongZ.mul(P)) : null), 'M-discount-meaning'], [() => F(z), 'M-percent-as-int'], [() => F(P).mul(dec), 'C-goal']]);
      ops = [`${P} × (1 − ${dec.toString()})`, `${P} × ${dec.toString()}`, `${P} − ${z}`];
      goal = ['便宜了多少錢', '打折後要付的錢', '原價'];
    } else {
      ans = F(P);
      prompt = `二手書店裡，一套書打${ZHE[z]}後賣 ${fmt(S)} 元。原價是多少元？`;
      mis = misList(ans, [[() => S.mul(dec), 'C-base-swap'], [() => S.mul(F(1).add(F(1).sub(dec))), 'M-wrong-base'], [() => S.add(z), 'M-percent-as-int'], [() => S.div(dec).div(10), 'K-decimal']]);
      ops = [`${fmt(S)} ÷ ${dec.toString()}`, `${fmt(S)} × ${dec.toString()}`, `${fmt(S)} + ${z}`];
      goal = ['原價', '打折後的價錢', '便宜的錢'];
    }
    return {
      prompt,
      parts: [numberPart(ans, mis, { unit: '元' })],
      hints: ['「打八折」是付原價的 80%，不是便宜 80%。題目問的是「要付多少」、「便宜多少」，還是「原價」？', '售價 = 原價 × 折數（八折 = 0.8、七五折 = 0.75）。已知售價求原價：原價 = 售價 ÷ 折數。便宜的錢 = 原價 × (1 − 折數)。'],
      explanation: [
        `第 1 步：${ZHE[z]} = 付原價的 ${z}% = ${dec.toString()}。`,
        kind === 'sale-price' ? `第 2 步：售價 = ${P} × ${dec.toString()} = ${fmt(S)}。`
          : kind === 'saving' ? `第 2 步：便宜的錢 = ${P} × (1 − ${dec.toString()}) = ${P} × ${F(1).sub(dec).toString()} = ${fmt(off)}。`
            : `第 2 步：原價 × ${dec.toString()} = ${fmt(S)}，所以原價 = ${fmt(S)} ÷ ${dec.toString()} = ${P}。`,
        `第 3 步：合理嗎？打折後一定比原價便宜：${fmt(S)} < ${P} ✓`,
        `答：${fmt(ans)} 元。`,
      ],
      answerText: `${fmt(ans)} 元`,
      context: kind,
      helper: helperSpec({ goal, known: kind === 'original' ? [fmt(S)] : [String(P)], ops }),
      params: { kind, P, z },
      sig: `dc|${kind}|${P}|${z}`,
    };
  }
  if (kind === 'compare') {
    let P1, S1, P2, S2, z1, z2;
    for (let i = 0; i < 50; i++) {
      z1 = rng.pick(zheList); z2 = rng.pick(zheList);
      if (z1 === z2) continue;
      P1 = pickMultipleRange(rng, 100, 200, 3000); P2 = pickMultipleRange(rng, 100, 200, 3000);
      S1 = F(P1 * z1, 100); S2 = F(P2 * z2, 100);
      const off1 = P1 - S1.toNumber(), off2 = P2 - S2.toNumber();
      // 讓「便宜的金額」和「折扣比率」指向不同的答案，才能偵測迷思
      if (S1.isInt() && S2.isInt() && (off1 > off2) !== (z1 < z2)) break;
      z1 = null;
    }
    if (!z1) throw new GenRetry('compare');
    const better = z1 < z2 ? 'c0' : 'c1';
    const opts = [{ id: 'c0', label: '甲' }, { id: 'c1', label: '乙' }, { id: 'c2', label: '一樣多' }, { id: 'c3', label: '無法比較' }];
    return {
      prompt: `甲商品原價 ${P1} 元，特價 ${fmt(S1)} 元；乙商品原價 ${P2} 元，特價 ${fmt(S2)} 元。哪一件的折扣比較多（比原價便宜的比率比較大）？`,
      parts: [{ id: 'a', kind: 'choice', options: opts, answer: better, misconceptions: choiceMis(better, [[better === 'c0' ? 'c1' : 'c0', 'M-wrong-base']]) }],
      hints: ['要比的是「便宜的比率」，不是便宜幾元。先算每一件的售價是原價的百分之多少。', `甲：${fmt(S1)} ÷ ${P1}；乙：${fmt(S2)} ÷ ${P2}。售價占原價的比率越小，折扣越多。`],
      explanation: [
        `第 1 步：甲：${fmt(S1)} ÷ ${P1} = ${F(z1, 100).toString()} → 打${ZHE[z1]}。`,
        `第 2 步：乙：${fmt(S2)} ÷ ${P2} = ${F(z2, 100).toString()} → 打${ZHE[z2]}。`,
        `第 3 步：${ZHE[Math.min(z1, z2)]}付得比較少 → ${better === 'c0' ? '甲' : '乙'}的折扣比較多。（只比便宜幾元會被原價騙喔！）`,
        `答：${better === 'c0' ? '甲' : '乙'}。`,
      ],
      answerText: better === 'c0' ? '甲' : '乙',
      context: 'compare',
      helper: helperSpec({
        goal: ['哪一件的折扣比較多（便宜的比率）', '哪一件便宜的錢比較多', '哪一件的特價比較低'],
        known: [String(P1), fmt(S1), String(P2), fmt(S2)],
        ops: [`比較 ${fmt(S1)} ÷ ${P1} 和 ${fmt(S2)} ÷ ${P2}`, `比較 ${P1} − ${fmt(S1)} 和 ${P2} − ${fmt(S2)}`, `比較 ${fmt(S1)} 和 ${fmt(S2)}`],
      }),
      params: { kind, P1, P2, z1, z2 },
      sig: `dcc|${P1}|${z1}|${P2}|${z2}`,
    };
  }
  if (kind === 'algebra') {
    const zz = rng.pick([75, 80, 50, 60]);
    const d = F(zz, 100);                 // 售價 = 原價 × d → 便宜 = 售價 × (1 − d) / d
    const off = F(1).sub(d).div(d);
    const opts = [
      { id: 'x0', label: `x 的 ${off.toFracString()}` },
      { id: 'x1', label: `x 的 ${F(1).sub(d).toFracString()}` },
      { id: 'x2', label: `x 的 ${d.toFracString()}` },
      { id: 'x3', label: `x 的 ${d.inv().toFracString()}` },
    ].filter((o, i, a) => a.findIndex((y) => y.label === o.label) === i);
    return {
      prompt: `電影早場的票價是原價打${ZHE[zz]}。如果早場票價是 x 元，早場比原價便宜多少元？`,
      parts: [{ id: 'a', kind: 'choice', options: opts, answer: 'x0', shuffle: true, misconceptions: choiceMis('x0', [['x1', 'M-wrong-base'], ['x2', 'M-off-part'], ['x3', 'C-goal']]) }],
      hints: ['x 是早場票價，不是原價。先用 x 表示原價。', `原價 × ${d.toString()} = x → 原價 = x ÷ ${d.toString()}。便宜的錢 = 原價 − x。`],
      explanation: [
        `第 1 步：原價 × ${d.toFracString()} = x，所以原價 = x ÷ ${d.toFracString()} = x 的 ${d.inv().toFracString()}。`,
        `第 2 步：便宜的錢 = 原價 − x = x 的 ${d.inv().toFracString()} − x = x 的 ${off.toFracString()}。`,
        `答：x 的 ${off.toFracString()}。`,
      ],
      answerText: `x 的 ${off.toFracString()}`,
      context: 'algebra',
      // 題目裡沒有任何數字（「八折」是國字、x 是未知數），② 圈已知無法進行，所以這一題不開讀題小幫手
      noHelperReason: '題目沒有數字可以圈，選項本身就是算式',
      params: { kind, z: zz },
      sig: `dca|${zz}`,
    };
  }
  // coupon（Level 5）：打折後再用折價券
  const P = pick();
  const S = dec.mul(P);
  const coupon = rng.pick([50, 100, 150, 200]);
  if (S.toNumber() <= coupon + 10) throw new GenRetry('折價券太大');
  const ans = S.sub(coupon);
  const mis = misList(ans, [[() => F(P - coupon).mul(dec), 'C-step-missed'], [() => S, 'C-step-missed'], [() => F(P).sub(S).add(coupon), 'M-off-part'], [() => F(P - coupon - z), 'M-percent-as-int']]);
  return {
    prompt: `一台電風扇原價 ${P} 元，先打${ZHE[z]}，結帳時再用一張 ${coupon} 元的折價券。最後要付多少元？`,
    parts: [numberPart(ans, mis, { unit: '元' })],
    hints: ['先打折，還是先扣折價券？照題目的順序一步一步來。', `先算打折後：${P} × ${dec.toString()}，再減 ${coupon}。`],
    explanation: [
      `第 1 步：打${ZHE[z]}：${P} × ${dec.toString()} = ${fmt(S)}。`,
      `第 2 步：再用折價券：${fmt(S)} − ${coupon} = ${fmt(ans)}。`,
      `答：${fmt(ans)} 元。`,
    ],
    answerText: `${fmt(ans)} 元`,
    context: 'coupon',
    helper: helperSpec({ goal: ['最後要付的錢', '打折後的價錢', '總共便宜的錢'], known: [String(P), String(coupon)], ops: [`${P} × ${dec.toString()} − ${coupon}`, `(${P} − ${coupon}) × ${dec.toString()}`, `${P} − ${coupon} − ${z}`] }),
    params: { kind, P, z, coupon },
    sig: `dcp|${P}|${z}|${coupon}`,
  };
}

function pickMultipleRange(rng, m, lo, hi) {
  const kLo = Math.ceil(lo / m), kHi = Math.floor(hi / m);
  if (kHi < kLo) throw new GenRetry('範圍');
  return rng.int(kLo, kHi) * m;
}

// ===========================================================================
// 題型 6：change-rate 漲跌幅
// ===========================================================================
function changeRate(level, rng) {
  const kind = level === 2 ? 'after' : level === 3 ? 'rate' : rng.pick(['before', 'rate-big']);
  const up = kind === 'rate-big' ? true : rng.chance(0.6);
  let p;
  if (kind === 'after') p = F(10 * rng.int(1, 9));
  else if (kind === 'rate') p = rng.pick([...pctPool(3), F(25, 2), F(75, 2), F(125, 2)]);
  else if (kind === 'rate-big') p = F(rng.pick([120, 140, 150, 160, 200, 250]));
  else p = rng.pick(pctPool(3));
  if (!up && p.toNumber() >= 100) throw new GenRetry('跌幅');
  const a = kind === 'before' ? wholeFor(rng, p, 100, 20000) : wholeFor(rng, p, 20, 200);
  const factor = up ? F(1).add(decOf(p)) : F(1).sub(decOf(p));
  const b = factor.mul(a);
  const diff = b.sub(a).abs();
  const [nm] = pickNames(rng, 1);
  const word = up ? '漲' : '跌';
  if (kind === 'after') {
    const ans = b;
    const mis = misList(ans, [[() => F(a).mul(decOf(p)), 'C-goal'], [() => F(a).div(factor), 'C-base-swap'], [() => F(a).add(up ? p : p.neg()), 'M-percent-as-int']]);
    return {
      prompt: `一盒草莓原本賣 ${a} 元，現在${up ? '漲價' : '降價'} ${pctText(p)}。現在一盒賣多少元？`,
      parts: [numberPart(ans, mis, { unit: '元' })],
      hints: ['漲幅、跌幅都是「跟原來比」。用綠色筆點出原來的量。', `現在 = 原來 × (1 ${up ? '+' : '−'} ${decOf(p).toString()})。`],
      explanation: [
        `第 1 步：原量 = ${a}（基準），${word}了 ${pctText(p)}。`,
        `第 2 步：變化量 = ${a} × ${decOf(p).toString()} = ${fmt(diff)}。`,
        `第 3 步：現在 = ${a} ${up ? '+' : '−'} ${fmt(diff)} = ${fmt(b)}。`,
        `答：${fmt(b)} 元。`,
      ],
      answerText: `${fmt(b)} 元`,
      context: 'after',
      helper: helperSpec({ goal: ['現在的價錢', `${word}了多少元`, '原本的價錢'], known: [String(a), pctText(p)], ops: [`${a} × (1 ${up ? '+' : '−'} ${decOf(p).toString()})`, `${a} × ${decOf(p).toString()}`, `${a} ${up ? '+' : '−'} ${fmt(p)}`] }),
      params: { kind, a, p, up },
      sig: `cr|after|${a}|${p.toFracString()}|${up}`,
    };
  }
  if (kind === 'rate' || kind === 'rate-big') {
    const ans = p;
    const diffExpr = up ? `(${fmt(b)} − ${a})` : `(${a} − ${fmt(b)})`;
    const mis = misList(ans, [[() => diff.div(b).mul(100), 'M-wrong-base'], [() => b.div(a).mul(100), 'C-goal'], [() => diff, 'M-percent-as-int']]);
    return {
      prompt: `一顆高麗菜從 ${a} 元${up ? '漲到' : '跌到'} ${fmt(b)} 元。${up ? '漲幅' : '跌幅'}是百分之多少？`,
      parts: [numberPart(ans, mis, { unit: '%' })],
      hints: ['漲幅、跌幅都是「跟原來比」。用綠色筆點出原來的量。', `漲跌幅 = 變化量 ÷ 原量。先算變化了多少：${fmt(b)} 和 ${a} 相差 ${fmt(diff)}。`],
      explanation: [
        `第 1 步：原量 = ${a}（基準），新量 = ${fmt(b)}。`,
        `第 2 步：變化量 = ${fmt(diff)}。`,
        `第 3 步：${up ? '漲幅' : '跌幅'} = ${fmt(diff)} ÷ ${a} = ${decOf(p).toString()} = ${pctText(p)}。`,
        `第 4 步：驗算：${a} × (1 ${up ? '+' : '−'} ${decOf(p).toString()}) = ${fmt(b)} ✓`,
        `答：${pctText(p)}。`,
      ],
      answerText: pctText(p),
      context: 'rate',
      helper: helperSpec({ goal: [up ? '漲幅（百分率）' : '跌幅（百分率）', `${word}了多少元`, '現在的價錢'], known: [String(a), fmt(b)], ops: [`${diffExpr} ÷ ${a} × 100%`, `${diffExpr} ÷ ${fmt(b)} × 100%`, `${fmt(b)} ÷ ${a} × 100%`] }),
      params: { kind, a, p, up },
      sig: `cr|rate|${a}|${p.toFracString()}|${up}`,
    };
  }
  // before
  const ans = F(a);
  const mis = misList(ans, [[() => b.mul(factor), 'C-base-swap'], [() => (up ? b.mul(F(1).sub(decOf(p))) : b.mul(F(1).add(decOf(p)))), 'M-wrong-base']]);
  return {
    prompt: `學校網站本月的瀏覽人次比上月${up ? '多' : '少'}了 ${pctText(p)}，本月是 ${fmt(b)} 人次。上月是多少人次？`,
    parts: [numberPart(ans, mis, { unit: '人次' })],
    hints: ['「比上月多（少）」，基準是上月。這題要求的就是基準。', `上月 × (1 ${up ? '+' : '−'} ${decOf(p).toString()}) = ${fmt(b)}，所以上月 = ${fmt(b)} ÷ ${factor.toString()}。`],
    explanation: [
      `第 1 步：基準是上月。本月 = 上月 × (1 ${up ? '+' : '−'} ${decOf(p).toString()}) = 上月 × ${factor.toString()}。`,
      `第 2 步：上月 = ${fmt(b)} ÷ ${factor.toString()} = ${a}。`,
      `第 3 步：驗算：${a} × ${factor.toString()} = ${fmt(b)} ✓`,
      `答：${a} 人次。`,
    ],
    answerText: `${a} 人次`,
    context: 'before',
    helper: helperSpec({ goal: ['上月的人次', '本月的人次', `${up ? '多' : '少'}了多少人次`], known: [pctText(p), fmt(b)], ops: [`${fmt(b)} ÷ ${factor.toString()}`, `${fmt(b)} × ${factor.toString()}`, `${fmt(b)} × ${decOf(p).toString()}`] }),
    params: { kind, a, p, up },
    sig: `cr|before|${a}|${p.toFracString()}|${up}`,
  };
}

// ===========================================================================
// 題型 7：markup-profit（contest-extension）
// ===========================================================================
function markupProfit(level, rng) {
  const C = 100 * rng.int(1, 30);
  const m = F(5 * rng.int(2, 12));                  // 10%–60%
  const z = rng.pick([90, 80, 75]);
  const L = F(C).mul(F(1).add(decOf(m)));
  const S = L.mul(F(z, 100));
  if (!L.isInt() || !S.isInt()) throw new GenRetry('不是整數元');
  const profit = S.sub(C);
  const [nm] = pickNames(rng, 1);
  if (profit.n === 0) throw new GenRetry('不賺不賠');
  const gain = profit.n > 0;
  const ans = profit.abs();
  const mis = misList(ans, [[() => L, 'C-goal'], [() => F(C).mul(decOf(m)), 'C-step-missed'], [() => F(C).mul(decOf(m).sub(F(100 - z, 100))).abs(), 'M-successive-add'], [() => S, 'C-goal']]);
  return {
    prompt: `${nm}的文具店以成本 ${C} 元進一台計算機，加 ${pctText(m)} 定價，後來打${ZHE[z]}賣出。這樣賣出是賺還是賠？${gain ? '賺' : '賠'}了多少元？`,
    parts: [numberPart(ans, mis, { unit: '元', label: gain ? '賺了' : '賠了' })],
    hints: ['先找出成本、定價、售價三個價錢分別是多少。', `一步一步算：成本 → 定價（× (1 + ${decOf(m).toString()})）→ 售價（× ${F(z, 100).toString()}）→ 售價 − 成本。`],
    explanation: [
      `第 1 步：定價 = ${C} × (1 + ${decOf(m).toString()}) = ${fmt(L)} 元。`,
      `第 2 步：售價 = ${fmt(L)} × ${F(z, 100).toString()} = ${fmt(S)} 元。`,
      `第 3 步：售價 − 成本 = ${fmt(S)} − ${C} = ${fmt(profit)} → ${gain ? '賺' : '賠'} ${fmt(ans)} 元。`,
      '注意：加成和打折的基準不一樣，不能直接相減。',
      `答：${gain ? '賺' : '賠'} ${fmt(ans)} 元。`,
    ],
    answerText: `${gain ? '賺' : '賠'} ${fmt(ans)} 元`,
    context: 'shop',
    helper: helperSpec({ goal: [`${gain ? '賺' : '賠'}了多少元`, '定價', '售價'], known: [String(C), pctText(m)], ops: [`${C} × (1 + ${decOf(m).toString()}) × ${F(z, 100).toString()} − ${C}`, `${C} × ${decOf(m).toString()}`, `${C} × (${decOf(m).toString()} − ${F(100 - z, 100).toString()})`] }),
    params: { C, m, z },
    sig: `mp|${C}|${m.toFracString()}|${z}`,
  };
}

// ===========================================================================
// 題型 8：successive-change（contest-extension）
// ===========================================================================
function successiveChange(level, rng) {
  if (level >= 4 && rng.chance(0.4)) {
    const pairs = [[20, 25], [50, 100], [25, F(100, 3)], [10, F(100, 9)], [40, F(200, 3)], [60, 150], [75, 300], [80, 400]].filter(([, u]) => Frac.of(u).isInt());
    const [d, u] = rng.pick(pairs);
    const ans = F(u);
    const opts = [`${u}%`, `${d}%`, `${100 - d}%`, `${100 + d}%`].filter((x, i, a) => a.indexOf(x) === i);
    const options = opts.map((label, i) => ({ id: `s${i}`, label }));
    return {
      prompt: `一件衣服降價 ${d}% 後，要再漲價百分之多少，才會回到原價？`,
      parts: [{ id: 'a', kind: 'choice', options, answer: 's0', shuffle: true, misconceptions: choiceMis('s0', [['s1', 'M-successive-add'], ['s2', 'M-wrong-base'], ['s3', 'M-wrong-base']]) }],
      hints: ['第二次變化的「全體」是誰？是原價，還是降價後的新價？', `把原價想成 100 元：降 ${d}% 後是 ${100 - d} 元。從 ${100 - d} 元回到 100 元，要漲幾元？這些錢占 ${100 - d} 元的百分之多少？`],
      explanation: [
        `第 1 步：把原價想成 100 元，降 ${d}% 後是 ${100 - d} 元。`,
        `第 2 步：要回到 100 元，要漲 ${d} 元。`,
        `第 3 步：漲幅的基準是 ${100 - d} 元：${d} ÷ ${100 - d} = ${F(d, 100 - d).toString()} = ${u}%。`,
        `答：${u}%。`,
      ],
      answerText: `${u}%`,
      context: 'back',
      helper: helperSpec({
        goal: ['要再漲價百分之多少', '降價後是原價的百分之多少', '降了多少錢'],
        known: [`${d}%`],
        ops: [`${d} ÷ (100 − ${d}) × 100%`, `${d}%`, `${d} ÷ 100 × 100%`],
      }),
      params: { variant: 'back', d, u },
      sig: `sc|back|${d}`,
    };
  }
  const W = 100 * rng.int(level === 3 ? 1 : 10, level === 3 ? 50 : 300);
  const steps = level === 5 && rng.chance(0.5) ? 3 : 2;
  const changes = [];
  for (let i = 0; i < steps; i++) changes.push({ up: i === 0 ? true : rng.chance(0.4), p: 5 * rng.int(1, 8) });
  let v = F(W);
  const vals = [];
  for (const c of changes) { v = v.mul(F(1).add(F(c.up ? c.p : -c.p, 100))); vals.push(v); }
  if (!v.isInt() || vals.some((x) => !x.isInt())) throw new GenRetry('不是整數');
  const ans = v;
  const sumPct = changes.reduce((s, c) => s + (c.up ? c.p : -c.p), 0);
  const mis = misList(ans, [[() => F(W), 'M-successive-add'], [() => F(W).mul(F(100 + sumPct, 100)), 'M-successive-add'], [() => vals[0], 'C-step-missed'], [() => ans.div(10), 'K-decimal']]);
  const [nm] = pickNames(rng, 1);
  const desc = changes.map((c, i) => `${['一月起', '三月又', '五月再'][i]}${c.up ? '增加' : '減少'} ${c.p}%`).join('，');
  return {
    prompt: `${nm}每月的零用錢原本是 ${W} 元。${desc}。最後每月的零用錢是多少元？`,
    parts: [numberPart(ans, mis, { unit: '元' })],
    hints: ['第二次變化的「全體」是誰？是原來的錢，還是第一次變化後的錢？', '每一次的百分率都要乘在「上一次變化後」的錢上，一步一步算。'],
    explanation: [
      ...changes.map((c, i) => `第 ${i + 1} 步：${i === 0 ? W : fmt(vals[i - 1])} × (1 ${c.up ? '+' : '−'} ${F(c.p, 100).toString()}) = ${fmt(vals[i])}。`),
      `注意：第二次的基準是 ${fmt(vals[0])}，不是 ${W}，所以不能直接把百分率相加。`,
      `答：${fmt(ans)} 元。`,
    ],
    answerText: `${fmt(ans)} 元`,
    context: 'allowance',
    helper: helperSpec({ goal: ['最後的零用錢', '第一次變化後的零用錢', '原本的零用錢'], known: [String(W), ...changes.map((c) => `${c.p}%`)], ops: [changes.reduce((s, c) => `${s} × (1 ${c.up ? '+' : '−'} ${F(c.p, 100).toString()})`, String(W)), `${W} × (1 ${sumPct >= 0 ? '+' : '−'} ${F(Math.abs(sumPct), 100).toString()})`, String(W)] }),
    params: { variant: 'steps', W, changes },
    sig: `sc|${W}|${changes.map((c) => `${c.up ? '+' : '-'}${c.p}`).join(',')}`,
  };
}

export default {
  unitId: UNIT_ID,
  types: {
    'rate-meaning': { levels: [1, 2], isWordProblem: false, generate: rateMeaning },
    'percent-convert': { levels: [1, 2, 3], isWordProblem: false, generate: percentConvert },
    'find-part': { levels: [1, 2, 3], isWordProblem: true, generate: findPart },
    'find-rate-whole': { levels: [2, 3, 4], isWordProblem: true, generate: findRateWhole },
    discount: { levels: [2, 3, 4, 5], isWordProblem: true, generate: discount },
    'change-rate': { levels: [2, 3, 4], isWordProblem: true, generate: changeRate },
    'markup-profit': { levels: [3, 4, 5], isWordProblem: true, generate: markupProfit },
    'successive-change': { levels: [3, 4, 5], isWordProblem: true, generate: successiveChange },
  },
};
