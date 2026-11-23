// 產生器：g6-ratio 比與比值（翰林 6上-第4單元）
// 規格：projects/math-quest/curriculum/specs/g6-ratio.md
// 只實作 textbook 題型；contest-extension 的 direct-proportion、balance-substitution 之後再做。
// 比的作答：兩格數字（前項 : 後項）。
import { Frac, F, gcd, lcm } from '../core/frac.js';
import { pickNames, fmt, fmtMixed, misList, choiceMis, numberPart, helperSpec, GenRetry } from './common.js';

const UNIT_ID = 'g6-ratio';

function coprimePair(rng, lo, hi, { distinct = true } = {}) {
  for (let i = 0; i < 60; i++) {
    const a = rng.int(lo, hi), b = rng.int(lo, hi);
    if (distinct && a === b) continue;
    if (gcd(a, b) === 1) return [a, b];
  }
  throw new GenRetry('找不到互質的比');
}

/** 比的兩格作答 */
function ratioParts(x, y, misA, misB, unit = null) {
  return [
    numberPart(F(x), misList(F(x), misA), { id: 'a', label: '前項', ratioPair: true, unit }),
    numberPart(F(y), misList(F(y), misB), { id: 'b', label: '後項', ratioPair: true, unit }),
  ];
}

// ===========================================================================
// 題型 1：ratio-read-write 依題意寫出比
// ===========================================================================
function ratioReadWrite(level, rng) {
  if (level === 1) {
    let x, y;
    do { x = rng.int(1, 12); y = rng.int(1, 12); } while (x === y);
    const [A, B] = rng.shuffle([['蘋果', '顆'], ['橘子', '顆']]);
    const prompt = `籃子裡有 ${x} 顆${A[0]}、${y} 顆${B[0]}。${A[0]}和${B[0]}的比是多少？`;
    return build({ prompt, X: A[0], Y: B[0], x, y, context: 'fruit', partWhole: false, reversed: false });
  }
  const variant = rng.pick(['reverse', 'part-whole', 'paint']);
  if (variant === 'part-whole') {
    const m = rng.int(8, 20), f = rng.int(8, 20);
    const askBoys = rng.chance(0.5);
    const [who, part] = askBoys ? ['男生', m] : ['女生', f];
    const prompt = `六年三班有男生 ${m} 人、女生 ${f} 人。${who}人數和全班人數的比是多少？`;
    return build({ prompt, X: `${who}人數`, Y: '全班人數', x: part, y: m + f, other: askBoys ? f : m, context: 'class', partWhole: true, reversed: false });
  }
  if (variant === 'paint') {
    let a, b; do { a = rng.int(1, 12); b = rng.int(1, 12); } while (a === b);
    const [n] = pickNames(rng, 1);
    const prompt = `${n}調顏料，用了 ${a} 匙藍色、${b} 匙白色。白色和藍色的比是多少？`;
    return build({ prompt, X: '白色', Y: '藍色', x: b, y: a, context: 'paint', partWhole: false, reversed: true });
  }
  let f, m; do { f = rng.int(8, 20); m = rng.int(8, 20); } while (f === m);
  const prompt = `社團裡有女生 ${f} 人、男生 ${m} 人。男生和女生的比是多少？`;
  return build({ prompt, X: '男生', Y: '女生', x: m, y: f, context: 'club', partWhole: false, reversed: true });

  function build({ prompt, X, Y, x, y, other = null, context, partWhole, reversed }) {
    const parts = ratioParts(x, y,
      [[() => F(y), 'C-order'], ...(partWhole ? [[() => F(other), 'C-goal']] : [])],
      [[() => F(x), 'C-order'], ...(partWhole ? [[() => F(other), 'C-goal']] : [])]);
    return {
      prompt,
      parts,
      hints: [
        '用黃色筆點出「＿＿和＿＿的比」。先出現的那個寫在「:」前面。',
        `「${X}和${Y}的比」→ ${X}的數量 : ${Y}的數量 = ${x} : ${y}。`,
      ],
      explanation: [
        `第 1 步：題目問的是「${X}和${Y}的比」。`,
        partWhole
          ? `第 2 步：${X}有 ${x}，${Y} = ${x} + ${other} = ${y}。`
          : `第 2 步：${X}有 ${x}，${Y}有 ${y}。`,
        `第 3 步：照順序寫：${x} : ${y}。`,
        `注意：${y} : ${x} 是不同的比喔！`,
      ],
      answerText: `${x} : ${y}`,
      context,
      params: { x, y, partWhole, reversed, other },
      sig: `rw|${context}|${x}|${y}`,
    };
  }
}

// ===========================================================================
// 題型 2：equal-ratio-unknown 相等的比求未知項
// ===========================================================================
function equalRatioUnknown(level, rng) {
  const [a, b] = coprimePair(rng, 1, 9);
  let k;
  if (level === 1) k = rng.int(2, 6);
  else {
    const kMax = Math.floor((level === 2 ? 100 : 500) / Math.max(a, b));
    if (kMax < 2) throw new GenRetry('k 太小');
    k = rng.int(2, Math.min(kMax, level === 2 ? 20 : 60));
  }
  const p1 = [a, b], p2 = [a * k, b * k];
  let pair, pos;                                       // 未知項：pair 0/1，pos 0/1
  if (level === 1) { pair = 1; pos = 1; }
  else if (level === 2) {
    if (rng.chance(0.5)) { [pair, pos] = [rng.int(0, 1), rng.int(0, 1)]; }
    else { pair = 1; pos = rng.int(0, 1); }              // 除法版本：大的比寫在前面
  } else { pair = 1; pos = rng.int(0, 1); }
  const bigFirst = level === 2 && rng.chance(0.5);
  const [L, R] = bigFirst ? [p2, p1] : [p1, p2];
  const unknownPair = bigFirst ? 1 - pair : pair;
  const pairs = [L.slice(), R.slice()];
  const ans = F(pairs[unknownPair][pos]);
  const knownPair = pairs[1 - unknownPair];
  const same = pairs[unknownPair][1 - pos];
  const o = 1 - pos;
  // 正解 = same × knownPair[pos] / knownPair[o]
  const mis = misList(ans, [
    [() => F(same + (knownPair[pos] - knownPair[o])), 'M-ratio-additive'],
    [() => F(same - (knownPair[o] - knownPair[pos])), 'M-ratio-additive'],
    [() => F(same * knownPair[o], knownPair[pos]), 'C-base-swap'],
  ]);
  const show = (p, i) => (p === unknownPair && i === pos ? '□' : String(pairs[p][i]));
  const eq = `${show(0, 0)} : ${show(0, 1)} = ${show(1, 0)} : ${show(1, 1)}`;
  let prompt, unit = null, context = 'calc', helper = null;
  if (level === 3) {
    const [n] = pickNames(rng, 1);
    if (rng.chance(0.5)) {
      context = 'recipe'; unit = '毫升';
      const flour = pairs[1][0], milk = pairs[1][1];
      prompt = pos === 1
        ? `做鬆餅時，麵粉和牛奶的比是 ${a} : ${b}。${n}用了 ${flour} 公克麵粉，要用多少毫升牛奶？`
        : `做鬆餅時，麵粉和牛奶的比是 ${a} : ${b}。${n}用了 ${milk} 毫升牛奶，要用多少公克麵粉？`;
      if (pos === 0) unit = '公克';
      const given = pos === 1 ? flour : milk;
      helper = helperSpec({
        goal: pos === 1 ? ['要用的牛奶', '要用的麵粉', '麵粉和牛奶的比'] : ['要用的麵粉', '要用的牛奶', '麵粉和牛奶的比'],
        known: [String(a), String(b), String(given)],
        ops: [`${given} ÷ ${pos === 1 ? a : b} × ${pos === 1 ? b : a}`, `${given} ÷ ${pos === 1 ? b : a} × ${pos === 1 ? a : b}`, `${given} + ${Math.abs(b - a)}`],
      });
    } else {
      context = 'photo'; unit = '公分';
      const len = pairs[1][0], wid = pairs[1][1];
      prompt = pos === 0
        ? `一張照片長和寬的比是 ${a} : ${b}，放大後寬是 ${wid} 公分，長是多少公分？`
        : `一張照片長和寬的比是 ${a} : ${b}，放大後長是 ${len} 公分，寬是多少公分？`;
      const given = pos === 0 ? wid : len;
      helper = helperSpec({
        goal: pos === 0 ? ['放大後的長', '放大後的寬', '長和寬的比'] : ['放大後的寬', '放大後的長', '長和寬的比'],
        known: [String(a), String(b), String(given)],
        ops: [`${given} ÷ ${pos === 0 ? b : a} × ${pos === 0 ? a : b}`, `${given} ÷ ${pos === 0 ? a : b} × ${pos === 0 ? b : a}`, `${given} + ${Math.abs(b - a)}`],
      });
    }
  } else {
    prompt = `${eq}，□ 是多少？`;
  }
  const mult = knownPair[0] === a && knownPair[1] === b ? k : null;
  return {
    prompt,
    parts: [numberPart(ans, mis, { unit })],
    hints: [
      '看看「:」左右兩邊：哪兩個數是對應的？是加了多少，還是乘了多少？',
      `相等的比：前項和後項要乘（或除以）同一個數。${a} : ${b} 的每一項都 × ${k}，就會變成 ${a * k} : ${b * k}。`,
    ],
    explanation: [
      `第 1 步：寫成算式：${eq}。`,
      `第 2 步：找對應：${a} 對 ${a * k}（前項），${b} 對 ${b * k}（後項）。`,
      `第 3 步：${a} 變成 ${a * k}，是乘了 ${k} 倍；所以每一項都要 ${mult ? '×' : '÷'} ${k}。`,
      `第 4 步：□ = ${fmt(ans)}。驗算：${a} : ${b} 和 ${a * k} : ${b * k} 的比值都是 ${F(a, b).toFracString()} ✓`,
      `答：${fmt(ans)}${unit ? ` ${unit}` : ''}。`,
    ],
    answerText: `${fmt(ans)}${unit ? ` ${unit}` : ''}`,
    context,
    helper,
    params: { a, b, k, pairs, unknownPair, pos },
    sig: `eru|${a}|${b}|${k}|${unknownPair}|${pos}|${context}`,
  };
}

// ===========================================================================
// 題型 3：simplest-ratio 化成最簡單整數比
// ===========================================================================
const FRAC_DENS = [2, 3, 4, 5, 6, 8];

function simplestRatio(level, rng) {
  let x, y, X, Y, step1, scale;
  let p, q;
  if (level === 2) {
    [p, q] = coprimePair(rng, 1, 15);
    const g = rng.int(2, 12);
    x = F(p * g); y = F(q * g); X = p * g; Y = q * g; scale = 1;
    step1 = `兩項都是整數：${X} : ${Y}。`;
  } else if (level === 3) {
    [p, q] = coprimePair(rng, 1, 15);
    const m = rng.pick([10, 100]);
    let t;
    for (let i = 0; i < 40; i++) {
      t = F(rng.int(1, m === 10 ? 9 : 30), m);
      const xx = t.mul(p), yy = t.mul(q);
      if (xx.decimalPlaces() <= 2 && yy.decimalPlaces() <= 2 && (!xx.isInt() || !yy.isInt())) break;
      t = null;
    }
    if (!t) throw new GenRetry('小數比');
    x = t.mul(p); y = t.mul(q);
    scale = 10 ** Math.max(x.decimalPlaces(), y.decimalPlaces());
    X = x.mul(scale).n; Y = y.mul(scale).n;
    step1 = `兩項都 × ${scale}：${fmt(x)} × ${scale} : ${fmt(y)} × ${scale} = ${X} : ${Y}。`;
  } else {
    let ok = false;
    for (let i = 0; i < 80 && !ok; i++) {
      const d1 = rng.pick(FRAC_DENS), d2 = rng.pick(FRAC_DENS);
      const n1 = rng.int(1, 2 * d1), n2 = rng.int(1, 2 * d2);
      x = F(n1, d1); y = F(n2, d2);
      if (x.isInt() && y.isInt()) continue;
      const r = x.div(y);
      p = r.n; q = r.d;
      ok = p <= 15 && q <= 15 && p !== q;
    }
    if (!ok) throw new GenRetry('分數比');
    scale = lcm(x.d, y.d);
    X = x.mul(scale).n; Y = y.mul(scale).n;
    step1 = `兩項都乘分母的最小公倍數 ${scale}：${fmtMixed(x)} × ${scale} : ${fmtMixed(y)} × ${scale} = ${X} : ${Y}。`;
  }
  const g = gcd(X, Y);
  const show = (v) => {
    if (level < 4) return fmt(v);
    if (!v.isInt() && v.decimalPlaces() >= 0 && v.decimalPlaces() <= 2 && rng.chance(0.3)) return v.toDecimalString();
    return v.n > v.d && rng.chance(0.5) ? fmtMixed(v) : v.toFracString();
  };
  const xs = show(x), ys = show(y);
  const context = rng.pick(['calc', 'garden', ...(level === 4 ? ['run'] : [])]);
  const [n1, n2] = pickNames(rng, 2);
  const prompt = context === 'garden'
    ? `一個長方形花圃，長 ${xs} 公尺、寬 ${ys} 公尺。長和寬的最簡單整數比是多少？`
    : context === 'run'
      ? `${n1}跑完用了 ${xs} 小時，${n2}用了 ${ys} 小時。兩人時間的最簡單整數比是多少？`
      : `把 ${xs} : ${ys} 化成最簡單整數比。`;
  const fracNums = level === 4 ? [x.n, y.n] : null;
  const parts = ratioParts(p, q,
    [[() => F(X), 'M-not-simplified'], [() => F(q), 'C-order'], ...(fracNums ? [[() => F(fracNums[0] / gcd(fracNums[0], fracNums[1])), 'K-frac']] : []),
      ...(level === 3 ? [[() => (x.isInt() ? null : x.mul(scale)), 'K-decimal']] : [])],
    [[() => F(Y), 'M-not-simplified'], [() => F(p), 'C-order'], ...(fracNums ? [[() => F(fracNums[1] / gcd(fracNums[0], fracNums[1])), 'K-frac']] : [])]);
  return {
    prompt,
    parts,
    hints: [
      '先想：有小數或分數的話，怎麼讓兩項都變成整數？記得兩項要乘同一個數。',
      `小數：兩項都 × 10（或 × 100）。分數：兩項都乘分母的最小公倍數。再用最大公因數約分。`,
    ],
    explanation: [
      `第 1 步：變成整數：${step1}`,
      `第 2 步：找 ${X} 和 ${Y} 的最大公因數：${g}。`,
      `第 3 步：兩項都 ÷ ${g}：${X} ÷ ${g} : ${Y} ÷ ${g} = ${p} : ${q}。`,
      `第 4 步：檢查：${p} 和 ${q} 只有公因數 1 → 已經是最簡了 ✓`,
      `答：${p} : ${q}。`,
    ],
    answerText: `${p} : ${q}`,
    context,
    params: { x, y, p, q },
    sig: `sr|${x.toFracString()}|${y.toFracString()}`,
  };
}

// ===========================================================================
// 題型 4：ratio-value 求比值
// ===========================================================================
function ratioValue(level, rng) {
  if (level <= 2) {
    let x, y;
    if (level === 1) {
      do { x = F(rng.int(1, 20)); y = F(rng.int(1, 20)); } while (x.eq(y));
    } else if (rng.chance(0.5)) {
      do { x = F(rng.int(1, 30), 10); y = F(rng.int(1, 30), 10); } while (x.eq(y) || (x.isInt() && y.isInt()));
    } else {
      do { x = F(rng.int(1, 9), rng.pick([2, 3, 4, 5, 6])); y = F(rng.int(1, 9), rng.pick([2, 3, 4, 5, 6])); } while (x.eq(y) || (x.isInt() && y.isInt()));
    }
    const ans = x.div(y);
    const xs = level === 1 || x.decimalPlaces() >= 0 && x.d % 10 === 0 ? fmt(x) : x.toFracString();
    const ys = level === 1 || y.decimalPlaces() >= 0 && y.d % 10 === 0 ? fmt(y) : y.toFracString();
    const mis = misList(ans, [[() => y.div(x), 'M-ratio-value-inverse']]);
    return {
      prompt: `${xs} : ${ys} 的比值是多少？（可以用分數回答）`,
      parts: [numberPart(ans, mis, { allowFraction: true })],
      hints: ['比值是「前項 ÷ 後項」。先找出前項和後項。', `${xs} : ${ys} 的比值 = ${xs} ÷ ${ys}，再約分。`],
      explanation: [
        `第 1 步：前項 = ${xs}，後項 = ${ys}。`,
        `第 2 步：比值 = 前項 ÷ 後項 = ${xs} ÷ ${ys}。`,
        `第 3 步：算出來並約分：${ans.toFracString()}${ans.decimalPlaces() >= 0 && !ans.isInt() ? `（也可以寫成 ${ans.toDecimalString()}）` : ''}。`,
        `答：${ans.toFracString()}。`,
      ],
      answerText: ans.toFracString(),
      context: 'calc',
      params: { x, y, variant: 'value' },
      sig: `rv|${x.toFracString()}|${y.toFracString()}`,
    };
  }
  const variant = rng.pick(['equal', 'find', 'juice']);
  if (variant === 'equal') {
    const [a, b] = coprimePair(rng, 1, 9);
    const k = rng.int(2, 6);
    const add = rng.int(1, 4);
    const options = [
      { id: 'e0', label: `${a * k} : ${b * k}` },
      { id: 'e1', label: `${a + add} : ${b + add}` },
      { id: 'e2', label: `${b} : ${a}` },
    ];
    // 第 4 個干擾選項：前後項其中一個差 1（比值一定不同），而且文字不能和其他選項重複
    for (const lbl of [`${a * k} : ${b * k + 1}`, `${a * k + 1} : ${b * k}`, `${a * k} : ${b * k - 1}`, `${a * k - 1} : ${b * k}`]) {
      const [m, n] = lbl.split(' : ').map(Number);
      if (m > 0 && n > 0 && !options.some((o) => o.label === lbl)) { options.push({ id: 'e3', label: lbl }); break; }
    }
    return {
      prompt: `下面哪一個比和 ${a} : ${b} 相等？`,
      parts: [{ id: 'a', kind: 'choice', options, answer: 'e0', shuffle: true,
        misconceptions: choiceMis('e0', [['e1', 'M-ratio-additive'], ['e2', 'C-order']]) }],
      hints: ['相等的比，比值一定一樣。把每個比的比值算算看。', `${a} : ${b} 的比值是 ${F(a, b).toFracString()}。前項、後項要乘同一個數，不能加同一個數。`],
      explanation: [
        `第 1 步：${a} : ${b} 的比值 = ${F(a, b).toFracString()}。`,
        `第 2 步：${a * k} : ${b * k} = (${a} × ${k}) : (${b} × ${k})，比值也是 ${F(a, b).toFracString()} ✓`,
        `第 3 步：${a + add} : ${b + add} 是「各加 ${add}」，比值是 ${F(a + add, b + add).toFracString()}，不一樣。`,
        `答：${a * k} : ${b * k}。`,
      ],
      answerText: `${a * k} : ${b * k}`,
      context: 'equal',
      params: { a, b, k, add, variant },
      sig: `rve|${a}|${b}|${k}|${add}`,
    };
  }
  if (variant === 'juice') {
    let a1, b1, a2, b2;
    for (let i = 0; i < 50; i++) {
      [a1, b1] = coprimePair(rng, 1, 9); [a2, b2] = coprimePair(rng, 1, 9);
      if (!F(a1, b1).eq(F(a2, b2)) && (a1 - a2) * (b1 - b2) > 0) break;   // 兩項都比較大，比較難一眼看出
    }
    if (F(a1, b1).eq(F(a2, b2))) throw new GenRetry('一樣濃');
    const ansId = F(a1, b1).gt(F(a2, b2)) ? 'j0' : 'j1';
    const options = [{ id: 'j0', label: '甲杯比較濃' }, { id: 'j1', label: '乙杯比較濃' }, { id: 'j2', label: '一樣濃' }];
    const wrongId = ansId === 'j0' ? 'j1' : 'j0';
    return {
      prompt: `甲杯的果汁 : 水 = ${a1} : ${b1}，乙杯的果汁 : 水 = ${a2} : ${b2}。比較比值，哪一杯比較濃？`,
      parts: [{ id: 'a', kind: 'choice', options, answer: ansId, misconceptions: choiceMis(ansId, [[wrongId, 'M-ratio-value-inverse']]) }],
      hints: ['比值越大，代表果汁占的比例越多。先算兩杯的比值。', `甲杯比值 = ${a1} ÷ ${b1}，乙杯比值 = ${a2} ÷ ${b2}。通分後比大小。`],
      explanation: [
        `第 1 步：甲杯比值 = ${a1}/${b1}，乙杯比值 = ${a2}/${b2}。`,
        `第 2 步：通分：${a1}/${b1} = ${a1 * b2}/${b1 * b2}，${a2}/${b2} = ${a2 * b1}/${b1 * b2}。`,
        `第 3 步：比值比較大的那杯，果汁比較多 → ${ansId === 'j0' ? '甲杯' : '乙杯'}比較濃。`,
        `答：${ansId === 'j0' ? '甲杯' : '乙杯'}比較濃。`,
      ],
      answerText: ansId === 'j0' ? '甲杯比較濃' : '乙杯比較濃',
      context: 'juice',
      params: { a1, b1, a2, b2, variant },
      sig: `rvj|${a1}|${b1}|${a2}|${b2}`,
    };
  }
  // 已知比值和影長，求樹高
  const r = F(rng.int(2, 15), rng.pick([2, 4, 5, 10]));
  if (r.isInt()) throw new GenRetry('比值是整數');
  const yLen = rng.int(1, 20) * r.d;
  const ans = r.mul(yLen);
  const mis = misList(ans, [[() => F(yLen).div(r), 'M-ratio-value-inverse'], [() => F(yLen).add(r), 'M-ratio-additive']]);
  const rs = r.decimalPlaces() >= 0 ? r.toDecimalString() : r.toFracString();
  return {
    prompt: `同一時間，樹高和影長的比值是 ${rs}。影長 ${yLen} 公尺，樹高是多少公尺？`,
    parts: [numberPart(ans, mis, { unit: '公尺' })],
    hints: ['「樹高和影長的比值」= 樹高 ÷ 影長。已經知道哪一個？', `樹高 ÷ ${yLen} = ${rs}，所以樹高 = ${yLen} × ${rs}。`],
    explanation: [
      `第 1 步：比值 = 前項 ÷ 後項 → 樹高 ÷ 影長 = ${rs}。`,
      `第 2 步：影長是 ${yLen} 公尺，所以樹高 = ${yLen} × ${rs} = ${fmt(ans)}。`,
      `第 3 步：驗算：${fmt(ans)} ÷ ${yLen} = ${rs} ✓`,
      `答：${fmt(ans)} 公尺。`,
    ],
    answerText: `${fmt(ans)} 公尺`,
    context: 'shadow',
    helper: helperSpec({ goal: ['樹高', '影長', '比值'], known: [rs, String(yLen)], ops: [`${yLen} × ${rs}`, `${yLen} ÷ ${rs}`, `${yLen} + ${rs}`] }),
    params: { r, yLen, variant: 'find' },
    sig: `rvf|${r.toFracString()}|${yLen}`,
  };
}

// ===========================================================================
// 題型 5：ratio-word 比的應用題
// ===========================================================================
function ratioWord(level, rng) {
  const kinds = level === 3 ? ['one-part', 'share-total'] : level === 4 ? ['share-diff', 'three-share'] : ['change', 'chain'];
  const kind = rng.pick(kinds);
  const uMax = level === 3 ? 50 : level === 4 ? 100 : 200;
  const [n1, n2, n3] = pickNames(rng, 3);
  if (kind === 'one-part' || kind === 'share-total' || kind === 'share-diff') {
    const [a, b] = coprimePair(rng, 1, 9);
    const u = rng.int(2, uMax);
    const A = a * u, B = b * u, S = A + B, D = Math.abs(A - B);
    if (kind === 'share-diff' && D === 0) throw new GenRetry('差 0');
    const askFirst = rng.chance(0.5);
    const ans = F(askFirst ? A : B);
    const who = askFirst ? n1 : n2;
    let prompt, mis, given, givenParts, line, ops;
    if (kind === 'one-part') {
      prompt = `${n1}和${n2}彈珠數量的比是 ${a} : ${b}。${askFirst ? n2 : n1}有 ${askFirst ? B : A} 顆，${who}有幾顆？`;
      given = askFirst ? B : A; givenParts = askFirst ? b : a;
      const target = askFirst ? a : b;
      mis = misList(ans, [[() => F(given, target).mul(givenParts), 'C-base-swap'], [() => F(S), 'C-goal'], [() => F(given + Math.abs(a - b)), 'M-ratio-additive']]);
      line = `${askFirst ? n2 : n1}是 ${givenParts} 份，有 ${given} 顆`;
      ops = [`${given} ÷ ${givenParts} × ${target}`, `${given} ÷ ${target} × ${givenParts}`, `${given} × ${givenParts} ÷ ${target}`];
    } else if (kind === 'share-total') {
      prompt = `${n1}和${n2}依 ${a} : ${b} 分 ${S} 顆彈珠，${who}分到幾顆？`;
      given = S; givenParts = a + b;
      mis = misList(ans, [[() => F(S * a, b), 'M-part-whole'], [() => F(S, askFirst ? a : b), 'M-part-whole'], [() => F(askFirst ? B : A), 'C-goal']]);
      line = `合起來 ${a} + ${b} = ${a + b} 份，共 ${S} 顆`;
      ops = [`${S} ÷ (${a} + ${b}) × ${askFirst ? a : b}`, `${S} × ${askFirst ? a : b} ÷ ${askFirst ? b : a}`, `${S} ÷ ${askFirst ? a : b}`];
    } else {
      const big = a > b ? '水' : '檸檬汁';
      prompt = `檸檬汁和水的比是 ${a} : ${b}，調好的檸檬水裡，${a > b ? '檸檬汁比水多' : '水比檸檬汁多'} ${D} 毫升。${askFirst ? '檸檬汁' : '水'}有多少毫升？`;
      given = D; givenParts = Math.abs(a - b);
      mis = misList(ans, [[() => F(D * (askFirst ? a : b)), 'M-part-whole'], [() => F(askFirst ? B : A), 'C-goal'], [() => F(S), 'C-goal']]);
      line = `相差 ${Math.abs(a - b)} 份，是 ${D} 毫升`;
      ops = [`${D} ÷ ${Math.abs(a - b)} × ${askFirst ? a : b}`, `${D} × ${askFirst ? a : b}`, `${D} ÷ (${a} + ${b}) × ${askFirst ? a : b}`];
      void big;
    }
    const unit = kind === 'share-diff' ? '毫升' : '顆';
    const X = kind === 'share-diff' ? '檸檬汁' : n1, Y = kind === 'share-diff' ? '水' : n2;
    const goal = kind === 'share-diff' ? (askFirst ? '檸檬汁' : '水') : who;
    return {
      prompt,
      parts: [numberPart(ans, mis, { unit })],
      hints: [
        '黃色筆點「要求誰」，藍色筆點「比」和「共」「多」「少」後面的數。題目給的是其中一項、總數，還是差？',
        `畫份數圖：${X}是 ${a} 份，${Y}是 ${b} 份。先求「一份是多少」，再乘以要求的份數。`,
      ],
      explanation: [
        `第 1 步：要求什麼？→ ${goal}。`,
        `第 2 步：份數圖：${X} ${a} 份、${Y} ${b} 份；${line}。`,
        `第 3 步：一份 = ${given} ÷ ${givenParts} = ${u}。`,
        `第 4 步：${goal} = ${u} × ${askFirst ? a : b} = ${fmt(ans)}。`,
        `第 5 步：驗算：${A} : ${B} 化簡後 = ${a} : ${b} ✓`,
        `答：${fmt(ans)} ${unit}。`,
      ],
      answerText: `${fmt(ans)} ${unit}`,
      context: kind,
      helper: helperSpec({
        goal: kind === 'share-diff' ? [askFirst ? '檸檬汁有多少' : '水有多少', askFirst ? '水有多少' : '檸檬汁有多少', '兩種合起來有多少'] : [`${who}的彈珠`, `${askFirst ? n2 : n1}的彈珠`, '兩人合起來的彈珠'],
        known: kind === 'one-part' ? [String(a), String(b), String(given)] : [String(a), String(b), String(given)],
        ops,
      }),
      params: { kind, a, b, u, askFirst },
      sig: `rwd|${kind}|${a}|${b}|${u}|${askFirst}`,
    };
  }
  if (kind === 'three-share') {
    let a, b, c;
    for (let i = 0; i < 50; i++) {
      a = rng.int(1, 9); b = rng.int(1, 9); c = rng.int(1, 9);
      if (gcd(gcd(a, b), c) === 1 && !(a === b && b === c)) break;
    }
    const u = rng.int(2, Math.min(uMax, Math.floor(3000 / (a + b + c))));
    const S = u * (a + b + c);
    const idx = rng.int(0, 2);
    const names = [n1, n2, n3];
    const parts3 = [a, b, c];
    const ans = F(u * parts3[idx]);
    const mis = misList(ans, [
      [() => F(S, parts3[idx]), 'M-part-whole'],
      ...[0, 1, 2].filter((i) => i !== idx).map((i) => [() => F(u * parts3[i]), 'C-goal']),
      [() => F(S, 3), 'M-part-whole'],
    ]);
    return {
      prompt: `${n1}、${n2}、${n3}依 ${a} : ${b} : ${c} 分 ${S} 元。${names[idx]}分到多少元？`,
      parts: [numberPart(ans, mis, { unit: '元' })],
      hints: ['黃色筆點「要求誰」。三個人的份數合起來是幾份？', `合起來 ${a} + ${b} + ${c} = ${a + b + c} 份，一份 = ${S} ÷ ${a + b + c}。`],
      explanation: [
        `第 1 步：要求什麼？→ ${names[idx]}分到的錢。`,
        `第 2 步：份數：${n1} ${a} 份、${n2} ${b} 份、${n3} ${c} 份，共 ${a + b + c} 份。`,
        `第 3 步：一份 = ${S} ÷ ${a + b + c} = ${u}。`,
        `第 4 步：${names[idx]} = ${u} × ${parts3[idx]} = ${fmt(ans)}。`,
        `第 5 步：驗算：${u * a} + ${u * b} + ${u * c} = ${S} ✓`,
        `答：${fmt(ans)} 元。`,
      ],
      answerText: `${fmt(ans)} 元`,
      context: kind,
      helper: helperSpec({
        goal: [`${names[idx]}分到的錢`, '三人一共的錢', `${names[(idx + 1) % 3]}分到的錢`],
        known: [String(a), String(b), String(c), String(S)],
        ops: [`${S} ÷ (${a} + ${b} + ${c}) × ${parts3[idx]}`, `${S} ÷ ${parts3[idx]}`, `${S} ÷ 3`],
      }),
      params: { kind, a, b, c, u, idx },
      sig: `rw3|${a}|${b}|${c}|${u}|${idx}`,
    };
  }
  if (kind === 'change') {
    // 男 : 女 = a : b，轉入 x 個男生後變成 c : d（女生不變）
    let a, b, c, d, L, x, u;
    for (let i = 0; i < 80; i++) {
      [a, b] = coprimePair(rng, 1, 9); [c, d] = coprimePair(rng, 1, 9);
      if (F(c, d).cmp(F(a, b)) <= 0) continue;            // 加入男生，男生比例要變大
      L = lcm(b, d);
      if (L > 30) continue;
      const before = a * (L / b), after = c * (L / d);
      if (after <= before) continue;
      u = rng.int(1, Math.floor(uMax / 4));
      x = (after - before) * u;
      if (x >= 1 && x <= 60) break;
      x = null;
    }
    if (!x) throw new GenRetry('change');
    const girls = b * (L / b) * u;                      // = L × u
    const boys = a * (L / b) * u;
    const ask = rng.pick(['girls', 'boys']);
    const ans = F(ask === 'girls' ? girls : boys);
    const mis = misList(ans, [[() => F(x * b), 'M-chain-ratio'], [() => F(x * a), 'M-chain-ratio'], [() => F(ask === 'girls' ? boys : girls), 'C-goal'], [() => F(boys + x), 'C-goal']]);
    const before = a * (L / b), after = c * (L / d);
    return {
      prompt: `美術社男生和女生的比是 ${a} : ${b}，又加入 ${x} 個男生後，男生和女生的比變成 ${c} : ${d}。原本${ask === 'girls' ? '女生' : '男生'}有幾人？`,
      parts: [numberPart(ans, mis, { unit: '人' })],
      hints: ['黃色筆點「要求誰」。想一想：加入男生以後，哪一方的人數沒有變？', `女生人數不變。把兩個比的「女生」都換成 ${L} 份：原本 ${before} : ${L}，後來 ${after} : ${L}。`],
      explanation: [
        `第 1 步：不變的是女生。原本女生是 ${b} 份，後來是 ${d} 份 → 把兩個比都換成女生 = ${L} 份。`,
        `第 2 步：原本 ${before} : ${L}，後來 ${after} : ${L}。`,
        `第 3 步：男生從 ${before} 份變 ${after} 份，多了 ${after - before} 份 = ${x} 人 → 一份 = ${u} 人。`,
        `第 4 步：原本女生 = ${L} × ${u} = ${girls} 人，原本男生 = ${before} × ${u} = ${boys} 人。`,
        `第 5 步：驗算：${boys} : ${girls} = ${a} : ${b}，${boys + x} : ${girls} = ${c} : ${d} ✓`,
        `答：${fmt(ans)} 人。`,
      ],
      answerText: `${fmt(ans)} 人`,
      context: kind,
      helper: helperSpec({
        goal: [ask === 'girls' ? '原本的女生人數' : '原本的男生人數', ask === 'girls' ? '原本的男生人數' : '原本的女生人數', '加入後的總人數'],
        known: [String(a), String(b), String(x), String(c), String(d)],
        ops: [`女生不變，都換成 ${L} 份；${x} ÷ (${after} − ${before})`, `${x} ÷ (${c} − ${a})`, `${x} × ${b}`],
      }),
      params: { kind, a, b, c, d, x, u, L, ask },
      sig: `rwc|${a}|${b}|${c}|${d}|${u}|${ask}`,
    };
  }
  // chain：甲 : 乙 = a : b，乙 : 丙 = c : d
  let a, b, c, d, L;
  for (let i = 0; i < 80; i++) {
    [a, b] = coprimePair(rng, 1, 9); [c, d] = coprimePair(rng, 1, 9);
    L = lcm(b, c);
    if (b !== c && L <= 30) break;
    L = null;
  }
  if (!L) throw new GenRetry('chain');
  const A = a * (L / b), B = L, C = d * (L / c);
  const g = gcd(gcd(A, B), C);
  const [pa, pb, pc] = [A / g, B / g, C / g];
  const total = pa + pb + pc;
  const u = rng.int(2, Math.max(2, Math.floor(3000 / total / 2)));
  const S = u * total;
  const ans = F(u * pc);
  const mis = misList(ans, [[() => F(S * d, a + b + d), 'M-chain-ratio'], [() => F(u * pa), 'C-goal'], [() => F(u * pb), 'C-goal']]);
  return {
    prompt: `${n1}和${n2}的存款比是 ${a} : ${b}，${n2}和${n3}的存款比是 ${c} : ${d}，三人共存 ${S} 元。${n3}存了多少元？`,
    parts: [numberPart(ans, mis, { unit: '元' })],
    hints: ['黃色筆點「要求誰」。兩個比裡面都有誰？', `讓${n2}的份數一樣：${b} 和 ${c} 的最小公倍數是 ${L}。`],
    explanation: [
      `第 1 步：兩個比都有${n2}。把${n2}的份數都換成 ${L}。`,
      `第 2 步：${n1} : ${n2} = ${a} : ${b} = ${A} : ${L}；${n2} : ${n3} = ${c} : ${d} = ${L} : ${C}。`,
      `第 3 步：連比 ${n1} : ${n2} : ${n3} = ${A} : ${B} : ${C}${g > 1 ? ` = ${pa} : ${pb} : ${pc}` : ''}，共 ${total} 份。`,
      `第 4 步：一份 = ${S} ÷ ${total} = ${u}，${n3} = ${u} × ${pc} = ${fmt(ans)}。`,
      `第 5 步：驗算：${u * pa} + ${u * pb} + ${u * pc} = ${S} ✓`,
      `答：${fmt(ans)} 元。`,
    ],
    answerText: `${fmt(ans)} 元`,
    context: kind,
    helper: helperSpec({
      goal: [`${n3}的存款`, '三人一共的存款', `${n1}的存款`],
      known: [String(a), String(b), String(c), String(d), String(S)],
      ops: [`先讓${n2}都是 ${L} 份，再算 ${S} ÷ ${total} × ${pc}`, `${S} ÷ (${a} + ${b} + ${d}) × ${d}`, `${S} ÷ 3`],
    }),
    params: { kind, a, b, c, d, u, pa, pb, pc },
    sig: `rwch|${a}|${b}|${c}|${d}|${u}`,
  };
}

export default {
  unitId: UNIT_ID,
  types: {
    'ratio-read-write': { levels: [1, 2], isWordProblem: false, generate: ratioReadWrite },
    'equal-ratio-unknown': { levels: [1, 2, 3], isWordProblem: false, generate: equalRatioUnknown },
    'simplest-ratio': { levels: [2, 3, 4], isWordProblem: false, generate: simplestRatio },
    'ratio-value': { levels: [1, 2, 3], isWordProblem: false, generate: ratioValue },
    'ratio-word': { levels: [3, 4, 5], isWordProblem: true, generate: ratioWord },
  },
};
