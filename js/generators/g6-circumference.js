// 產生器：g6-circumference 圓周長與扇形周長（翰林 6上-第6單元）
// 規格：projects/math-quest/curriculum/specs/g6-circumference.md
// 圓周率一律 3.14，用分數 157/50 精確計算；答案最多兩位小數。
import { Frac, F } from '../core/frac.js';
import { pickNames, fmt, misList, choiceMis, numberPart, helperSpec, GenRetry } from './common.js';

const UNIT_ID = 'g6-circumference';
export const PI = F(157, 50);
const PI_NOTE = '（圓周率用 3.14）';

const pi = (x) => Frac.of(x).mul(PI);

function decimalMis(ans) {
  return [[() => ans.mul(10), 'M-decimal-point'], [() => ans.div(10), 'M-decimal-point']];
}

// ===========================================================================
// 題型 1：circumference 已知半徑或直徑求圓周長
// ===========================================================================
const HALF_POOL = (() => {
  const s = new Set();
  for (let k = 1; k <= 25; k++) s.add(`${k}`);
  for (let k = 1; k <= 25; k++) s.add(F(k, 2).toString());   // 0.5–12.5
  return [...s].map((x) => Frac.of(x)).sort((a, b) => a.cmp(b));
})();

function circumference(level, rng) {
  let given, value;
  if (level === 1) { given = 'd'; value = F(rng.int(2, 20)); }   // 不出現 d = 1
  else { given = rng.chance(0.7) ? 'r' : 'd'; value = rng.pick(HALF_POOL); }
  const d = given === 'd' ? value : value.mul(2);
  const r = d.div(2);
  const ans = pi(d);
  const contexts = given === 'r' ? ['geo', 'coaster', 'compass'] : ['geo', 'coaster'];
  const context = rng.pick(contexts);
  const [n] = pickNames(rng, 1);
  const word = given === 'r' ? '半徑' : '直徑';
  let prompt;
  if (context === 'geo') prompt = `一個圓的${word}是 ${fmt(value)} 公分，圓周長是多少公分？${PI_NOTE}`;
  else if (context === 'coaster') prompt = `${n}有一個圓形的杯墊，${word} ${fmt(value)} 公分。沿著杯墊邊緣貼一圈彩帶，彩帶要多長？${PI_NOTE}`;
  else prompt = `用圓規畫圓，圓規兩腳張開 ${fmt(value)} 公分。畫出來的圓，一圈有多長？${PI_NOTE}`;
  const mis = given === 'r'
    ? misList(ans, [
      [() => pi(r), 'M-r-as-d'],
      [() => pi(r.mul(r)), 'M-area-formula'],
      [() => pi(r.mul(4)), 'M-d-as-r'],
      ...decimalMis(ans),
    ])
    : misList(ans, [
      [() => pi(d.mul(2)), 'M-d-as-r'],
      [() => pi(r.mul(r)), 'M-area-formula'],
      [() => pi(r), 'M-r-as-d'],
      ...decimalMis(ans),
    ]);
  return {
    prompt,
    figure: { type: 'circle', show: given, label: `${fmt(value)} 公分`, colored: true, ask: 'circumference' },
    parts: [numberPart(ans, mis, { unit: '公分' })],
    hints: [
      '圓周長就是「繞圓一圈的長度」。想一想：圓周長和直徑有什麼關係？',
      '圓周長 = 直徑 × 3.14。題目給的是半徑嗎？如果是，先把半徑 × 2 變成直徑。',
    ],
    explanation: [
      given === 'r'
        ? `第 1 步：找出直徑。題目說半徑是 ${fmt(r)} 公分，直徑 = 半徑 × 2 = ${fmt(r)} × 2 = ${fmt(d)} 公分。`
        : `第 1 步：找出直徑。題目直接給直徑 ${fmt(d)} 公分，這一步可以跳過。`,
      `第 2 步：用公式。圓周長 = 直徑 × 3.14 = ${fmt(d)} × 3.14 = ${fmt(ans)} 公分。`,
      `第 3 步：檢查。圓周長大約是直徑的 3 倍多一點：${fmt(d)} × 3 = ${fmt(d.mul(3))}，${fmt(ans)} 比它多一點點，合理！`,
      `答：${fmt(ans)} 公分。`,
    ],
    answerText: `${fmt(ans)} 公分`,
    context,
    helper: helperSpec({
      known: [fmt(value)],
      ops: given === 'r' ? [`${fmt(r)} × 2 × 3.14`, `${fmt(r)} × 3.14`, `${fmt(r)} × ${fmt(r)} × 3.14`]
        : [`${fmt(d)} × 3.14`, `${fmt(d)} × 2 × 3.14`, `${fmt(r)} × ${fmt(r)} × 3.14`],
    }),
    params: { given, value, d },
    sig: `c|${given}|${value.toString()}`,
  };
}

// ===========================================================================
// 題型 2：reverse-circumference 已知圓周長求直徑或半徑
// ===========================================================================
function reverseCircumference(level, rng) {
  const [n] = pickNames(rng, 1);
  if (level === 2) {
    const d = F(rng.int(1, 20));
    const C = pi(d);
    const context = rng.pick(['geo', 'tree']);
    const prompt = context === 'geo'
      ? `一個圓的圓周長是 ${fmt(C)} 公分，它的直徑是多少公分？${PI_NOTE}`
      : `${n}用捲尺繞大樹樹幹一圈，量到 ${fmt(C)} 公分。如果把樹幹看成圓，樹幹的直徑是多少公分？${PI_NOTE}`;
    return reverseBuild({ level, ask: 'd', d, C, n: 1, L: C, unit: '公分', prompt, context });
  }
  if (level === 3) {
    const r = F(rng.int(1, 20));
    const d = r.mul(2);
    const C = pi(d);
    const context = rng.pick(['tree', 'geo', 'table']);
    const prompt = context === 'tree'
      ? `${n}用捲尺繞大樹樹幹一圈，量到 ${fmt(C)} 公分。如果把樹幹看成圓，樹幹的半徑是多少公分？${PI_NOTE}`
      : context === 'table'
        ? `一張圓桌的桌邊繞一圈是 ${fmt(C)} 公分。這張圓桌的半徑是多少公分？${PI_NOTE}`
        : `一個圓的圓周長是 ${fmt(C)} 公分，它的半徑是多少公分？${PI_NOTE}`;
    return reverseBuild({ level, ask: 'r', d, C, n: 1, L: C, unit: '公分', prompt, context });
  }
  // Level 4：繞 n 圈共走 L 公尺（情境本身用公尺，不需換算）
  const r = F(rng.int(1, 30));
  const d = r.mul(2);
  const laps = rng.int(2, 10);
  const C = pi(d);
  const L = C.mul(laps);
  const ask = rng.pick(['r', 'd']);
  const context = rng.pick(['garden', 'pond', 'track']);
  const word = ask === 'r' ? '半徑' : '直徑';
  const place = { garden: '圓形花圃', pond: '圓形水池', track: '圓形步道' }[context];
  const prompt = `公園有一個${place}，${n}沿著${place}的邊走了 ${laps} 圈，共走了 ${fmt(L)} 公尺。${place}的${word}是多少公尺？${PI_NOTE}`;
  return reverseBuild({ level, ask, d, C, n: laps, L, unit: '公尺', prompt, context });
}

function reverseBuild({ level, ask, d, C, n, L, unit, prompt, context }) {
  const r = d.div(2);
  const ans = ask === 'r' ? r : d;
  const mis = misList(ans, [
    [() => C.mul(PI), 'M-reverse-op'],
    ...(n > 1 ? [[() => L.mul(PI), 'M-reverse-op'], [() => ans.mul(n), 'C-step-missed']] : []),
    ask === 'r' ? [() => d, 'M-d-as-r'] : [() => r, 'M-r-as-d'],
    ...decimalMis(ans),
  ]);
  const expl = [];
  if (n > 1) expl.push(`第 1 步：先找一圈的長度。走了 ${n} 圈共 ${fmt(L)} ${unit}，一圈 = ${fmt(L)} ÷ ${n} = ${fmt(C)} ${unit}。`);
  expl.push(`第 ${n > 1 ? 2 : 1} 步：從圓周長找直徑。直徑 × 3.14 = ${fmt(C)}，所以直徑 = ${fmt(C)} ÷ 3.14 = ${fmt(d)}。`);
  if (ask === 'r') expl.push(`第 ${n > 1 ? 3 : 2} 步：題目問半徑，再 ÷ 2。半徑 = ${fmt(d)} ÷ 2 = ${fmt(r)}。`);
  expl.push(`驗算：${fmt(d)} × 3.14 = ${fmt(C)} ✓`, `答：${fmt(ans)} ${unit}。`);
  return {
    prompt,
    figure: { type: 'circle', show: ask, label: '?', colored: level <= 2, ask, circumLabel: `${fmt(C)} ${unit}${n > 1 ? '（一圈）' : ''}`, hideCircum: n > 1 },
    parts: [numberPart(ans, mis, { unit })],
    hints: [
      '我們知道「直徑 × 3.14 = 圓周長」。現在反過來，知道圓周長，要怎麼找回直徑？',
      `直徑 = 圓周長 ÷ 3.14。${ask === 'r' ? '題目問的是半徑，再 ÷ 2。' : ''}${n > 1 ? '先算「一圈」有多長：總長 ÷ 圈數。' : ''}`,
    ],
    explanation: expl,
    answerText: `${fmt(ans)} ${unit}`,
    context,
    helper: helperSpec({
      known: n > 1 ? [String(n), fmt(L)] : [fmt(C)],
      ops: n > 1
        ? [`${fmt(L)} ÷ ${n} ÷ 3.14${ask === 'r' ? ' ÷ 2' : ''}`, `${fmt(L)} ÷ 3.14${ask === 'r' ? ' ÷ 2' : ''}`, `${fmt(L)} ÷ ${n} × 3.14`]
        : [`${fmt(C)} ÷ 3.14${ask === 'r' ? ' ÷ 2' : ''}`, `${fmt(C)} × 3.14`, ask === 'r' ? `${fmt(C)} ÷ 3.14` : `${fmt(C)} ÷ 3.14 ÷ 2`],
    }),
    params: { ask, d, laps: n, C, L, unit },
    sig: `rc|${level}|${ask}|${d.toString()}|${n}`,
  };
}

// ===========================================================================
// 題型 3：sector-perimeter 扇形的弧長與周長
// ===========================================================================
const THETAS = { 2: [180, 90], 3: [60, 120, 270, 45], 4: [30, 36, 72, 135, 150, 240] };

function sectorPerimeter(level, rng) {
  const theta = rng.pick(THETAS[level]);
  const rs = [];
  for (let r = 2; r <= 20; r++) if ((2 * r * theta) % 360 === 0) rs.push(r);
  if (!rs.length) throw new GenRetry('沒有合適的半徑');
  const r = rng.pick(rs);
  const frac = F(theta, 360);
  const C = pi(2 * r);
  const arc = C.mul(frac);
  const per = arc.add(2 * r);
  const ask = level === 2 ? (rng.chance(0.5) ? 'perimeter' : 'arc') : (rng.chance(0.7) ? 'perimeter' : 'arc');
  const asFraction = level === 4 && rng.chance(0.4);
  const pizzaK = Number.isInteger(360 / theta) ? 360 / theta : null;
  const contexts = ask === 'perimeter' ? ['geo', ...(pizzaK && !asFraction ? ['pizza'] : [])] : ['geo', ...(theta <= 180 && !asFraction ? ['fan'] : [])];
  const context = rng.pick(contexts);
  const [n] = pickNames(rng, 1);
  const what = ask === 'perimeter' ? '周長' : '弧長';
  const angleText = asFraction ? `是 ${frac.toFracString()} 個圓` : `圓心角 ${theta}°`;
  let prompt;
  if (context === 'pizza') prompt = `一個圓形披薩半徑 ${r} 公分，平分成 ${pizzaK} 片。${n}拿一片，沿著這一片的邊緣貼一圈裝飾紙，要多長？${PI_NOTE}`;
  else if (context === 'fan') prompt = `${n}做了一把扇子，扇骨長 ${r} 公分，打開的角度是 ${theta}°。扇子外側那條弧線有多長？${PI_NOTE}`;
  else prompt = `一個扇形半徑 ${r} 公分、${angleText}，${what}是多少公分？${PI_NOTE}`;
  const ans = ask === 'perimeter' ? per : arc;
  const mis = ask === 'perimeter'
    ? misList(ans, [
      [() => arc, 'M-sector-arc-only'],
      [() => arc.add(r), 'M-sector-arc-only'],
      [() => pi(r).mul(frac).add(2 * r), 'M-r-as-d'],
      [() => C.add(2 * r), 'M-angle-fraction'],
      [() => C.mul(F(theta, 180)).add(2 * r), 'M-angle-fraction'],
      [() => C.div(theta).add(2 * r), 'M-angle-fraction'],
      ...decimalMis(ans),
    ])
    : misList(ans, [
      [() => C, 'M-angle-fraction'],
      [() => pi(r).mul(frac), 'M-r-as-d'],
      [() => per, 'C-goal'],
      [() => C.mul(F(theta, 180)), 'M-angle-fraction'],
      [() => C.div(theta), 'M-angle-fraction'],
      ...decimalMis(ans),
    ]);
  const parts = [];
  if (level === 2 && ask === 'perimeter') {
    // 規格：Level 2 先點出「扇形周界包含哪幾段」。第一版用選擇題代替圖上點選（見回報的已知限制）。
    parts.push({
      id: 's', kind: 'choice', label: '扇形的周長包含哪幾段？',
      options: [
        { id: 'p0', label: '一段弧 + 兩條半徑' },
        { id: 'p1', label: '只有一段弧' },
        { id: 'p2', label: '一段弧 + 一條半徑' },
      ],
      answer: 'p0', shuffle: true,
      misconceptions: choiceMis('p0', [['p1', 'M-sector-arc-only'], ['p2', 'M-sector-arc-only']]),
    });
  }
  parts.push(numberPart(ans, mis, { id: 'a', unit: '公分', label: parts.length ? `${what}是多少？` : undefined }));
  const fracText = frac.toFracString();
  const expl = [
    asFraction
      ? `第 1 步：這個扇形是 ${fracText} 個圓（圓心角 = 360° × ${fracText} = ${theta}°）。`
      : `第 1 步：這個扇形是幾分之幾個圓？圓心角 ${theta}°，一整圈是 360°，所以是 ${theta}/360 = ${fracText} 個圓。`,
    `第 2 步：整個圓的圓周長。直徑 = ${r} × 2 = ${2 * r}，圓周長 = ${2 * r} × 3.14 = ${fmt(C)}。`,
    `第 3 步：弧長 = ${fmt(C)} × ${fracText} = ${fmt(arc)}。`,
  ];
  if (ask === 'perimeter') expl.push(`第 4 步：扇形周長 = 弧長 + 半徑 + 半徑 = ${fmt(arc)} + ${r} + ${r} = ${fmt(per)}。`);
  expl.push(`答：${fmt(ans)} 公分。`);
  return {
    prompt,
    figure: { type: 'sector', r, theta, rLabel: `${r} 公分`, thetaLabel: asFraction ? `${fracText} 圓` : `${theta}°`, colored: level <= 2 },
    parts,
    hints: [
      ask === 'perimeter'
        ? '扇形的周長要沿著邊走一圈：有一段彎彎的弧，還有兩條直直的半徑。'
        : '弧長就是扇形那一段彎彎的邊。它是整個圓周長的幾分之幾？',
      `先算這個扇形是幾分之幾圓：${theta}° ÷ 360° = ${fracText}。弧長 = 整個圓周長 × ${fracText}${ask === 'perimeter' ? '，最後再加上兩條半徑' : ''}。`,
    ],
    explanation: expl,
    answerText: `${fmt(ans)} 公分`,
    context,
    helper: helperSpec({
      known: context === 'pizza' ? [String(r), String(pizzaK)] : asFraction ? [String(r), fracText] : [String(r), String(theta)],
      ops: ask === 'perimeter'
        ? [`${2 * r} × 3.14 × ${fracText} + ${r} × 2`, `${2 * r} × 3.14 × ${fracText}`, `${r} × 3.14 × ${fracText} + ${r} × 2`]
        : [`${2 * r} × 3.14 × ${fracText}`, `${2 * r} × 3.14 × ${fracText} + ${r} × 2`, `${2 * r} × 3.14`],
    }),
    params: { r, theta, ask, asFraction },
    sig: `sp|${r}|${theta}|${ask}`,
  };
}

// ===========================================================================
// 題型 4：composite-perimeter 複合圖形周長
// ===========================================================================
function evenIn(rng, lo, hi) { return 2 * rng.int(Math.ceil(lo / 2), Math.floor(hi / 2)); }

function compositePerimeter(level, rng) {
  const template = rng.pick(level === 4 ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E']);
  const maxD = level === 4 ? 20 : 40;
  const [n] = pickNames(rng, 1);
  let prompt, unit, ans, mis, expl, figure, params, segments, helperKnown, helperOps;
  if (template === 'A') {
    const d = evenIn(rng, 2, maxD);
    const a = d * rng.int(1, 3);
    unit = '公尺';
    const arc = pi(d);
    ans = arc.add(2 * a);
    prompt = `學校跑道中間是長方形，兩端是半圓。直線部分長 ${a} 公尺，半圓的直徑是 ${d} 公尺。跑一圈是多少公尺？${PI_NOTE}`;
    mis = [
      [() => pi(d).div(2).add(2 * a), 'M-semicircle-no-diameter'],
      [() => pi(2 * d).add(2 * a), 'M-semicircle-no-diameter'],
      [() => arc.add(2 * a).add(2 * d), 'M-inner-line'],
      [() => F(a * d).add(pi(F(d, 2).mul(F(d, 2)))), 'M-area-formula'],
      [() => arc.add(a), 'M-sector-arc-only'],
    ];
    segments = '兩條直線 + 兩個半圓的弧（兩個半圓合起來是一整個圓）';
    expl = [
      `第 1 步：點出外圍的每一段。這個圖形的外圍有：${segments}。`,
      `第 2 步：算直線部分。${a} × 2 = ${2 * a}。`,
      `第 3 步：算彎曲部分。兩個半圓合起來是一個直徑 ${d} 的圓：${d} × 3.14 = ${fmt(arc)}。`,
      `第 4 步：全部加起來。${2 * a} + ${fmt(arc)} = ${fmt(ans)}。`,
    ];
    figure = { type: 'composite', template, d, a, labels: { a: `${a} 公尺`, d: `${d} 公尺` } };
    helperKnown = [String(a), String(d)];
    helperOps = [`${a} × 2 + ${d} × 3.14`, `${a} × 2 + ${d} × 3.14 ÷ 2`, `${a} × 2 + ${d} × 3.14 + ${d} × 2`];
    params = { template, d, a };
  } else if (template === 'B') {
    const d = evenIn(rng, 2, maxD);
    const h = d * rng.int(1, 3);
    unit = '公分';
    const arc = pi(d).div(2);
    ans = arc.add(d + 2 * h);
    const inner = level === 5 ? '長方形和半圓之間有一條橫木條。' : '';
    prompt = `${n}家的窗戶下面是長方形（寬 ${d} 公分、高 ${h} 公分），上面是半圓。${inner}沿窗戶外框貼一圈膠條，要多長？${PI_NOTE}`;
    mis = [
      [() => pi(d).add(d + 2 * h), 'M-semicircle-no-diameter'],
      [() => arc.add(2 * d + 2 * h), 'M-inner-line'],
      [() => F(d * h).add(pi(F(d, 2).mul(F(d, 2))).div(2)), 'M-area-formula'],
      [() => arc.add(2 * h), 'C-figure'],
    ];
    segments = '長方形的三條邊（下面、左邊、右邊）+ 上面半圓的弧';
    expl = [
      `第 1 步：點出外圍的每一段。這個圖形的外圍有：${segments}。中間那條線在裡面，不算。`,
      `第 2 步：算直線部分。${d} + ${h} + ${h} = ${d + 2 * h}。`,
      `第 3 步：算彎曲部分。半圓的弧 = 直徑 × 3.14 ÷ 2 = ${d} × 3.14 ÷ 2 = ${fmt(arc)}。`,
      `第 4 步：全部加起來。${d + 2 * h} + ${fmt(arc)} = ${fmt(ans)}。`,
    ];
    figure = { type: 'composite', template, d, h, labels: { d: `${d} 公分`, h: `${h} 公分` }, innerLine: true };
    helperKnown = [String(d), String(h)];
    helperOps = [`${d} + ${h} × 2 + ${d} × 3.14 ÷ 2`, `${d} × 2 + ${h} × 2 + ${d} × 3.14 ÷ 2`, `${d} + ${h} × 2 + ${d} × 3.14`];
    params = { template, d, h };
  } else if (template === 'C') {
    const s = evenIn(rng, 2, maxD);
    unit = '公分';
    const quarter = pi(2 * s).div(4);
    ans = quarter.mul(2);
    prompt = `美勞課在邊長 ${s} 公分的正方形色紙上，用圓規畫出兩個四分之一圓，中間形成葉子。葉子的周長是多少公分？${PI_NOTE}`;
    mis = [
      [() => quarter, 'M-sector-arc-only'],
      [() => ans.add(4 * s), 'C-figure'],
      [() => ans.add(2 * s), 'C-figure'],
      [() => pi(s).div(2), 'M-r-as-d'],                 // 把邊長當成直徑
    ];
    segments = '兩段四分之一圓的弧（正方形的邊不算）';
    expl = [
      `第 1 步：點出外圍的每一段。葉子的外圍有：${segments}。`,
      `第 2 步：直線部分：沒有。`,
      `第 3 步：一段四分之一圓的弧 = 半徑 ${s} 的圓周長 ÷ 4 = ${s} × 2 × 3.14 ÷ 4 = ${fmt(quarter)}。兩段 = ${fmt(quarter)} × 2 = ${fmt(ans)}。`,
      `第 4 步：全部加起來就是 ${fmt(ans)}。`,
    ];
    figure = { type: 'composite', template, s, labels: { s: `${s} 公分` } };
    helperKnown = [String(s)];
    helperOps = [`${s} × 2 × 3.14 ÷ 4 × 2`, `${s} × 2 × 3.14 ÷ 4`, `${s} × 4 + ${s} × 3.14`];
    params = { template, s };
  } else if (template === 'D') {
    const d = evenIn(rng, 2, maxD);
    unit = '公分';
    const arc = pi(d).div(2);
    ans = arc.add(d);
    prompt = `一塊半圓形的地墊，直徑 ${d} 公分。沿著地墊的邊緣縫一圈花邊，花邊要多長？${PI_NOTE}`;
    mis = [
      [() => arc, 'M-semicircle-no-diameter'],
      [() => pi(d).add(d), 'M-semicircle-no-diameter'],
      [() => pi(d), 'M-semicircle-no-diameter'],
      [() => pi(F(d, 2).mul(F(d, 2))).div(2), 'M-area-formula'],
    ];
    segments = '半圓的弧 + 一條直徑';
    expl = [
      `第 1 步：點出外圍的每一段。半圓的外圍有：${segments}。`,
      `第 2 步：算直線部分。直徑 = ${d}。`,
      `第 3 步：算彎曲部分。半圓的弧 = ${d} × 3.14 ÷ 2 = ${fmt(arc)}。`,
      `第 4 步：全部加起來。${fmt(arc)} + ${d} = ${fmt(ans)}。`,
    ];
    figure = { type: 'composite', template, d, labels: { d: `${d} 公分` } };
    helperKnown = [String(d)];
    helperOps = [`${d} × 3.14 ÷ 2 + ${d}`, `${d} × 3.14 ÷ 2`, `${d} × 3.14 + ${d}`];
    params = { template, d };
  } else {
    const s = evenIn(rng, 4, maxD);
    const rr = evenIn(rng, 2, s - 2);
    unit = '公分';
    const quarter = pi(2 * rr).div(4);
    ans = quarter.add(4 * s - 2 * rr);
    prompt = `一塊邊長 ${s} 公分的正方形桌布，在一個角剪掉一個半徑 ${rr} 公分的四分之一圓。剩下的桌布周長是多少公分？${PI_NOTE}`;
    mis = [
      [() => quarter.add(4 * s), 'C-figure'],
      [() => F(4 * s - 2 * rr), 'M-sector-arc-only'],
      [() => pi(2 * rr).div(2).add(4 * s - 2 * rr), 'M-angle-fraction'],
      [() => F(4 * s), 'C-figure'],
    ];
    segments = `兩條完整的邊 + 兩條被剪短的邊（${s} − ${rr}）+ 一段四分之一圓的弧`;
    expl = [
      `第 1 步：點出外圍的每一段。剩下的桌布外圍有：${segments}。`,
      `第 2 步：算直線部分。${s} + ${s} + (${s} − ${rr}) + (${s} − ${rr}) = ${4 * s - 2 * rr}。`,
      `第 3 步：算彎曲部分。四分之一圓的弧 = ${rr} × 2 × 3.14 ÷ 4 = ${fmt(quarter)}。`,
      `第 4 步：全部加起來。${4 * s - 2 * rr} + ${fmt(quarter)} = ${fmt(ans)}。`,
    ];
    figure = { type: 'composite', template, s, rr, labels: { s: `${s} 公分`, rr: `${rr} 公分` } };
    helperKnown = [String(s), String(rr)];
    helperOps = [`${s} × 4 − ${rr} × 2 + ${rr} × 2 × 3.14 ÷ 4`, `${s} × 4 + ${rr} × 2 × 3.14 ÷ 4`, `${s} × 4 − ${rr} × 2`];
    params = { template, s, rr };
  }
  // Level 5：圖上公分、答案改用公尺（只在換算後仍是兩位小數以內時）
  let convert = false;
  if (level === 5 && unit === '公分' && ans.isInt() && rng.chance(0.3)) {
    convert = true;
    const cm = ans;
    ans = cm.div(100);
    mis = [...mis, [() => cm, 'M-unit']];
    mis = mis.map(([fn, code]) => (code === 'M-unit' ? [fn, code] : [() => Frac.of(fn()).div(100), code]));
    prompt += '答案請用公尺表示。';
    expl.push(`第 5 步：換成公尺：${fmt(cm)} 公分 = ${fmt(cm)} ÷ 100 = ${fmt(ans)} 公尺。`);
    unit = '公尺';
  }
  expl.push(`答：${fmt(ans)} ${unit}。`);
  return {
    prompt,
    figure,
    parts: [numberPart(ans, misList(ans, [...mis, ...decimalMis(ans)]), { unit })],
    hints: [
      '想像有一隻螞蟻沿著圖形最外面走一圈，牠會走過哪幾段？先找出這幾段。',
      '把每一段分開算：直直的線直接用長度；彎彎的弧是幾分之幾個圓？（兩個半圓合起來剛好是一整個圓喔！）',
    ],
    explanation: expl,
    answerText: `${fmt(ans)} ${unit}`,
    context: template,
    helper: helperSpec({ known: helperKnown, ops: helperOps }),
    params: { ...params, convert, unit },
    sig: `cp|${JSON.stringify(params)}|${convert}`,
  };
}

// ===========================================================================
// 題型 5：wheel-track 輪子滾動
// ===========================================================================
function wheelTrack(level, rng) {
  const [n] = pickNames(rng, 1);
  const context = rng.pick(['bike', 'roller', 'measure']);
  let d, laps;
  if (level === 3) { d = 10 * rng.int(1, 8); laps = 1; }
  else {
    d = rng.int(20, 70);
    const ok = [];
    for (let k = 2; k <= 100; k++) if ((k * d) % 50 === 0) ok.push(k);   // n×d×3.14÷100 最多兩位小數
    laps = rng.pick(ok);
  }
  const perTurn = pi(d);                   // 公分
  const totalCm = perTurn.mul(laps);
  const totalM = totalCm.div(100);
  let prompt, ans, unit, mis, expl;
  if (level === 3) {
    unit = '公分'; ans = perTurn;
    prompt = context === 'bike' ? `${n}的腳踏車輪子直徑 ${d} 公分。輪子轉一圈，腳踏車前進多少公分？${PI_NOTE}`
      : context === 'roller' ? `油漆滾筒的直徑是 ${d} 公分，滾一圈可以刷多長的牆面？${PI_NOTE}`
        : `老師推著測距輪量走廊，輪子直徑 ${d} 公分。輪子轉一圈，量到多長？${PI_NOTE}`;
    mis = misList(ans, [
      [() => F(d), 'M-roll-equals-diameter'],
      [() => pi(F(d, 2)), 'M-r-as-d'],
      [() => pi(F(d, 2).mul(F(d, 2))), 'M-area-formula'],
      ...decimalMis(ans),
    ]);
    expl = [
      `第 1 步：輪子滾一圈前進多遠？滾一圈 = 圓周長 = ${d} × 3.14 = ${fmt(perTurn)} 公分。`,
      `答：${fmt(ans)} 公分。`,
    ];
  } else if (level === 4) {
    unit = '公尺'; ans = totalM;
    prompt = context === 'bike' ? `${n}的腳踏車輪子直徑 ${d} 公分。輪子轉 ${laps} 圈，腳踏車前進多少公尺？${PI_NOTE}`
      : context === 'roller' ? `油漆滾筒的直徑是 ${d} 公分，${n}把滾筒滾了 ${laps} 圈，刷過的牆面有多少公尺長？${PI_NOTE}`
        : `老師推著測距輪量走廊，輪子直徑 ${d} 公分。量完走廊轉了 ${laps} 圈，走廊長多少公尺？${PI_NOTE}`;
    mis = misList(ans, [
      [() => F(d * laps, 100), 'M-roll-equals-diameter'],
      [() => perTurn.div(100), 'C-step-missed'],
      [() => perTurn, 'C-step-missed'],
      [() => totalCm, 'M-unit'],
      [() => pi(F(d, 2)).mul(laps).div(100), 'M-r-as-d'],
      ...decimalMis(ans),
    ]);
    expl = [
      `第 1 步：輪子滾一圈前進多遠？滾一圈 = 圓周長 = ${d} × 3.14 = ${fmt(perTurn)} 公分。`,
      `第 2 步：滾 ${laps} 圈。${fmt(perTurn)} × ${laps} = ${fmt(totalCm)} 公分。`,
      `第 3 步：換成公尺（100 公分 = 1 公尺）。${fmt(totalCm)} ÷ 100 = ${fmt(totalM)} 公尺。`,
      `答：${fmt(ans)} 公尺。`,
    ];
  } else {
    unit = '圈'; ans = F(laps);
    prompt = context === 'bike' ? `${n}的腳踏車輪子直徑 ${d} 公分。腳踏車前進了 ${fmt(totalM)} 公尺，輪子轉了幾圈？${PI_NOTE}`
      : context === 'roller' ? `油漆滾筒的直徑是 ${d} 公分。${n}刷了 ${fmt(totalM)} 公尺長的牆，滾筒滾了幾圈？${PI_NOTE}`
        : `老師推著測距輪量走廊，輪子直徑 ${d} 公分。走廊長 ${fmt(totalM)} 公尺，輪子轉了幾圈？${PI_NOTE}`;
    mis = misList(ans, [
      [() => totalM.mul(100).div(d), 'M-roll-equals-diameter'],
      [() => totalM.div(perTurn), 'M-unit'],
      [() => totalM.mul(100).div(pi(F(d, 2))), 'M-r-as-d'],
      [() => totalM.mul(100).mul(perTurn), 'M-reverse-op'],
    ]);
    expl = [
      `第 1 步：輪子滾一圈前進多遠？滾一圈 = 圓周長 = ${d} × 3.14 = ${fmt(perTurn)} 公分。`,
      `第 2 步：把總長換成公分。${fmt(totalM)} 公尺 = ${fmt(totalM)} × 100 = ${fmt(totalCm)} 公分。`,
      `第 3 步：轉了幾圈 = 總長 ÷ 一圈的長度 = ${fmt(totalCm)} ÷ ${fmt(perTurn)} = ${laps} 圈。`,
      `答：${laps} 圈。`,
    ];
  }
  return {
    prompt,
    figure: { type: 'wheel', d, label: `${d} 公分` },
    parts: [numberPart(ans, mis, { unit })],
    hints: [
      '輪子滾一圈時，輪子邊緣上每一點都碰到地面一次。所以滾一圈前進的距離，就是輪子的什麼長度？',
      '滾一圈 = 圓周長 = 直徑 × 3.14。再想想：轉了幾圈？題目要的單位是公分還是公尺？',
    ],
    explanation: expl,
    answerText: `${fmt(ans)} ${unit}`,
    context,
    helper: helperSpec({
      goal: level === 3 ? ['轉一圈前進多遠', '輪子的直徑', '輪子的半徑'] : level === 4 ? [`轉 ${laps} 圈前進幾公尺`, '轉一圈前進幾公分', '輪子的直徑'] : ['輪子轉了幾圈', '轉一圈前進多遠', '總共走了多遠'],
      known: level === 3 ? [String(d)] : level === 4 ? [String(d), String(laps)] : [String(d), fmt(totalM)],
      ops: level === 3 ? [`${d} × 3.14`, `${d}`, `${d} ÷ 2 × 3.14`]
        : level === 4 ? [`${d} × 3.14 × ${laps} ÷ 100`, `${d} × 3.14 × ${laps}`, `${d} × ${laps} ÷ 100`]
          : [`${fmt(totalM)} × 100 ÷ (${d} × 3.14)`, `${fmt(totalM)} ÷ (${d} × 3.14)`, `${fmt(totalM)} × 100 ÷ ${d}`],
    }),
    params: { d, laps, level },
    sig: `wt|${level}|${d}|${laps}`,
  };
}

// ===========================================================================
export default {
  unitId: UNIT_ID,
  types: {
    circumference: { levels: [1, 2], isWordProblem: false, generate: circumference },
    'reverse-circumference': { levels: [2, 3, 4], isWordProblem: false, generate: reverseCircumference },
    'sector-perimeter': { levels: [2, 3, 4], isWordProblem: false, generate: sectorPerimeter },
    'composite-perimeter': { levels: [4, 5], isWordProblem: false, generate: compositePerimeter },
    'wheel-track': { levels: [3, 4, 5], isWordProblem: true, generate: wheelTrack },
  },
};
