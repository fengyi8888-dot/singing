// 產生器：g6-problem-solving-1 怎樣解題（翰林 6上-第8單元）
// 規格：projects/math-quest/curriculum/specs/g6-problem-solving-1.md
// 只實作 4 個 textbook 題型；profit-loss、periodic-pattern、exchange-problem（contest-extension）之後再做。
// 第一版沒有小畫板與列表工具（drag），規律題改用文字列出前幾項。
import { F, gcd, lcm } from '../core/frac.js';
import { pickNames, fmt, misList, choiceMis, numberPart, helperSpec, GenRetry } from './common.js';

const UNIT_ID = 'g6-problem-solving-1';
const n0 = (x) => F(x);

// ===========================================================================
// 題型 1：interval-problem 間隔問題
// ===========================================================================
const KIND_RULE = {
  'line-both': ['兩端都種', '棵數 = 間隔數 + 1', (k) => k + 1],
  'line-none': ['兩端都不種', '棵數 = 間隔數 − 1', (k) => k - 1],
  'line-one': ['只有一端種', '棵數 = 間隔數', (k) => k],
  loop: ['圍成一圈', '棵數 = 間隔數', (k) => k],
};

function intervalProblem(level, rng) {
  const [nm] = pickNames(rng, 1);
  const kinds = level === 1 ? ['line-both'] : level === 2 ? ['line-both', 'line-none', 'loop']
    : level === 3 ? ['line-both', 'line-none', 'line-one', 'loop', 'saw', 'stairs', 'clock']
      : level === 4 ? ['reverse', 'both-sides'] : ['saw-time', 'stairs-time', 'overlap'];
  const kind = rng.pick(kinds);
  const kRange = { 1: [3, 10], 2: [5, 30], 3: [5, 50], 4: [10, 80] }[Math.min(level, 4)];
  const dMax = { 1: 10, 2: 20 }[level] || 25;
  const hint1 = '用藍色筆點出「兩端都種」「兩端都不種」「圍成一圈」「兩旁」這些條件。它們會改變答案！';
  if (KIND_RULE[kind] || kind === 'both-sides') {
    const base = kind === 'both-sides' ? rng.pick(['line-both', 'line-none']) : kind;
    const [cond, rule, f] = KIND_RULE[base];
    const k = rng.int(base === 'line-none' ? Math.max(3, kRange[0]) : kRange[0], kRange[1]);
    const d = rng.int(2, dMax);
    const L = k * d;
    const sides = kind === 'both-sides' ? 2 : 1;
    const ans = n0(f(k) * sides);
    const place = base === 'loop' ? '圓形池塘一圈' : '一條步道';
    const what = base === 'loop' ? '插一支旗子' : '種一棵樹';
    const unit = base === 'loop' ? '支' : '棵';
    const condText = base === 'loop' ? '' : `（${cond}）`;
    const prompt = kind === 'both-sides'
      ? `一條道路長 ${L} 公尺，道路兩旁從頭到尾每隔 ${d} 公尺${what}${condText}。兩旁共要種幾棵？`
      : `${place}長 ${L} 公尺，每隔 ${d} 公尺${what}${condText}。共要${base === 'loop' ? '插幾支' : '種幾棵'}？`;
    const mis = misList(ans, [
      [() => n0(k * sides), 'M-off-by-one'],
      [() => n0((k + 1) * sides), base === 'loop' ? 'M-circle-as-line' : 'M-off-by-one'],
      [() => n0((k - 1) * sides), 'C-condition'],
      ...(sides === 2 ? [[() => n0(f(k)), 'C-both-sides']] : []),
    ]);
    return {
      prompt,
      parts: [numberPart(ans, mis, { unit })],
      hints: [hint1, `先算有幾個間隔：${L} ÷ ${d} = ${k}。用小數字試：如果只有 2 個間隔、${cond}，會有幾棵？`],
      explanation: [
        `第 1 步：圈條件：${cond}${sides === 2 ? '、道路兩旁' : ''}。`,
        `第 2 步：間隔數 = 總長 ÷ 間隔長 = ${L} ÷ ${d} = ${k} 個間隔。`,
        '第 3 步：用小例子找關係：●—●—● 2 個間隔、兩端都種 → 3 棵（多 1）；—●—●— 3 個間隔、兩端都不種 → 2 棵（少 1）；圍成一圈 → 棵數 = 間隔數。',
        `第 4 步：所以 ${rule}：${f(k)}。${sides === 2 ? `兩旁再 × 2 = ${f(k) * 2}。` : ''}`,
        `答：${fmt(ans)} ${unit}。`,
      ],
      answerText: `${fmt(ans)} ${unit}`,
      context: kind,
      helper: helperSpec({ goal: [`共要${base === 'loop' ? '插幾支旗子' : '種幾棵樹'}`, '有幾個間隔', '步道全長'], known: [String(L), String(d)], ops: [`${L} ÷ ${d}${f(k) - k === 1 ? ' + 1' : f(k) - k === -1 ? ' − 1' : ''}${sides === 2 ? '，再 × 2' : ''}`, `${L} ÷ ${d}${f(k) - k === 1 ? '' : ' + 1'}`, `${L} × ${d}`] }),
      params: { kind, base, k, d, L, sides },
      sig: `ip|${kind}|${base}|${k}|${d}`,
    };
  }
  if (kind === 'saw' || kind === 'saw-time') {
    const p = rng.int(3, level === 5 ? 20 : 12);
    const t = rng.int(2, 9);
    const timed = kind === 'saw-time' || rng.chance(0.5);
    const ans = n0(timed ? (p - 1) * t : p - 1);
    const unit = timed ? '分鐘' : '次';
    const prompt = timed
      ? `${nm}把一根木頭鋸成 ${p} 段，每鋸一次要 ${t} 分鐘。共要幾分鐘？`
      : `${nm}把一根木頭鋸成 ${p} 段，要鋸幾次？`;
    const mis = misList(ans, [[() => n0(timed ? p * t : p), 'M-cuts-as-pieces'], [() => n0(timed ? (p + 1) * t : p + 1), 'M-off-by-one']]);
    return {
      prompt,
      parts: [numberPart(ans, mis, { unit })],
      hints: ['先想：鋸 1 次會變成幾段？鋸 2 次呢？', `鋸成 ${p} 段，要鋸 ${p} − 1 次。${timed ? `每次 ${t} 分鐘，再乘起來。` : ''}`],
      explanation: [
        '第 1 步：鋸 1 次 → 2 段；鋸 2 次 → 3 段。次數比段數少 1。',
        `第 2 步：鋸成 ${p} 段 → 要鋸 ${p - 1} 次。`,
        ...(timed ? [`第 3 步：${p - 1} 次 × ${t} 分鐘 = ${(p - 1) * t} 分鐘。`] : []),
        `答：${fmt(ans)} ${unit}。`,
      ],
      answerText: `${fmt(ans)} ${unit}`,
      context: 'saw',
      helper: helperSpec({ goal: [timed ? '共要幾分鐘' : '要鋸幾次', '鋸成幾段', '每次要幾分鐘'], known: timed ? [String(p), String(t)] : [String(p)], ops: timed ? [`(${p} − 1) × ${t}`, `${p} × ${t}`, `(${p} + 1) × ${t}`] : [`${p} − 1`, `${p}`, `${p} + 1`] }),
      params: { kind: 'saw', p, t, timed },
      sig: `ip|saw|${p}|${t}|${timed}`,
    };
  }
  if (kind === 'stairs' || kind === 'stairs-time') {
    if (kind === 'stairs') {
      const n = rng.int(3, 12);
      const h = rng.int(2, 5);
      const ans = n0((n - 1) * h);
      return {
        prompt: `大樓每一層樓梯有 ${h} 段扶手燈。從 1 樓走到 ${n} 樓，會經過幾段扶手燈？`,
        parts: [numberPart(ans, misList(ans, [[() => n0(n * h), 'M-floor-count'], [() => n0((n + 1) * h), 'M-off-by-one']]), { unit: '段' })],
        hints: ['從 1 樓走到 2 樓，走了幾層樓梯？從 1 樓到 3 樓呢？', `從 1 樓到 ${n} 樓，走了 ${n} − 1 層。`],
        explanation: [`第 1 步：從 1 樓到 ${n} 樓，走了 ${n} − 1 = ${n - 1} 層。`, `第 2 步：每層 ${h} 段：${n - 1} × ${h} = ${(n - 1) * h}。`, `答：${fmt(ans)} 段。`],
        answerText: `${fmt(ans)} 段`,
        context: 'stairs',
        helper: helperSpec({ goal: ['會經過幾段扶手燈', '走了幾層樓梯', '每層有幾段'], known: [String(h), String(n)], ops: [`(${n} − 1) × ${h}`, `${n} × ${h}`, `(${n} + 1) × ${h}`] }),
        params: { kind, n, h },
        sig: `ip|stairs|${n}|${h}`,
      };
    }
    const a = 3 * rng.int(1, 6);
    const n = rng.int(5, 20);
    const ans = n0((n - 1) * a / 3);
    return {
      prompt: `${nm}從 3 樓爬到 6 樓花了 ${a} 分鐘。照這樣的速度，從 1 樓爬到 ${n} 樓要幾分鐘？`,
      parts: [numberPart(ans, misList(ans, [[() => n0(n * a / 3), 'M-floor-count'], [() => n0(n * a / 6), 'M-floor-count'], [() => n0((n - 1) * a / 6), 'M-floor-count']]), { unit: '分鐘' })],
      hints: ['3 樓到 6 樓爬了幾層？不是 6 層，也不是 4 層喔。', `3 樓到 6 樓是 3 層，每層 ${a} ÷ 3 分鐘。1 樓到 ${n} 樓是 ${n} − 1 層。`],
      explanation: [
        '第 1 步：3 樓到 6 樓爬了 6 − 3 = 3 層。',
        `第 2 步：每層 = ${a} ÷ 3 = ${a / 3} 分鐘。`,
        `第 3 步：1 樓到 ${n} 樓爬了 ${n - 1} 層：${n - 1} × ${a / 3} = ${fmt(ans)} 分鐘。`,
        `答：${fmt(ans)} 分鐘。`,
      ],
      answerText: `${fmt(ans)} 分鐘`,
      context: 'stairs-time',
      helper: helperSpec({ goal: [`爬到 ${n} 樓要幾分鐘`, '爬一層要幾分鐘', '3 樓到 6 樓有幾層'], known: [String(a), String(n)], ops: [`${a} ÷ (6 − 3) × (${n} − 1)`, `${a} ÷ 6 × ${n}`, `${a} ÷ 3 × ${n}`] }),
      params: { kind, a, n },
      sig: `ip|stairst|${a}|${n}`,
    };
  }
  if (kind === 'clock') {
    const n = rng.int(3, 12);
    const g = rng.int(1, 4);
    const ans = n0((n - 1) * g);
    return {
      prompt: `一座大鐘敲鐘時，每兩下之間隔 ${g} 秒。敲 ${n} 下，從第 1 下到最後 1 下共要幾秒？`,
      parts: [numberPart(ans, misList(ans, [[() => n0(n * g), 'M-off-by-one'], [() => n0((n + 1) * g), 'M-off-by-one']]), { unit: '秒' })],
      hints: ['敲 2 下有幾個間隔？敲 3 下呢？', `敲 ${n} 下有 ${n} − 1 個間隔。`],
      explanation: [`第 1 步：敲 ${n} 下有 ${n - 1} 個間隔。`, `第 2 步：${n - 1} × ${g} = ${(n - 1) * g} 秒。`, `答：${fmt(ans)} 秒。`],
      answerText: `${fmt(ans)} 秒`,
      context: 'clock',
      helper: helperSpec({ goal: ['共要幾秒', '敲了幾下', '有幾個間隔'], known: [String(g), String(n)], ops: [`(${n} − 1) × ${g}`, `${n} × ${g}`, `(${n} + 1) × ${g}`] }),
      params: { kind, n, g },
      sig: `ip|clock|${n}|${g}`,
    };
  }
  if (kind === 'reverse') {
    const k = rng.int(10, 80);
    const d = rng.int(2, 25);
    const trees = k + 1;
    const ans = n0(k * d);
    return {
      prompt: `一條步道從頭到尾每隔 ${d} 公尺種一棵樹（兩端都種），共種了 ${trees} 棵。步道長多少公尺？`,
      parts: [numberPart(ans, misList(ans, [[() => n0(trees * d), 'M-off-by-one'], [() => n0((trees - 2) * d), 'C-condition']]), { unit: '公尺' })],
      hints: [hint1, `兩端都種：間隔數 = 棵數 − 1 = ${trees} − 1。全長 = 間隔數 × ${d}。`],
      explanation: [`第 1 步：兩端都種，所以間隔數 = 棵數 − 1 = ${trees} − 1 = ${k}。`, `第 2 步：全長 = ${k} × ${d} = ${k * d} 公尺。`, `答：${fmt(ans)} 公尺。`],
      answerText: `${fmt(ans)} 公尺`,
      context: 'reverse',
      helper: helperSpec({ goal: ['步道長多少公尺', '種了幾棵樹', '有幾個間隔'], known: [String(d), String(trees)], ops: [`(${trees} − 1) × ${d}`, `${trees} × ${d}`, `(${trees} + 1) × ${d}`] }),
      params: { kind, k, d },
      sig: `ip|rev|${k}|${d}`,
    };
  }
  // overlap（Level 5）：每 a 公尺一盞燈、每 b 公尺一棵樹，L 公尺內重合幾次（含起點）
  let a, b, m;
  for (let i = 0; i < 50; i++) {
    a = rng.int(2, 12); b = rng.int(2, 12);
    m = lcm(a, b);
    if (a !== b && m <= 60 && m !== a && m !== b) break;
    m = null;
  }
  if (!m) throw new GenRetry('overlap');
  const times = rng.int(2, 10);
  const L = m * times;
  const ans = n0(times + 1);
  return {
    prompt: `一條路長 ${L} 公尺，路邊從起點開始每 ${a} 公尺有一盞燈、每 ${b} 公尺有一棵樹（起點和終點都有）。燈和樹在同一個位置的地方共有幾處？`,
    parts: [numberPart(ans, misList(ans, [[() => n0(times), 'M-off-by-one'], [() => n0(L / (a * b) + 1), 'K-calc'], [() => n0(L / gcd(a, b) + 1), 'K-calc']]), { unit: '處' })],
    hints: ['燈和樹同時出現的位置，要同時是幾的倍數？', `同時是 ${a} 和 ${b} 的倍數 → 每 ${m} 公尺重合一次（最小公倍數）。起點也要算。`],
    explanation: [
      `第 1 步：重合的位置要同時是 ${a} 和 ${b} 的倍數 → 最小公倍數 ${m}。`,
      `第 2 步：每 ${m} 公尺重合一次：${L} ÷ ${m} = ${times} 個間隔。`,
      `第 3 步：起點和終點都有 → 處數 = 間隔數 + 1 = ${times + 1}。`,
      `答：${fmt(ans)} 處。`,
    ],
    answerText: `${fmt(ans)} 處`,
    context: 'overlap',
    helper: helperSpec({ goal: ['燈和樹重合的地方有幾處', '共有幾盞燈', '共有幾棵樹'], known: [String(L), String(a), String(b)], ops: [`${L} ÷ (${a} 和 ${b} 的最小公倍數) + 1`, `${L} ÷ (${a} × ${b})`, `${L} ÷ ${a} + ${L} ÷ ${b}`] }),
    params: { kind, a, b, m, L },
    sig: `ip|ov|${a}|${b}|${L}`,
  };
}

// ===========================================================================
// 題型 2：figure-pattern 數形規則
// ===========================================================================
const PATTERNS = {
  'matchstick-square': { name: '火柴棒排一排正方形', unit: '根', f: (n) => 3 * n + 1, v1: 4, d: 3, nomis: (n) => [[3 * n, 'M-pattern-no-start'], [4 * n, 'M-pattern-no-start']] },
  'matchstick-triangle': { name: '火柴棒排一排三角形', unit: '根', f: (n) => 2 * n + 1, v1: 3, d: 2, nomis: (n) => [[2 * n, 'M-pattern-no-start'], [3 * n, 'M-pattern-no-start']] },
  'table-seat': { name: '長桌併排', item: '張', unit: '人', f: (n) => 4 * n + 2, v1: 6, d: 4, nomis: (n) => [[6 * n, 'M-pattern-no-start'], [4 * n, 'M-pattern-no-start']] },
  'hollow-square': { name: '空心正方形花片（每邊 n 片）', unit: '片', f: (n) => 4 * n - 4, v1: null, d: 4, nomis: (n) => [[4 * n, 'M-corner-double'], [n * n, 'C-condition']] },
};
const COLORS = ['紅', '黃', '藍', '綠', '白', '紫', '橘'];

function figurePattern(level, rng) {
  const kinds = level === 1 ? ['arith', 'period'] : level === 2 ? ['arith', 'matchstick-square', 'matchstick-triangle', 'hollow-square', 'square-dots']
    : level === 3 ? ['arith', 'period', 'matchstick-square', 'table-seat', 'triangle-dots', 'weekday']
      : level === 4 ? ['reverse-match', 'reverse-arith', 'reverse-table'] : ['arith-sum', 'count-shapes'];
  const kind = rng.pick(kinds);
  const nRange = { 1: [6, 10], 2: [8, 20], 3: [15, 60] }[level] || [10, 100];
  const [nm] = pickNames(rng, 1);
  const hint1 = '先看前 3 個：每多 1 個，多了幾個？用藍色筆點出「第幾個」。';
  if (kind === 'arith') {
    const a = rng.int(1, 20), d = rng.int(level === 1 ? 2 : 2, level === 1 ? 5 : 9);
    const n = rng.int(...nRange);
    const seq = [0, 1, 2, 3].map((i) => a + i * d);
    const ans = n0(a + (n - 1) * d);
    return {
      prompt: `一列數依照規律排列：${seq.join('、')}、……。第 ${n} 個數是多少？`,
      parts: [numberPart(ans, misList(ans, [[() => n0(a + n * d), 'M-pattern-n-not-n-1'], [() => n0(n * d), 'M-pattern-no-start']]))],
      hints: [hint1, `每次多 ${d}。第 ${n} 個 = 第 1 個 + (${n} − 1) × ${d}。`],
      explanation: [`第 1 步：每次多 ${d}。`, `第 2 步：第 ${n} 個 = ${a} + (${n} − 1) × ${d} = ${a} + ${(n - 1) * d} = ${fmt(ans)}。`, `第 3 步：用第 3 個驗算：${a} + 2 × ${d} = ${seq[2]} ✓`, `答：${fmt(ans)}。`],
      answerText: fmt(ans),
      context: 'arith',
      params: { kind, a, d, n },
      sig: `fp|arith|${a}|${d}|${n}`,
    };
  }
  if (kind === 'period' || kind === 'weekday') {
    if (kind === 'weekday') {
      const days = ['日', '一', '二', '三', '四', '五', '六'];
      const w = rng.int(0, 6);
      const x = rng.int(8, 31);
      const ansIdx = (w + x - 1) % 7;
      const wrongZero = (w + x) % 7;
      const opts = [ansIdx, (ansIdx + 1) % 7, (ansIdx + 6) % 7, wrongZero].filter((v, i, a) => a.indexOf(v) === i);
      while (opts.length < 4) { const v = rng.int(0, 6); if (!opts.includes(v)) opts.push(v); }
      const options = opts.map((v) => ({ id: `w${v}`, label: `星期${days[v]}` }));
      return {
        prompt: `某個月的 1 日是星期${days[w]}。同一個月的 ${x} 日是星期幾？`,
        parts: [{ id: 'a', kind: 'choice', options, answer: `w${ansIdx}`, shuffle: true, misconceptions: choiceMis(`w${ansIdx}`, [[`w${wrongZero}`, 'M-pattern-n-not-n-1'], [`w${(ansIdx + 1) % 7}`, 'M-period-zero']]) }],
        hints: ['一星期 7 天一輪。從 1 日到 x 日，過了幾天？', `${x} 日比 1 日多了 ${x - 1} 天。${x - 1} ÷ 7 的餘數是多少？`],
        explanation: [`第 1 步：${x} 日比 1 日晚了 ${x - 1} 天。`, `第 2 步：${x - 1} ÷ 7 = ${Math.floor((x - 1) / 7)} … ${(x - 1) % 7}。`, `第 3 步：從星期${days[w]}往後數 ${(x - 1) % 7} 天 → 星期${days[ansIdx]}。`, `答：星期${days[ansIdx]}。`],
        answerText: `星期${days[ansIdx]}`,
        context: 'weekday',
        params: { kind, w, x },
        sig: `fp|wd|${w}|${x}`,
      };
    }
    const p = level === 1 ? rng.int(2, 3) : rng.int(3, 7);
    const cycle = rng.sample(COLORS, p);
    let n = rng.int(...nRange);
    if (rng.chance(0.4)) n = p * Math.max(1, Math.round(n / p));    // 剛好整除，檢查 M-period-zero
    const r = n % p;
    const ansColor = cycle[r === 0 ? p - 1 : r - 1];
    const options = cycle.slice(0, Math.min(4, p)).map((c) => ({ id: `c-${c}`, label: `${c}色` }));
    if (!options.find((o) => o.id === `c-${ansColor}`)) options[options.length - 1] = { id: `c-${ansColor}`, label: `${ansColor}色` };
    const zeroWrong = `c-${cycle[0]}`;
    return {
      prompt: `手鍊的珠子依照 ${cycle.join('、')} 的順序一直重複串下去。第 ${n} 顆是什麼顏色？`,
      parts: [{ id: 'a', kind: 'choice', options, answer: `c-${ansColor}`, misconceptions: r === 0 ? choiceMis(`c-${ansColor}`, [[zeroWrong, 'M-period-zero']]) : [] }],
      hints: [hint1, `一輪有 ${p} 顆。${n} ÷ ${p} 的餘數是幾？餘數 0 代表剛好是一輪的最後一個。`],
      explanation: [`第 1 步：一輪有 ${p} 顆：${cycle.join('、')}。`, `第 2 步：${n} ÷ ${p} = ${Math.floor(n / p)} 輪 … 餘 ${r}。`, `第 3 步：餘 ${r} → ${r === 0 ? '一輪的最後一個' : `一輪中的第 ${r} 個`} = ${ansColor}色。`, `答：${ansColor}色。`],
      answerText: `${ansColor}色`,
      context: 'period',
      params: { kind, p, n, cycle },
      sig: `fp|per|${cycle.join('')}|${n}`,
    };
  }
  if (PATTERNS[kind]) {
    const P = PATTERNS[kind];
    const n = Math.max(kind === 'hollow-square' ? 3 : 1, rng.int(...nRange));
    const ans = n0(P.f(n));
    const list = kind === 'hollow-square' ? [2, 3, 4].map((k) => `每邊 ${k} 片要 ${P.f(k)} 片`)
      : kind === 'table-seat' ? [1, 2, 3].map((k) => `${k} 張可以坐 ${P.f(k)} 人`) : [1, 2, 3].map((k) => `${k} 個要 ${P.f(k)} ${P.unit}`);
    const what = kind === 'table-seat' ? `併 ${n} 張可以坐幾人` : kind === 'hollow-square' ? `每邊 ${n} 片要幾片` : `排 ${n} 個要幾根`;
    return {
      prompt: `${nm}用${P.name}：${list.join('、')}……照這樣排，${what}？`,
      parts: [numberPart(ans, misList(ans, P.nomis(n).map(([v, c]) => [() => n0(v), c])), { unit: P.unit })],
      hints: [hint1, `列表看看：每多 1 個，就多 ${P.d} ${P.unit}。第 n 個 = 第 1 個 + (n − 1) × ${P.d}。`],
      explanation: [
        `第 1 步：列表：${list.join('、')}。`,
        `第 2 步：每多 1 個，就多 ${P.d}。`,
        kind === 'hollow-square'
          ? `第 3 步：每邊 ${n} 片，4 條邊共 4 × ${n} 片，但 4 個角各被算了兩次 → 4 × ${n} − 4 = ${P.f(n)}。`
          : `第 3 步：第 ${n} 個 = ${P.f(1)} + (${n} − 1) × ${P.d} = ${P.f(n)}。`,
        `答：${fmt(ans)} ${P.unit}。`,
      ],
      answerText: `${fmt(ans)} ${P.unit}`,
      context: kind,
      params: { kind, n },
      sig: `fp|${kind}|${n}`,
    };
  }
  if (kind === 'square-dots' || kind === 'triangle-dots') {
    const n = rng.int(...nRange);
    const f = kind === 'square-dots' ? (k) => k * k : (k) => (k * (k + 1)) / 2;
    const ans = n0(f(n));
    const name = kind === 'square-dots' ? '正方形點陣' : '三角形點陣';
    return {
      prompt: `${name}的點數依序是 ${[1, 2, 3, 4].map(f).join('、')}、……。第 ${n} 個圖形有幾個點？`,
      parts: [numberPart(ans, misList(ans, kind === 'square-dots' ? [[() => n0(4 * n), 'M-pattern-no-start'], [() => n0(2 * n), 'K-calc']] : [[() => n0(n * (n + 1)), 'M-double-count'], [() => n0(n * n), 'K-calc']]), { unit: '個' })],
      hints: [hint1, kind === 'square-dots' ? '第 n 個是 n 排、每排 n 個。' : '第 n 個是 1 + 2 + … + n 個點。'],
      explanation: [kind === 'square-dots' ? `第 ${n} 個是 ${n} 排、每排 ${n} 個：${n} × ${n} = ${f(n)}。` : `第 ${n} 個 = 1 + 2 + … + ${n} = (1 + ${n}) × ${n} ÷ 2 = ${f(n)}。`, `答：${fmt(ans)} 個。`],
      answerText: `${fmt(ans)} 個`,
      context: kind,
      params: { kind, n },
      sig: `fp|${kind}|${n}`,
    };
  }
  if (kind.startsWith('reverse')) {
    const base = kind === 'reverse-match' ? 'matchstick-square' : kind === 'reverse-table' ? 'table-seat' : null;
    const n = rng.int(20, 100);
    if (base) {
      const P = PATTERNS[base];
      const v = P.f(n);
      const ans = n0(n);
      const prompt = base === 'matchstick-square'
        ? `用火柴棒排一排正方形：1 個要 4 根、2 個要 7 根、3 個要 10 根……。用了 ${v} 根火柴，排了幾個正方形？`
        : `長桌併成一排：1 張坐 6 人、2 張坐 10 人……。要讓 ${v} 人剛好坐滿，要併幾張桌子？`;
      return {
        prompt,
        parts: [numberPart(ans, misList(ans, [[() => (v % P.d === 0 ? n0(v / P.d) : null), 'M-pattern-no-start'], [() => n0(n + 1), 'M-pattern-n-not-n-1'], [() => n0(n - 1), 'M-pattern-n-not-n-1']]), { unit: base === 'table-seat' ? '張' : '個' })],
        hints: [hint1, `第 n 個 = ${P.f(1)} + (n − 1) × ${P.d}。反過來：先減掉 ${P.f(1)}，再 ÷ ${P.d}，最後 + 1。`],
        explanation: [`第 1 步：第 n 個 = ${P.f(1)} + (n − 1) × ${P.d}。`, `第 2 步：${v} − ${P.f(1)} = ${v - P.f(1)}，${v - P.f(1)} ÷ ${P.d} = ${n - 1}。`, `第 3 步：n − 1 = ${n - 1} → n = ${n}。`, `答：${n}。`],
        answerText: String(n),
        context: kind,
        params: { kind, n },
        sig: `fp|${kind}|${n}`,
      };
    }
    const a = rng.int(1, 20), d = rng.int(2, 9);
    const v = a + (n - 1) * d;
    const ans = n0(n);
    return {
      prompt: `一列數：${[0, 1, 2, 3].map((i) => a + i * d).join('、')}、……。${v} 是第幾個數？`,
      parts: [numberPart(ans, misList(ans, [[() => n0(n - 1), 'M-pattern-n-not-n-1'], [() => (v % d === 0 ? n0(v / d) : null), 'M-pattern-no-start']]))],
      hints: [hint1, `第 n 個 = ${a} + (n − 1) × ${d}。先算 ${v} − ${a}，再 ÷ ${d}，最後 + 1。`],
      explanation: [`第 1 步：${v} − ${a} = ${v - a}。`, `第 2 步：${v - a} ÷ ${d} = ${n - 1}，表示比第 1 個多了 ${n - 1} 次。`, `第 3 步：第 ${n - 1} + 1 = ${n} 個。`, `答：第 ${n} 個。`],
      answerText: `第 ${n} 個`,
      context: kind,
      params: { kind, a, d, n },
      sig: `fp|ra|${a}|${d}|${n}`,
    };
  }
  if (kind === 'arith-sum') {
    const a = rng.int(1, 20), d = rng.int(2, 9), n = rng.int(10, 50);
    const last = a + (n - 1) * d;
    const ans = n0(((a + last) * n) / 2);
    return {
      prompt: `一列數：${[0, 1, 2, 3].map((i) => a + i * d).join('、')}、……，一共 ${n} 個數。這 ${n} 個數的總和是多少？`,
      parts: [numberPart(ans, misList(ans, [[() => n0((a + last) * n), 'M-double-count'], [() => n0(last * n), 'K-calc'], [() => n0(((a + a + n * d) * n) / 2), 'M-pattern-n-not-n-1']]))],
      hints: ['先找出最後一個數，再用「(首項 + 末項) × 項數 ÷ 2」。', `最後一個 = ${a} + (${n} − 1) × ${d}。`],
      explanation: [`第 1 步：最後一個 = ${a} + (${n} − 1) × ${d} = ${last}。`, `第 2 步：總和 = (${a} + ${last}) × ${n} ÷ 2 = ${fmt(ans)}。`, `答：${fmt(ans)}。`],
      answerText: fmt(ans),
      context: kind,
      params: { kind, a, d, n },
      sig: `fp|sum|${a}|${d}|${n}`,
    };
  }
  // count-shapes
  const n = rng.int(4, 20);
  const ans = n0((n * (n + 1)) / 2);
  return {
    prompt: `一排有 ${n} 個一樣大的小正方形連在一起。圖中大大小小的長方形（含正方形）共有幾個？`,
    parts: [numberPart(ans, misList(ans, [[() => n0(n), 'C-condition'], [() => n0(n * (n + 1)), 'M-double-count'], [() => n0(n * n), 'K-calc']]), { unit: '個' })],
    hints: ['用小數字試：1 個小正方形有 1 個；2 個有 3 個；3 個呢？', `1 格的有 ${n} 個、2 格的有 ${n - 1} 個……，全部加起來 = 1 + 2 + … + ${n}。`],
    explanation: [`第 1 步：1 格的有 ${n} 個，2 格的有 ${n - 1} 個，……，${n} 格的有 1 個。`, `第 2 步：共 1 + 2 + … + ${n} = (1 + ${n}) × ${n} ÷ 2 = ${fmt(ans)}。`, `答：${fmt(ans)} 個。`],
    answerText: `${fmt(ans)} 個`,
    context: kind,
    params: { kind, n },
    sig: `fp|cs|${n}`,
  };
}

// ===========================================================================
// 題型 3：combinations 選擇與組合
// ===========================================================================
function combinations(level, rng) {
  const kinds = level === 1 ? ['product', 'add-rule'] : level === 2 ? ['product', 'route'] : level === 3 ? ['product3', 'arrange', 'choose2']
    : level === 4 ? ['digits', 'route-direct', 'choose2'] : ['arrange-fixed', 'digits'];
  const kind = rng.pick(kinds);
  const [nm] = pickNames(rng, 1);
  const hint1 = '用藍色筆點條件：「不能重複」「每兩隊比一場」「一定要」。先想想：順序會不會造成不同？';
  if (kind === 'product' || kind === 'add-rule' || kind === 'product3') {
    const hi = level === 1 ? 4 : 6;
    const a = rng.int(2, hi), b = rng.int(2, hi), c = kind === 'product3' ? rng.int(2, 4) : null;
    const isAdd = kind === 'add-rule';
    const ans = n0(isAdd ? a + b : a * b * (c || 1));
    const prompt = isAdd
      ? `學校午餐有 ${a} 種飯和 ${b} 種麵，每人只能選一種。共有幾種選法？`
      : c ? `${nm}有 ${a} 件上衣、${b} 件褲子、${c} 雙鞋子。上衣、褲子、鞋子各選一樣搭配，有幾種穿法？`
        : `${nm}有 ${a} 件上衣、${b} 件褲子。一件上衣配一條褲子，有幾種穿法？`;
    const mis = misList(ans, isAdd ? [[() => n0(a * b), 'M-add-vs-mult']] : [[() => n0(a + b + (c || 0)), 'M-add-vs-mult'], ...(c ? [[() => n0(a * b), 'C-condition']] : [])]);
    return {
      prompt,
      parts: [numberPart(ans, mis, { unit: '種' })],
      hints: [hint1, isAdd ? '只選一種：飯或麵選一個，所以是「加起來」。' : `先固定第一件上衣：可以配 ${b} 件褲子；每一件上衣都一樣，所以是 ${a} × ${b}${c ? ` × ${c}` : ''}。`],
      explanation: isAdd
        ? [`第 1 步：只能選一種，飯有 ${a} 種、麵有 ${b} 種。`, `第 2 步：選法 = ${a} + ${b} = ${a + b}。`, `答：${a + b} 種。`]
        : [`第 1 步：上衣有 ${a} 種選法。`, `第 2 步：每一件上衣都可以配 ${b} 件褲子${c ? `，再配 ${c} 雙鞋子` : ''}。`, `第 3 步：相乘：${a} × ${b}${c ? ` × ${c}` : ''} = ${fmt(ans)}。`, `答：${fmt(ans)} 種。`],
      answerText: `${fmt(ans)} 種`,
      context: kind,
      helper: helperSpec({ goal: [isAdd ? '共有幾種選法' : '有幾種穿法', isAdd ? '有幾種飯' : '有幾件上衣', isAdd ? '有幾種麵' : '有幾件褲子'], known: [a, b, ...(c ? [c] : [])].map(String), ops: isAdd ? [`${a} + ${b}`, `${a} × ${b}`, `${a} − ${b}`] : [c ? `${a} × ${b} × ${c}` : `${a} × ${b}`, c ? `${a} + ${b} + ${c}` : `${a} + ${b}`, c ? `${a} × ${b}` : `${a} × ${a}`] }),
      params: { kind, a, b, c },
      sig: `cb|${kind}|${a}|${b}|${c}`,
    };
  }
  if (kind === 'route' || kind === 'route-direct') {
    const a = rng.int(2, 6), b = rng.int(2, 6), c = kind === 'route-direct' ? rng.int(1, 4) : 0;
    const ans = n0(a * b + c);
    return {
      prompt: `從家到公園有 ${a} 條路，從公園到圖書館有 ${b} 條路${c ? `；另外從家直接到圖書館還有 ${c} 條路` : ''}。從家到圖書館共有幾種走法？`,
      parts: [numberPart(ans, misList(ans, [[() => n0(a + b + c), 'M-add-vs-mult'], ...(c ? [[() => n0(a * b), 'C-condition']] : [])]), { unit: '種' })],
      hints: [hint1, `經過公園：${a} × ${b} 種${c ? `；直達：${c} 種，兩種方式要加起來` : ''}。`],
      explanation: [`第 1 步：經過公園：每一條「家→公園」的路都能接 ${b} 條「公園→圖書館」的路 → ${a} × ${b} = ${a * b}。`, ...(c ? [`第 2 步：直接到：${c} 條。兩種方式加起來：${a * b} + ${c} = ${a * b + c}。`] : []), `答：${fmt(ans)} 種。`],
      answerText: `${fmt(ans)} 種`,
      context: kind,
      helper: helperSpec({ goal: ['從家到圖書館有幾種走法', '從家到公園有幾條路', '從公園到圖書館有幾條路'], known: [a, b, ...(c ? [c] : [])].map(String), ops: [c ? `${a} × ${b} + ${c}` : `${a} × ${b}`, `${a} + ${b}${c ? ` + ${c}` : ''}`, c ? `${a} × ${b}` : `${a} × ${a}`] }),
      params: { kind, a, b, c },
      sig: `cb|${kind}|${a}|${b}|${c}`,
    };
  }
  if (kind === 'arrange' || kind === 'arrange-fixed') {
    const n = kind === 'arrange' ? rng.int(3, 4) : rng.int(4, 6);
    const fact = (k) => (k <= 1 ? 1 : k * fact(k - 1));
    const fixed = kind === 'arrange-fixed';
    const ans = n0(fixed ? fact(n - 1) : fact(n));
    const prompt = fixed
      ? `${n} 位同學排成一列照相，${nm}一定要站在最左邊。共有幾種排法？`
      : `${n} 位同學排成一列照相，共有幾種排法？`;
    return {
      prompt,
      parts: [numberPart(ans, misList(ans, [[() => n0(n * n), 'M-add-vs-mult'], [() => n0(fixed ? fact(n) : n), 'C-condition'], [() => n0(fixed ? (n - 1) * (n - 1) : n * (n - 1)), 'K-calc']]), { unit: '種' })],
      hints: [hint1, fixed ? `${nm}的位置已經固定，剩下 ${n - 1} 人排其他位置。` : `第 1 個位置有 ${n} 種選法，第 2 個位置剩 ${n - 1} 種……`],
      explanation: [fixed ? `第 1 步：${nm}站最左邊，只有 1 種。剩下 ${n - 1} 人排 ${n - 1} 個位置。` : `第 1 步：第 1 個位置有 ${n} 種選法。`, `第 2 步：${Array.from({ length: fixed ? n - 1 : n }, (_, i) => (fixed ? n - 1 : n) - i).join(' × ')} = ${fmt(ans)}。`, `答：${fmt(ans)} 種。`],
      answerText: `${fmt(ans)} 種`,
      context: kind,
      helper: helperSpec({ goal: ['共有幾種排法', '有幾位同學', '有幾個位置'], known: [String(n)], ops: [Array.from({ length: fixed ? n - 1 : n }, (_, i) => (fixed ? n - 1 : n) - i).join(' × '), `${n} × ${n}`, `${n} + ${n - 1}`] }),
      params: { kind, n },
      sig: `cb|${kind}|${n}`,
    };
  }
  if (kind === 'choose2') {
    const n = rng.int(4, level === 3 ? 8 : 12);
    const ans = n0((n * (n - 1)) / 2);
    return {
      prompt: `社區籃球賽有 ${n} 隊進行單循環比賽，每兩隊都要比一場。共要比幾場？`,
      parts: [numberPart(ans, misList(ans, [[() => n0(n * (n - 1)), 'M-double-count'], [() => n0(n * n), 'M-add-vs-mult'], [() => n0(n - 1), 'C-condition']]), { unit: '場' })],
      hints: [hint1, `每隊都要和其他 ${n - 1} 隊比，但 A 對 B 和 B 對 A 是同一場，所以要 ÷ 2。`],
      explanation: [`第 1 步：每隊要和其他 ${n - 1} 隊比 → ${n} × ${n - 1} = ${n * (n - 1)}。`, `第 2 步：每一場被算了兩次 → ${n * (n - 1)} ÷ 2 = ${fmt(ans)}。`, `答：${fmt(ans)} 場。`],
      answerText: `${fmt(ans)} 場`,
      context: kind,
      helper: helperSpec({ goal: ['共要比幾場', '有幾隊', '每隊比幾場'], known: [String(n)], ops: [`${n} × ${n - 1} ÷ 2`, `${n} × ${n - 1}`, `${n} × ${n}`] }),
      params: { kind, n },
      sig: `cb|c2|${n}`,
    };
  }
  // digits：用 0 和其他數字卡排不重複的三位數（或二位數）
  const cards = rng.int(3, 5);
  const digits = 3 <= cards ? (level === 5 ? 3 : rng.pick([2, 3])) : 2;
  const others = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], cards - 1).sort((x, y) => x - y);
  const all = [0, ...others];
  const perm = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r *= n - i; return r; };
  const total = perm(cards, digits);
  const ans = n0(total - perm(cards - 1, digits - 1));
  return {
    prompt: `用 ${all.join('、')} 這 ${cards} 張數字卡，排出不重複使用卡片的${digits === 3 ? '三' : '二'}位數，共可以排出幾個？`,
    parts: [numberPart(ans, misList(ans, [[() => n0(total), 'M-leading-zero'], [() => n0(cards ** digits), 'M-add-vs-mult']]), { unit: '個' })],
    hints: [hint1, `最高位不能是 0：最高位有 ${cards - 1} 種選法，下一位剩 ${cards - 1} 種……`],
    explanation: [
      `第 1 步：最高位不能放 0 → 有 ${cards - 1} 種選法。`,
      `第 2 步：下一位可以放 0，但不能和最高位重複 → ${cards - 1} 種${digits === 3 ? `；第三位 ${cards - 2} 種` : ''}。`,
      `第 3 步：${cards - 1} × ${cards - 1}${digits === 3 ? ` × ${cards - 2}` : ''} = ${fmt(ans)}。`,
      `答：${fmt(ans)} 個。`,
    ],
    answerText: `${fmt(ans)} 個`,
    context: 'digits',
    helper: helperSpec({ goal: ['共可以排出幾個數', '有幾張卡片', '最大的數是多少'], known: [...all.map(String)], ops: [`${cards - 1} × ${cards - 1}${digits === 3 ? ` × ${cards - 2}` : ''}`, `${cards} × ${cards - 1}${digits === 3 ? ` × ${cards - 2}` : ''}`, `${cards} × ${cards}${digits === 3 ? ` × ${cards}` : ''}`] }),
    params: { kind: 'digits', cards, digits, all },
    sig: `cb|dg|${all.join('')}|${digits}`,
  };
}

// ===========================================================================
// 題型 4：sum-difference 和差、和倍、差倍
// ===========================================================================
function sumDifference(level, rng) {
  const kinds = level === 2 ? ['sum-diff'] : level === 3 ? ['sum-diff', 'sum-times', 'avg-diff'] : level === 4 ? ['diff-times', 'transfer'] : ['three', 'age'];
  const kind = rng.pick(kinds);
  const [n1, n2, n3] = pickNames(rng, 3);
  const hint1 = '用黃色筆點「要求誰」，藍色筆點「共」和「多」後面的數。題目要的是大的那個，還是小的那個？';
  const max = { 2: 50, 3: 500, 4: 1000, 5: 3000 }[level];
  if (kind === 'sum-diff' || kind === 'avg-diff' || kind === 'age') {
    const small = rng.int(level === 2 ? 5 : 10, level === 2 ? 50 : Math.floor(max / 3));
    const D = rng.int(2, level === 2 ? 30 : Math.floor(max / 4));
    const big = small + D;
    let S = small + big;
    if (kind === 'avg-diff' && S % 2 !== 0) throw new GenRetry('平均');
    const askBig = rng.chance(0.5);
    const ans = n0(askBig ? big : small);
    let prompt, unit = '元';
    if (kind === 'sum-diff') prompt = `${n1}和${n2}共存了 ${S} 元，${n1}比${n2}多 ${D} 元。${askBig ? n1 : n2}存了多少元？`;
    else if (kind === 'avg-diff') prompt = `${n1}和${n2}兩人存款的平均是 ${S / 2} 元，${n1}比${n2}多 ${D} 元。${askBig ? n1 : n2}存了多少元？`;
    else {
      const sm = rng.int(8, 15), dd = rng.int(25, 35);
      const years = rng.int(2, 6);
      S = sm + years + sm + dd + years;
      const ansAge = n0(askBig ? sm + dd : sm);
      unit = '歲';
      return {
        prompt: `今年爸爸比${n1}大 ${dd} 歲。${years} 年後，兩人的年齡合起來是 ${S} 歲。今年${askBig ? '爸爸' : n1}幾歲？`,
        parts: [numberPart(ansAge, misList(ansAge, [[() => n0(askBig ? sm + dd + years : sm + years), 'C-goal'], [() => n0((S + dd) / 2), 'C-step-missed'], [() => n0((S - dd) / 2), 'C-step-missed'], [() => n0(S + dd), 'M-sum-diff-no-half']]), { unit })],
        hints: ['年齡差永遠不變。先算出幾年後兩人各幾歲，再往回推。', `${years} 年後：小的 = (${S} − ${dd}) ÷ 2。今年再減 ${years}。`],
        explanation: [
          `第 1 步：${years} 年後，兩人仍差 ${dd} 歲、合起來 ${S} 歲。`,
          `第 2 步：${years} 年後${n1} = (${S} − ${dd}) ÷ 2 = ${(S - dd) / 2} 歲，爸爸 = ${(S + dd) / 2} 歲。`,
          `第 3 步：今年各減 ${years}：${n1} ${sm} 歲、爸爸 ${sm + dd} 歲。`,
          `答：${fmt(ansAge)} 歲。`,
        ],
        answerText: `${fmt(ansAge)} 歲`,
        context: 'age',
        helper: helperSpec({ goal: [`今年${askBig ? '爸爸' : n1}幾歲`, `${years} 年後${askBig ? '爸爸' : n1}幾歲`, '兩人的年齡差'], known: [String(dd), String(years), String(S)], ops: [askBig ? `(${S} + ${dd}) ÷ 2 − ${years}` : `(${S} − ${dd}) ÷ 2 − ${years}`, askBig ? `(${S} + ${dd}) ÷ 2` : `(${S} − ${dd}) ÷ 2`, `${S} − ${dd}`] }),
        params: { kind, sm, dd, years, askBig },
        sig: `sd|age|${sm}|${dd}|${years}|${askBig}`,
      };
    }
    const mis = misList(ans, [[() => n0(S + D), 'M-sum-diff-no-half'], [() => n0(askBig ? small : big), 'C-goal'], [() => n0(S / 2), 'C-condition'], ...(kind === 'avg-diff' ? [[() => F(askBig ? S / 2 + D : S / 2 - D, 2), 'M-avg-total']] : [])]);
    return {
      prompt,
      parts: [numberPart(ans, mis, { unit })],
      hints: [hint1, `畫兩條線段：大的比小的長 ${D}。把多出來的那段剪掉，兩條就一樣長：(${S} − ${D}) ÷ 2 = 小的。`],
      explanation: [
        ...(kind === 'avg-diff' ? [`第 0 步：平均 ${S / 2} 元，兩人合起來 = ${S / 2} × 2 = ${S} 元。`] : []),
        `第 1 步：要求什麼？→ ${askBig ? n1 : n2}（${askBig ? '大' : '小'}的那個）。`,
        `第 2 步：把多出來的 ${D} 拿掉：${S} − ${D} = ${S - D}，兩條一樣長。`,
        `第 3 步：小 = ${S - D} ÷ 2 = ${small}，大 = ${small} + ${D} = ${big}。`,
        `第 4 步：驗算：${big} + ${small} = ${S} ✓，${big} − ${small} = ${D} ✓`,
        `答：${fmt(ans)} ${unit}。`,
      ],
      answerText: `${fmt(ans)} ${unit}`,
      context: kind,
      helper: helperSpec({ goal: [`${askBig ? n1 : n2}存了多少元`, `${askBig ? n2 : n1}存了多少元`, '兩人一共存了多少元'], known: kind === 'avg-diff' ? [String(S / 2), String(D)] : [String(S), String(D)], ops: [askBig ? `(${kind === 'avg-diff' ? `${S / 2} × 2` : S} + ${D}) ÷ 2` : `(${kind === 'avg-diff' ? `${S / 2} × 2` : S} − ${D}) ÷ 2`, `${kind === 'avg-diff' ? S / 2 : S} + ${D}`, `${kind === 'avg-diff' ? S / 2 : S} ÷ 2`] }),
      params: { kind, small, D, askBig },
      sig: `sd|${kind}|${small}|${D}|${askBig}`,
    };
  }
  if (kind === 'sum-times' || kind === 'diff-times') {
    const k = rng.int(2, 5);
    const small = rng.int(5, Math.floor(max / (k + 1)));
    const big = small * k;
    const S = small + big, D = big - small;
    const askSmall = rng.chance(0.6);
    const ans = n0(askSmall ? small : big);
    const isSum = kind === 'sum-times';
    const prompt = isSum
      ? `兩箱書共 ${S} 本，第一箱是第二箱的 ${k} 倍。${askSmall ? '第二箱' : '第一箱'}有幾本？`
      : `第一箱書比第二箱多 ${D} 本，第一箱是第二箱的 ${k} 倍。${askSmall ? '第二箱' : '第一箱'}有幾本？`;
    const mis = misList(ans, isSum
      ? [[() => (S % k === 0 ? n0(S / k) : null), 'M-parts-count'], [() => n0(askSmall ? big : small), 'C-goal']]
      : [[() => (D % k === 0 ? n0(D / k) : null), 'M-parts-count'], [() => (D % (k + 1) === 0 ? n0(D / (k + 1)) : null), 'M-parts-count'], [() => n0(askSmall ? big : small), 'C-goal']]);
    return {
      prompt,
      parts: [numberPart(ans, mis, { unit: '本' })],
      hints: [hint1, isSum ? `第二箱是 1 份，第一箱是 ${k} 份，合起來 ${k} + 1 = ${k + 1} 份。` : `第二箱是 1 份，第一箱是 ${k} 份，相差 ${k} − 1 = ${k - 1} 份。`],
      explanation: [
        `第 1 步：第二箱是 1 份，第一箱是 ${k} 份。`,
        isSum ? `第 2 步：合起來 ${k + 1} 份 = ${S} 本，1 份 = ${S} ÷ ${k + 1} = ${small}。` : `第 2 步：相差 ${k - 1} 份 = ${D} 本，1 份 = ${D} ÷ ${k - 1} = ${small}。`,
        `第 3 步：第二箱 ${small} 本，第一箱 ${small} × ${k} = ${big} 本。`,
        `答：${fmt(ans)} 本。`,
      ],
      answerText: `${fmt(ans)} 本`,
      context: kind,
      helper: helperSpec({ goal: [`${askSmall ? '第二箱' : '第一箱'}有幾本`, `${askSmall ? '第一箱' : '第二箱'}有幾本`, isSum ? '兩箱相差幾本' : '兩箱一共幾本'], known: [String(isSum ? S : D), String(k)], ops: [isSum ? `${S} ÷ (${k} + 1)${askSmall ? '' : ` × ${k}`}` : `${D} ÷ (${k} − 1)${askSmall ? '' : ` × ${k}`}`, isSum ? `${S} ÷ ${k}` : `${D} ÷ ${k}`, isSum ? `${S} − ${k}` : `${D} × ${k}`] }),
      params: { kind, k, small, askSmall },
      sig: `sd|${kind}|${k}|${small}|${askSmall}`,
    };
  }
  if (kind === 'transfer') {
    const x = rng.int(2, 50);
    const small = rng.int(5, Math.floor(max / 3));
    const big = small + 2 * x;
    const S = small + big;
    const askBig = rng.chance(0.6);
    const ans = n0(askBig ? big : small);
    const mis = misList(ans, [[() => n0(askBig ? (S + x) / 2 : (S - x) / 2), 'M-transfer-diff'], [() => n0(S / 2), 'C-goal'], [() => n0(askBig ? small : big), 'C-goal']]);
    return {
      prompt: `哥哥給弟弟 ${x} 顆彈珠後，兩人的彈珠一樣多。兩人共有 ${S} 顆，${askBig ? '哥哥' : '弟弟'}原來有幾顆？`,
      parts: [numberPart(ans, mis, { unit: '顆' })],
      hints: [hint1, `給出 ${x} 顆後一樣多 → 哥哥少了 ${x}、弟弟多了 ${x}，所以原本相差 2 × ${x} = ${2 * x}。`],
      explanation: [
        `第 1 步：給了以後一樣多：每人 ${S} ÷ 2 = ${S / 2} 顆。`,
        `第 2 步：哥哥原來 = ${S / 2} + ${x} = ${big} 顆，弟弟原來 = ${S / 2} − ${x} = ${small} 顆。`,
        `第 3 步：原本相差 ${big} − ${small} = ${2 * x}，是 ${x} 的 2 倍 ✓`,
        `答：${fmt(ans)} 顆。`,
      ],
      answerText: `${fmt(ans)} 顆`,
      context: kind,
      helper: helperSpec({ goal: [`${askBig ? '哥哥' : '弟弟'}原來有幾顆`, `${askBig ? '弟弟' : '哥哥'}原來有幾顆`, '給了以後每人幾顆'], known: [String(x), String(S)], ops: [askBig ? `${S} ÷ 2 + ${x}` : `${S} ÷ 2 − ${x}`, askBig ? `(${S} + ${x}) ÷ 2` : `(${S} − ${x}) ÷ 2`, `${S} ÷ 2`] }),
      params: { kind, x, small },
      sig: `sd|tr|${x}|${small}|${askBig}`,
    };
  }
  // three：甲比乙多 p、乙比丙多 q，三人共 S
  const c = rng.int(10, Math.floor(max / 4));
  const q = rng.int(2, 100), p = rng.int(2, 100);
  const b = c + q, a = b + p;
  const S = a + b + c;
  const idx = rng.int(0, 2);
  const ans = n0([a, b, c][idx]);
  const mis = misList(ans, [[() => (S % 3 === 0 ? n0(S / 3) : null), 'C-condition'], ...[0, 1, 2].filter((i) => i !== idx).map((i) => [() => n0([a, b, c][i]), 'C-goal']), [() => ((S - p - q) % 3 === 0 ? n0((S - p - q) / 3) : null), 'K-calc']]);
  return {
    prompt: `${n1}比${n2}多 ${p} 元，${n2}比${n3}多 ${q} 元，三人共有 ${S} 元。${[n1, n2, n3][idx]}有多少元？`,
    parts: [numberPart(ans, mis, { unit: '元' })],
    hints: [hint1, `以${n3}為基準：${n2} = ${n3} + ${q}，${n1} = ${n3} + ${q} + ${p}。三人合起來比 3 個${n3}多了多少？`],
    explanation: [
      `第 1 步：以${n3}為基準：${n2}多 ${q}，${n1}多 ${q} + ${p} = ${p + q}。`,
      `第 2 步：三人合起來比 3 個${n3}多 ${q} + ${p + q} = ${p + 2 * q}。`,
      `第 3 步：${n3} = (${S} − ${p + 2 * q}) ÷ 3 = ${c}；${n2} = ${b}；${n1} = ${a}。`,
      `答：${fmt(ans)} 元。`,
    ],
    answerText: `${fmt(ans)} 元`,
    context: kind,
    helper: helperSpec({ goal: [`${[n1, n2, n3][idx]}有多少元`, '三人一共有多少元', `${[n1, n2, n3][(idx + 1) % 3]}有多少元`], known: [String(p), String(q), String(S)], ops: [`(${S} − ${p} − ${q} × 2) ÷ 3，再加回去`, `${S} ÷ 3`, `(${S} − ${p} − ${q}) ÷ 3`] }),
    params: { kind, a, b, c, idx },
    sig: `sd|three|${c}|${p}|${q}|${idx}`,
  };
}

export default {
  unitId: UNIT_ID,
  types: {
    'interval-problem': { levels: [1, 2, 3, 4, 5], isWordProblem: true, generate: intervalProblem },
    'figure-pattern': { levels: [1, 2, 3, 4, 5], isWordProblem: false, generate: figurePattern },
    combinations: { levels: [1, 2, 3, 4, 5], isWordProblem: true, generate: combinations },
    'sum-difference': { levels: [2, 3, 4, 5], isWordProblem: true, generate: sumDifference },
  },
};
