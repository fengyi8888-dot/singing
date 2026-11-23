// 產生器：g6-two-quantity 兩量關係（翰林 6上-第5單元）
// 規格：projects/math-quest/curriculum/specs/g6-two-quantity.md
// 原則：先選比值，再選基準量（或答案），最後才算出題目裡的數字，保證整除。
import { Frac, F, lcm } from '../core/frac.js';
import {
  pickNames, pickRatio, pickMultiple, ratioOf, fmt, misList, choiceMis, numberPart,
  segs, joinSegs, GenRetry, helperSpec,
} from './common.js';

const UNIT_ID = 'g6-two-quantity';

// 共用：讀題策略提示 1（所有應用題的提示 1 先教讀題）
const BASE_RANGE = { 1: [10, 200], 2: [10, 200], 3: [20, 1200], 4: [20, 1200], 5: [20, 3000] };

const lt1 = (v) => v.lt(1);
const gt1 = (v) => v.gt(1);
const neq1 = (v) => !v.eq(1);

function cmpWord(r) { return r.value.lt(1) ? ['小於', '少'] : ['大於', '多']; }

function times(a, r) { return `${fmt(a)} × ${r.text}`; }

function divideExpr(A, r) {
  if (r.kind === 'int') return `${fmt(A)} ÷ ${r.text}`;
  return `${fmt(A)} ÷ ${r.text} = ${fmt(A)} × ${r.value.inv().toFracString()}`;
}

// ===========================================================================
// 題型 1：tap-base-quantity 點出基準量
// ===========================================================================
const PLANTS = ['向日葵', '小番茄苗', '玉米', '豆苗', '絲瓜藤', '九層塔'];

function entityPool(context, rng, k) {
  if (context === 'money') {
    return pickNames(rng, k).map((n) => ({
      name: n,
      subj: [{ text: n, tap: n }, { text: '存的錢' }],
      obj: [{ text: n, tap: n }],
      poss: [{ text: n, tap: n }, { text: '存的錢' }],
      label: `${n}存的錢`,
    }));
  }
  if (context === 'plant') {
    return rng.sample(PLANTS, k).map((p) => ({
      name: p,
      subj: [{ text: p, tap: p }, { text: '的高度' }],
      obj: [{ text: p, tap: p }],
      poss: [{ text: p, tap: p }, { text: '高度' }],
      label: `${p}的高度`,
    }));
  }
  // class：只有兩個量
  const pair = rng.shuffle([['女生', '女生人數'], ['男生', '男生人數']]);
  return pair.map(([n, label], i) => ({
    name: n,
    subj: [...(i === 0 ? [{ text: '六年二班' }] : []), { text: n, tap: n }, { text: '人數' }],
    obj: [{ text: n, tap: n }, { text: '人數' }],
    poss: [...(i === 0 ? [{ text: '六年二班' }] : []), { text: n, tap: n }, { text: '人數' }],
    label,
  }));
}

const VERB = { money: ['多', '少'], plant: ['高', '矮'], class: ['多', '少'] };

function tapBase(level, rng) {
  if (level === 3 && rng.chance(0.5)) return tapBaseMoreLess(rng);
  if (level === 3) return tapBaseChain(rng);

  const context = rng.pick(['money', 'plant', 'class']);
  const r = level === 1 ? pickRatio(rng, ['int']) : pickRatio(rng, ['frac', 'dec']);
  const [A, B] = entityPool(context, rng, 2);
  const baseFirst = level === 2 && rng.chance(0.5);
  const sentence = baseFirst
    ? segs(B.poss, '的 ', { text: r.phrase, tap: '#r' }, '是', A.subj, '。')
    : segs(A.subj, '是', B.obj, '的 ', { text: r.phrase, tap: '#r' }, '。');
  const ask = segs('在這句話裡，誰是基準量？請點一下。');
  const sentenceText = joinSegs(sentence);
  const part = {
    id: 'a', kind: 'tap', label: '點出基準量', answer: B.name,
    misconceptions: [{ value: A.name, code: 'C-base-swap' }, { value: '#r', code: 'C-goal' }],
  };
  const rewrite = baseFirst ? `這句話可以改寫成：「${A.label}是${B.label}的${r.phrase}」。` : null;
  return {
    segments: [...sentence, { text: '\n' }, ...ask],
    parts: [part],
    hints: [
      '找找看句子裡的「是＿＿的」。空格裡的那個，就是被當成標準、看成 1 的量。',
      `「${A.label}是${B.name}的${r.phrase}」：拿${B.name}當標準，所以${B.name}是基準量。`,
    ],
    explanation: [
      `這句話是：「${sentenceText}」`,
      ...(rewrite ? [rewrite] : []),
      `第 1 步：找「是＿＿的」。空格裡是「${B.name}」。`,
      `第 2 步：${B.name}被拿來當標準，看成 1 → ${B.name}是基準量。`,
      `第 3 步：${A.name}是拿去跟${B.name}比的 → ${A.name}是比較量。`,
    ],
    answerText: B.name,
    context,
    params: { variant: 'simple', context, ratioKind: r.kind, ratio: r.value, baseFirst, base: B.name, compare: A.name },
    sig: `tap|${context}|${A.name}|${B.name}|${r.value.toFracString()}`,
  };
}

function tapBaseChain(rng) {
  const context = rng.pick(['money', 'plant']);
  const [X, Y, Z] = entityPool(context, rng, 3);
  const kinds = ['int', 'frac', 'dec', 'improper', 'pct'];
  const r1 = pickRatio(rng, kinds);
  let r2 = pickRatio(rng, kinds);
  if (r2.value.eq(r1.value) || r2.value.eq(r1.value.inv())) r2 = pickRatio(rng, kinds, (v) => !v.eq(r1.value) && !v.eq(r1.value.inv()));
  // 第 1 句：X 是 Y 的 r1；第 2 句：Z 是 X 的 r2
  const s1 = segs(X.subj, '是', Y.obj, '的 ', { text: r1.phrase, tap: '#r1' }, '。');
  const s2 = segs(Z.subj, '是', X.obj, '的 ', { text: r2.phrase, tap: '#r2' }, '。');
  const k = rng.pick([1, 2]);
  const [cmp, base, other, r, rOther] = k === 1 ? [X, Y, Z, r1, r2] : [Z, X, Y, r2, r1];
  const ask = segs(`第 ${k} 句裡，誰是基準量？請點一下。`);
  const ratioOptions = buildRatioOptions(r.value, [
    [r.value.inv(), 'C-base-swap'],
    [rOther.value, 'C-info'],
  ]);
  return {
    segments: [...s1, ...s2, { text: '\n' }, ...ask],
    parts: [
      {
        id: 'a', kind: 'tap', label: `第 ${k} 句的基準量`, answer: base.name,
        misconceptions: [
          { value: cmp.name, code: 'C-base-swap' },
          { value: other.name, code: 'C-info' },
          { value: '#r1', code: 'C-goal' }, { value: '#r2', code: 'C-goal' },
        ],
      },
      { id: 'b', kind: 'choice', label: `第 ${k} 句的比值（比較量 ÷ 基準量）是多少？`, ...ratioOptions },
    ],
    hints: [
      `先只看第 ${k} 句。找找看句子裡的「是＿＿的」，空格裡的那個就是被當成標準、看成 1 的量。`,
      `「${cmp.label}是${base.name}的${r.phrase}」：拿${base.name}當標準，所以${base.name}是基準量。`,
    ],
    explanation: [
      `第 ${k} 句是：「${cmp.label}是${base.name}的${r.phrase}」`,
      `第 1 步：找「是＿＿的」。空格裡是「${base.name}」。`,
      `第 2 步：${base.name}被拿來當標準，看成 1 → ${base.name}是基準量。`,
      `第 3 步：${cmp.name}是拿去跟${base.name}比的 → ${cmp.name}是比較量。`,
      `比值 = 比較量 ÷ 基準量 = ${r.value.toFracString()}。`,
    ],
    answerText: `${base.name}；比值 ${r.value.toFracString()}`,
    context,
    params: { variant: 'chain', context, sentence: k, r1: r1.value, r2: r2.value, ratio: r.value, base: base.name, compare: cmp.name },
    sig: `tapc|${X.name}|${Y.name}|${Z.name}|${r1.value.toFracString()}|${r2.value.toFracString()}|${k}`,
  };
}

function tapBaseMoreLess(rng) {
  const context = rng.pick(['money', 'plant', 'class']);
  const [A, B] = entityPool(context, rng, 2);
  const more = rng.chance(0.5);
  const pq = pickRatio(rng, ['frac']).value;
  const verb = VERB[context][more ? 0 : 1];
  const ratio = more ? F(1).add(pq) : F(1).sub(pq);
  const other = more ? F(1).sub(pq) : F(1).add(pq);
  const sentence = segs(A.subj, '比', B.obj, verb, B.obj, '的 ', { text: pq.toFracString(), tap: '#r' }, '。');
  const ask = segs('誰是基準量？請點一下。');
  const ratioOptions = buildRatioOptions(ratio, [
    [pq, 'M-add-ratio'],
    [ratio.inv(), 'C-base-swap'],
    [other, 'C-goal'],
  ]);
  const sentenceText = joinSegs(sentence);
  return {
    segments: [...sentence, { text: '\n' }, ...ask],
    parts: [
      {
        id: 'a', kind: 'tap', label: '點出基準量', answer: B.name,
        misconceptions: [{ value: A.name, code: 'C-base-swap' }, { value: '#r', code: 'C-goal' }],
      },
      { id: 'b', kind: 'choice', label: `${A.label}是${B.label}的幾倍？（比值 = 比較量 ÷ 基準量）`, ...ratioOptions },
    ],
    hints: [
      `找找看「比＿＿${verb}」。空格裡的那個，就是被當成標準、看成 1 的量。`,
      `「${A.label}比${B.name}${verb}${B.name}的 ${pq.toFracString()}」：拿${B.name}當標準，所以${B.name}是基準量。${B.name}是 1，${A.name}是 1 ${more ? '+' : '−'} ${pq.toFracString()}。`,
    ],
    explanation: [
      `這句話是：「${sentenceText}」`,
      `第 1 步：找「比＿＿${verb}」。空格裡是「${B.name}」。`,
      `第 2 步：${B.name}被拿來當標準，看成 1 → ${B.name}是基準量。`,
      `第 3 步：${A.name}是拿去跟${B.name}比的 → ${A.name}是比較量。`,
      `比值 = 比較量 ÷ 基準量 = 1 ${more ? '+' : '−'} ${pq.toFracString()} = ${ratio.toFracString()}。`,
    ],
    answerText: `${B.name}；比值 ${ratio.toFracString()}`,
    context,
    params: { variant: 'more-less', context, more, pq, ratio, base: B.name, compare: A.name },
    sig: `tapm|${context}|${A.name}|${B.name}|${more}|${pq.toFracString()}`,
  };
}

function buildRatioOptions(correct, wrongs) {
  const opts = [{ id: 'o0', value: correct }];
  const mis = [];
  for (const [v, code] of wrongs) {
    if (opts.some((o) => o.value.eq(v))) continue;
    const id = `o${opts.length}`;
    opts.push({ id, value: v });
    mis.push({ value: id, code });
  }
  return {
    options: opts.map((o) => ({ id: o.id, label: o.value.toFracString() })),
    answer: 'o0',
    misconceptions: mis,
    shuffle: true,
  };
}

// ===========================================================================
// 題型 2：find-compare 已知基準量，求比較量
// ===========================================================================
function findCompare(level, rng) {
  const kinds = level === 1 ? ['int'] : level === 2 ? ['frac', 'dec'] : ['int', 'frac', 'dec', 'pct', 'improper'];
  const r = pickRatio(rng, kinds);
  const [lo, hi] = level === 1 ? [10, 100] : BASE_RANGE[level];
  const B = pickMultiple(rng, r.value.d, lo, hi);
  const ans = r.value.mul(B);
  const baseFirst = level === 3 && rng.chance(0.3);
  const contexts = ['money', 'juice', ...(r.value.lt(1) ? ['reading'] : [])];
  const context = rng.pick(contexts);
  const [n1, n2] = pickNames(rng, 2);
  let prompt, target, baseName, unit;
  if (context === 'money') {
    target = `${n2}的錢`; baseName = `${n1}的錢`; unit = '元';
    prompt = baseFirst
      ? `${n1}有 ${B} 元，${n1}的錢的 ${r.phrase}是${n2}的錢。${n2}有多少元？`
      : `${n1}有 ${B} 元，${n2}的錢是${n1}的 ${r.phrase}。${n2}有多少元？`;
  } else if (context === 'reading') {
    target = `${n1}讀的頁數`; baseName = '全書的頁數'; unit = '頁';
    prompt = baseFirst
      ? `一本故事書有 ${B} 頁，全書的 ${r.phrase}是${n1}已經讀的頁數。${n1}讀了幾頁？`
      : `一本故事書有 ${B} 頁，${n1}已經讀了全書的 ${r.phrase}。${n1}讀了幾頁？`;
  } else {
    target = '果汁的量'; baseName = '水的量'; unit = '毫升';
    prompt = baseFirst
      ? `一杯飲料裡有 ${B} 毫升的水，水的量的 ${r.phrase}是果汁的量。果汁有多少毫升？`
      : `一杯飲料裡有 ${B} 毫升的水，果汁的量是水的 ${r.phrase}。果汁有多少毫升？`;
  }
  const mis = misList(ans, [
    [() => F(B).div(r.value), 'C-base-swap'],
    [() => F(B).add(r.value), 'M-add-ratio'],
    [() => F(B).sub(r.value), 'M-add-ratio'],
    ...(r.kind === 'frac' || r.kind === 'improper'
      ? [[() => F(B * r.value.n), 'K-frac-mult'], [() => F(B, r.value.d), 'K-frac-mult']] : []),
    ...(r.kind === 'pct' ? [[() => F(B).mul(r.value.mul(100)), 'M-percent-as-int']] : []),
    ...(r.kind === 'dec' ? [[() => F(B).mul(r.value.mul(10)), 'K-decimal'], [() => ans.div(10), 'K-decimal']] : []),
  ]);
  const [cmpW, moreLess] = cmpWord(r);
  return {
    prompt,
    parts: [numberPart(ans, mis, { unit })],
    hints: [
      '先用黃色筆點出「要求誰」，再用綠色筆點出基準量。題目已經告訴你基準量是多少了嗎？',
      `基準量是 1 份，比較量是 ${r.text} 份。比較量 = 基準量 × 比值 = ${times(B, r)}。`,
    ],
    explanation: [
      `第 1 步：要求什麼？→ ${target}。`,
      `第 2 步：誰是基準量？「${target}是${baseName}的 ${r.phrase}」→ 基準量是${baseName}，有 ${B} ${unit}。`,
      `第 3 步：畫線段圖：${baseName}是 1 條，${target}是 ${r.text} 條。`,
      `第 4 步：比較量 = 基準量 × 比值 = ${times(B, r)} = ${fmt(ans)}。`,
      `第 5 步：檢查：比值 ${r.text} ${cmpW} 1，所以${target}應該比${baseName}${moreLess}；${fmt(ans)} ${cmpW} ${B} ✓`,
      `答：${fmt(ans)} ${unit}。`,
    ],
    answerText: `${fmt(ans)} ${unit}`,
    context,
    helper: helperSpec({
      goal: context === 'money' ? [`${n2}有多少元`, `${n1}有多少元`, '兩人一共有多少元']
        : context === 'reading' ? [`${n1}讀了幾頁`, '全書有幾頁', '還剩幾頁沒讀'] : ['果汁有多少毫升', '水有多少毫升', '飲料一共有多少毫升'],
      known: [String(B), r.text],
      base: context === 'money' ? n1 : context === 'reading' ? '全書' : '水',
      nouns: context === 'money' ? [n1, n2] : context === 'reading' ? ['全書', n1] : ['水', '果汁'],
      ops: [`${B} × ${r.text}`, `${B} ÷ ${r.text}`, `${B} + ${r.text}`],
    }),
    params: { context, ratioKind: r.kind, ratio: r.value, B, baseFirst },
    sig: `fc|${r.value.toFracString()}|${B}`,
  };
}

// ===========================================================================
// 題型 3：find-base 已知比較量，求基準量
// ===========================================================================
function zheText(v) {   // 0.8 → 8 折；0.75 → 75 折
  const p = v.mul(100);
  return p.n % 10 === 0 ? `${p.n / 10} 折` : `${p.toDecimalString()} 折`;
}

function findBase(level, rng) {
  const kinds = level === 2 ? ['int'] : level === 3 ? ['frac', 'dec', 'pct'] : ['int', 'frac', 'dec', 'pct', 'improper'];
  const r = pickRatio(rng, kinds);
  const [lo, hi] = BASE_RANGE[level];
  const B = pickMultiple(rng, r.value.d, lo, hi);      // 先選答案
  const A = r.value.mul(B);                            // 再算題目的比較量
  if (!A.isInt()) throw new GenRetry('A 不是整數');
  const contexts = ['jump', 'farm', ...(r.value.lt(1) && (r.kind === 'pct' || r.kind === 'dec') ? ['discount'] : [])];
  const context = rng.pick(contexts);
  const [n1, n2, n3] = pickNames(rng, 3);
  const twist = level === 4 ? rng.pick(['distractor', 'reorder']) : null;
  let unit, baseName, cmpName, lines, question;
  if (context === 'discount') {
    unit = '元'; baseName = '原價'; cmpName = '售價';
    const how = r.kind === 'pct' ? r.text : `${r.text} 倍`;
    lines = [`一件外套打 ${zheText(r.value)}後是 ${fmt(A)} 元（售價是原價的 ${how}）。`];
    question = '原價是多少元？';
  } else if (context === 'jump') {
    unit = '下'; baseName = `${n2}跳的下數`; cmpName = `${n1}跳的下數`;
    lines = [`${n1}跳了 ${fmt(A)} 下，是${n2}的 ${r.phrase}。`];
    question = `${n2}跳了幾下？`;
  } else {
    unit = '隻'; baseName = '鴨的數量'; cmpName = '雞的數量';
    lines = [`農場裡雞的數量是鴨的 ${r.phrase}。`, `雞有 ${fmt(A)} 隻。`];
    question = '鴨有幾隻？';
  }
  const ans = F(B);
  const baseMis = [
    [() => A.mul(r.value), 'C-base-swap'],
    ...(r.kind === 'frac' || r.kind === 'improper'
      ? [[() => (r.value.n > 1 ? A.div(r.value.n) : null), 'K-frac-div'], [() => (r.value.n > 1 ? A.mul(r.value.d) : null), 'K-frac-div']] : []),
    ...(r.kind === 'pct' ? [[() => A.div(r.value.mul(100)), 'M-percent-as-int']] : []),
    ...(r.kind === 'dec' ? [[() => A.div(r.value.mul(10)), 'K-decimal'], [() => ans.mul(10), 'K-decimal']] : []),
  ];
  let mis = misList(ans, baseMis);
  let distractor = null;
  if (twist === 'distractor') {
    const taken = new Set([ans, A, ...mis.map((m) => m.value)].map((v) => Frac.of(v).toFracString()));
    for (let i = 0; i < 20 && distractor == null; i++) {
      const x = rng.int(Math.max(5, Math.round(B / 4)), Math.max(20, B * 2));
      if (!taken.has(String(x))) distractor = x;
    }
    if (distractor == null) throw new GenRetry('找不到干擾數字');
    const line = context === 'jump' ? `${n3}跳了 ${distractor} 下。`
      : context === 'farm' ? `農場裡還有 ${distractor} 頭牛。`
        : `這家店今天賣出了 ${distractor} 件衣服。`;
    lines.splice(rng.int(0, lines.length), 0, line);
    mis = misList(ans, [...baseMis,
      [() => F(distractor), 'C-goal'],
      [() => F(distractor).div(r.value), 'C-goal'],
      [() => F(distractor).mul(r.value), 'C-goal']]);
  }
  const prompt = twist === 'reorder'
    ? `${question}已知：${lines.join('')}`
    : `${lines.join('')}${question}`;
  return {
    prompt,
    parts: [numberPart(ans, mis, { unit })],
    hints: [
      '用綠色筆點出基準量。這一題，基準量是已經知道的，還是要求的？',
      `基準量 × ${r.text} = ${fmt(A)}，所以基準量 = ${fmt(A)} ÷ ${r.text}。${r.kind === 'int' ? '' : '（除以分數 = 乘以它的倒數）'}`,
    ],
    explanation: [
      `第 1 步：要求什麼？→ ${baseName}（基準量）。`,
      `第 2 步：已知比較量：${cmpName}有 ${fmt(A)} ${unit}。`,
      `第 3 步：列出關係：${baseName} × ${r.text} = ${fmt(A)}。`,
      `第 4 步：反過來算：${baseName} = ${divideExpr(A, r)} = ${B}。`,
      `第 5 步：驗算：${B} × ${r.text} = ${fmt(A)} ✓`,
      `答：${B} ${unit}。`,
    ],
    answerText: `${B} ${unit}`,
    context,
    helper: helperSpec({
      goal: context === 'jump' ? [`${n2}跳了幾下`, `${n1}跳了幾下`, '兩人一共跳了幾下']
        : context === 'farm' ? ['鴨有幾隻', '雞有幾隻', '雞和鴨一共幾隻'] : ['原價', '打折後的價錢', '便宜了多少錢'],
      known: [fmt(A), r.text],
      base: context === 'jump' ? n2 : context === 'farm' ? '鴨' : '原價',
      nouns: context === 'jump' ? [n1, n2] : context === 'farm' ? ['雞', '鴨'] : ['原價', '售價'],
      ops: [`${fmt(A)} ÷ ${r.text}`, `${fmt(A)} × ${r.text}`, `${fmt(A)} − ${r.text}`],
    }),
    params: { context, ratioKind: r.kind, ratio: r.value, B, A, twist, distractor },
    sig: `fb|${r.value.toFracString()}|${B}`,
  };
}

// ===========================================================================
// 題型 4：relation-table 關係表格
// ===========================================================================
const TABLE_CTX = {
  tea: { headers: ['紅茶（杯）', '牛奶（杯）'], intro: '做紅茶拿鐵時，牛奶的杯數和紅茶的杯數有固定的倍數關係。', base: '紅茶', cmp: '牛奶', unit: '杯' },
  pen: { headers: ['筆記本的價錢（元）', '筆的價錢（元）'], intro: '文具店裡，每一組「筆的價錢 ÷ 筆記本的價錢」都一樣。', base: '筆記本的價錢', cmp: '筆的價錢', unit: '元' },
  shadow: { headers: ['物體高度（公分）', '影子長度（公分）'], intro: '同一時間，物體影子的長度 ÷ 物體高度都一樣。', base: '物體高度', cmp: '影子長度', unit: '公分' },
};

function increasingDistinct(rng, count, lo, hi) {
  const s = new Set();
  while (s.size < count) s.add(rng.int(lo, hi));
  return [...s].sort((a, b) => a - b);
}

function relationTable(level, rng) {
  if (level === 4) return rng.chance(0.5) ? relationTableReverse(rng) : relationTableJudge(rng);
  const r = level === 2 ? pickRatio(rng, ['int', 'dec']) : pickRatio(rng, ['frac', 'dec']);
  const contextKey = level === 2 ? rng.pick(['tea', 'shadow']) : rng.pick(['tea', 'pen', 'shadow']);
  const ctx = TABLE_CTX[contextKey];
  let bases;
  if (level === 2) bases = [1, 2, 3, 4, 5];
  else {
    const count = rng.int(4, 6);
    const ks = increasingDistinct(rng, count, 1, 12);
    if (ks.every((k, i) => i === 0 || k - ks[i - 1] === 1)) throw new GenRetry('L3 基準量要不連續');
    bases = ks.map((k) => k * r.value.d);
  }
  const values = bases.map((b) => r.value.mul(b));
  // 選 2 個空格；至少 2 欄已知；第 1 欄保持已知，方便算比值
  const blankIdx = rng.sample(bases.map((_, i) => i).slice(1), 2).sort((a, b) => a - b);
  const known = bases.map((_, i) => i).filter((i) => !blankIdx.includes(i));
  const labels = ['①', '②'];
  const parts = blankIdx.map((i, j) => {
    const ans = values[i];
    const mis = misList(ans, [
      [() => values[i - 1].add(r.value), 'M-add-ratio'],     // 仍用「每格加 r」填表
      [() => F(bases[i]).div(r.value), 'C-operation'],
    ]);
    return numberPart(ans, mis, { id: `b${j}`, label: `空格 ${labels[j]}`, unit: ctx.unit });
  });
  if (level === 3) {
    const opts = [
      { id: 'm0', label: `${ctx.cmp} = ${ctx.base} × ${r.text}` },
      { id: 'm1', label: `${ctx.cmp} = ${ctx.base} × ${r.value.inv().toFracString()}` },
      { id: 'm2', label: `${ctx.cmp} = ${ctx.base} + ${r.text}` },
    ];
    parts.push({
      id: 'c', kind: 'choice', label: '哪一個式子對每一欄都成立？', options: opts, answer: 'm0', shuffle: true,
      misconceptions: choiceMis('m0', [['m1', 'C-operation'], ['m2', 'M-add-ratio']]),
    });
  }
  const table = {
    headers: ctx.headers,
    rows: [
      bases.map((b) => ({ v: fmt(b) })),
      values.map((v, i) => (blankIdx.includes(i) ? { blank: labels[blankIdx.indexOf(i)] } : { v: fmt(v) })),
    ],
  };
  const [k1, k2] = known;
  return {
    prompt: `${ctx.intro}看表格，把空格填好。`,
    table,
    parts,
    hints: [
      '看看已經填好的那幾欄：比較量是基準量的幾倍？每一欄都一樣嗎？',
      `每一欄都是「比較量 ÷ 基準量 = ${r.text}」。所以空格 = 基準量 × ${r.text}。`,
    ],
    explanation: [
      `第 1 步：從已知的一欄算比值：${fmt(values[k1])} ÷ ${fmt(bases[k1])} = ${r.text}。`,
      `第 2 步：換另一欄檢查：${fmt(values[k2])} ÷ ${fmt(bases[k2])} = ${r.text}，一樣！比值固定。`,
      ...blankIdx.map((i, j) => `第 3 步：空格 ${labels[j]} = 基準量 × 比值 = ${fmt(bases[i])} × ${r.text} = ${fmt(values[i])}。`),
      `第 4 步：結論：${ctx.cmp} = ${ctx.base} × ${r.text}。基準量變成 2 倍，比較量也跟著變成 2 倍。`,
    ],
    answerText: blankIdx.map((i, j) => `${labels[j]} ${fmt(values[i])}`).join('、') + (level === 3 ? `；${ctx.cmp} = ${ctx.base} × ${r.text}` : ''),
    context: contextKey,
    params: { variant: 'fill', context: contextKey, ratioKind: r.kind, ratio: r.value, bases, blankIdx },
    sig: `rt|${r.value.toFracString()}|${bases.join(',')}|${blankIdx.join(',')}`,
  };
}

function relationTableReverse(rng) {
  const r = pickRatio(rng, ['frac', 'dec', 'int']);
  const contextKey = rng.pick(['tea', 'pen', 'shadow']);
  const ctx = TABLE_CTX[contextKey];
  const count = rng.int(4, 6);
  const bases = increasingDistinct(rng, count, 1, 12).map((k) => k * r.value.d);
  const values = bases.map((b) => r.value.mul(b));
  const blankIdx = rng.sample(bases.map((_, i) => i).slice(1), 2).sort((a, b) => a - b);
  const known = bases.map((_, i) => i).filter((i) => !blankIdx.includes(i));
  const labels = ['①', '②'];
  const parts = blankIdx.map((i, j) => numberPart(F(bases[i]), misList(F(bases[i]), [
    [() => values[i].mul(r.value), 'C-operation'],
    [() => values[i].sub(r.value), 'M-add-ratio'],
  ]), { id: `b${j}`, label: `空格 ${labels[j]}`, unit: ctx.unit }));
  const table = {
    headers: ctx.headers,
    rows: [
      bases.map((b, i) => (blankIdx.includes(i) ? { blank: labels[blankIdx.indexOf(i)] } : { v: fmt(b) })),
      values.map((v) => ({ v: fmt(v) })),
    ],
  };
  const [k1, k2] = known;
  return {
    prompt: `${ctx.intro}這次空格在上面一列（基準量）。把空格填好。`,
    table,
    parts,
    hints: [
      '看看已經填好的那幾欄：比較量是基準量的幾倍？這次要找的是基準量還是比較量？',
      `每一欄都是「比較量 = 基準量 × ${r.text}」。反過來，基準量 = 比較量 ÷ ${r.text}。`,
    ],
    explanation: [
      `第 1 步：從已知的一欄算比值：${fmt(values[k1])} ÷ ${fmt(bases[k1])} = ${r.text}。`,
      `第 2 步：換另一欄檢查：${fmt(values[k2])} ÷ ${fmt(bases[k2])} = ${r.text}，一樣！比值固定。`,
      ...blankIdx.map((i, j) => `第 3 步：空格 ${labels[j]} = 比較量 ÷ 比值 = ${divideExpr(values[i], r)} = ${fmt(bases[i])}。`),
      `第 4 步：驗算：${blankIdx.map((i) => `${fmt(bases[i])} × ${r.text} = ${fmt(values[i])}`).join('；')} ✓`,
    ],
    answerText: blankIdx.map((i, j) => `${labels[j]} ${fmt(bases[i])}`).join('、'),
    context: contextKey,
    params: { variant: 'reverse', context: contextKey, ratioKind: r.kind, ratio: r.value, bases, blankIdx },
    sig: `rtr|${r.value.toFracString()}|${bases.join(',')}|${blankIdx.join(',')}`,
  };
}

function relationTableJudge(rng) {
  const contextKey = rng.pick(['tea', 'pen', 'shadow']);
  const ctx = TABLE_CTX[contextKey];
  const step = rng.pick([1, 2]);
  const bases = [1, 2, 3, 4].map((i) => i * step);
  const r = pickRatio(rng, ['int', 'dec']);
  const prop = bases.map((b) => r.value.mul(b));
  // 每次加固定數：c_i = a + i*d，且 a/b1 ≠ d/step（避免剛好成比例）
  let a, d;
  for (let i = 0; i < 20; i++) {
    d = rng.int(1, 6); a = rng.int(1, 9);
    if (!F(a, bases[0]).eq(F(d, step))) break;
  }
  if (F(a, bases[0]).eq(F(d, step))) throw new GenRetry('加法表剛好成比例');
  const add = bases.map((_, i) => F(a + i * d));
  // 沒有規律：隨機遞增，且不成比例、差不固定
  let rand;
  for (let i = 0; i < 30; i++) {
    rand = increasingDistinct(rng, 4, 1, 30).map((x) => F(x));
    const ratios = rand.map((c, j) => c.div(bases[j]));
    const diffs = rand.slice(1).map((c, j) => c.sub(rand[j]));
    if (!ratios.every((q) => q.eq(ratios[0])) && !diffs.every((q) => q.eq(diffs[0]))) break;
    rand = null;
  }
  if (!rand) throw new GenRetry('隨機表格不合格');
  const names = ['甲', '乙', '丙'];
  const order = rng.shuffle(['prop', 'add', 'rand']);
  const data = { prop, add, rand };
  const tables = order.map((k, i) => ({
    name: names[i], kind: k, headers: ctx.headers,
    rows: [bases.map((b) => ({ v: fmt(b) })), data[k].map((v) => ({ v: fmt(v) }))],
  }));
  const ansId = `t${order.indexOf('prop')}`;
  const options = tables.map((t, i) => ({ id: `t${i}`, label: `${t.name}表` }));
  return {
    prompt: `下面三張表，哪一張的「${ctx.cmp} ÷ ${ctx.base}」每一欄都一樣（比值固定）？`,
    tables,
    parts: [{
      id: 'a', kind: 'choice', label: '比值固定的是哪一張？', options, answer: ansId,
      misconceptions: choiceMis(ansId, [[`t${order.indexOf('add')}`, 'M-add-ratio']]),
    }],
    hints: [
      '每一張表，都用下面的數 ÷ 上面的數算算看。每一欄算出來都一樣嗎？',
      '「每次加一樣多」不代表比值固定喔！要用除的檢查：比較量 ÷ 基準量，每一欄都要一樣。',
    ],
    explanation: [
      ...tables.map((t) => {
        const q = data[t.kind].map((c, j) => c.div(bases[j]).toString());
        return `${t.name}表：每一欄的「下 ÷ 上」= ${q.join('、')}${t.kind === 'prop' ? '，全部一樣 ✓' : '，不一樣'}`;
      }),
      `所以比值固定的是${tables[order.indexOf('prop')].name}表：${ctx.cmp} = ${ctx.base} × ${r.text}。`,
      '注意：每次加一樣多的那張表，下 ÷ 上的結果會一直變，所以不是固定的倍數關係。',
    ],
    answerText: `${tables[order.indexOf('prop')].name}表`,
    context: contextKey,
    params: { variant: 'judge', context: contextKey, ratio: r.value, bases, a, d, order, rand: rand.map(String) },
    sig: `rtj|${r.value.toFracString()}|${step}|${a}|${d}|${order.join(',')}`,
  };
}

// ===========================================================================
// 題型 5：sum-problem 兩量和
// ===========================================================================
function sumProblem(level, rng) {
  if (level === 5) return rng.chance(0.5) ? sumRatioForm(rng) : sumChain(rng);
  const kinds = level === 3 ? ['int', 'frac', 'dec'] : ['frac', 'dec', 'pct', 'improper'];
  const contexts = level === 3 ? ['age', 'fruit', 'fund'] : ['fruit', 'fund'];
  const context = rng.pick(contexts);
  let r, B;
  if (context === 'age') {
    r = pickRatio(rng, ['int']);
    const ks = [];
    for (let c = 6; c <= 15; c++) { const m = c * r.value.n; if (m >= 25 && m <= 50) ks.push(c); }
    if (!ks.length) throw new GenRetry('年齡不合理');
    B = rng.pick(ks);
  } else {
    r = pickRatio(rng, kinds);
    const [lo, hi] = context === 'fruit' ? [20, 200] : BASE_RANGE[level];
    B = pickMultiple(rng, r.value.d, lo, hi);
  }
  const C = r.value.mul(B);
  const S = C.add(B);
  const onePlus = F(1).add(r.value);
  const [n] = pickNames(rng, 1);
  const ask = level === 3 ? 'sum' : rng.pick(['base', 'compare']);
  let prompt, unit, baseName, cmpName, goal;
  if (context === 'age') {
    unit = '歲'; baseName = `${n}的年齡`; cmpName = '媽媽的年齡';
    prompt = `${n}今年 ${B} 歲，媽媽的年齡是${n}的 ${r.phrase}。兩人的年齡合起來是幾歲？`;
  } else if (context === 'fruit') {
    unit = '公斤'; baseName = '第一箱'; cmpName = '第二箱';
    prompt = ask === 'sum'
      ? `第一箱蘋果重 ${B} 公斤，第二箱的重量是第一箱的 ${r.phrase}。兩箱共重多少公斤？`
      : `兩箱蘋果共重 ${fmt(S)} 公斤，第二箱的重量是第一箱的 ${r.phrase}。${ask === 'base' ? '第一箱' : '第二箱'}重多少公斤？`;
  } else {
    unit = '元'; baseName = '一班募的錢'; cmpName = '二班募的錢';
    prompt = ask === 'sum'
      ? `六年一班募了 ${B} 元，二班募的錢是一班的 ${r.phrase}。兩班共募了多少元？`
      : `六年一班和二班一共募了 ${fmt(S)} 元，二班募的錢是一班的 ${r.phrase}。${ask === 'base' ? '一班' : '二班'}募了多少元？`;
  }
  goal = ask === 'sum' ? '兩量和（合起來）' : ask === 'base' ? baseName : cmpName;
  const ans = ask === 'sum' ? S : ask === 'base' ? F(B) : C;
  const isFracLike = r.kind === 'frac' || r.kind === 'improper';
  const mis = ask === 'sum'
    ? misList(ans, [
      [() => C, 'C-step-missed'],
      [() => F(B).div(r.value).add(B), 'C-base-swap'],
      [() => F(B).add(r.value), 'M-add-ratio'],
      [() => F(B).mul(F(1).sub(r.value).abs()), 'C-goal'],
    ])
    : misList(ans, [
      [() => S.div(r.value), 'M-forget-one'],
      ...(ask === 'compare' ? [[() => S.mul(r.value), 'M-forget-one'], [() => F(B), 'C-goal']] : [[() => C, 'C-goal']]),
      ...(isFracLike ? [
        [() => S.div(F(r.value.n + 1, r.value.d)).mul(ask === 'compare' ? r.value : 1), 'K-frac-add'],   // 1 + 3/4 算成 4/4
        [() => S.div(F(r.value.n + 1, 2 * r.value.d)).mul(ask === 'compare' ? r.value : 1), 'K-frac-add'], // 算成 4/8
      ] : []),
      [() => S.mul(onePlus), 'C-base-swap'],
    ]);
  const expl = [
    `第 1 步：要求什麼？→ ${goal}。`,
    `第 2 步：基準量是${baseName}（「${cmpName}是${baseName}的 ${r.phrase}」）。`,
    `第 3 步：線段圖：${baseName}是 1 份，${cmpName}是 ${r.text} 份，合起來是 1 + ${r.text} = ${onePlus.toString()} 份。`,
  ];
  if (ask === 'sum') expl.push(`第 4 步：兩量和 = ${B} × ${onePlus.toString()} = ${fmt(S)}。`);
  else {
    expl.push(`第 4 步：1 份 = ${fmt(S)} ÷ ${onePlus.toString()} = ${B}${ask === 'compare' ? `，所以${cmpName} = ${B} × ${r.text} = ${fmt(C)}` : ''}。`);
  }
  expl.push(`第 5 步：驗算：${B} + ${B} × ${r.text} = ${B} + ${fmt(C)} = ${fmt(S)} ✓`, `答：${fmt(ans)} ${unit}。`);
  return {
    prompt,
    parts: [numberPart(ans, mis, { unit })],
    hints: [
      '先用黃色筆點「最後要問什麼」：是問其中一個，還是問合起來？再用綠色筆點基準量。',
      ask === 'sum'
        ? `畫線段圖：基準量是 1 條，比較量是 ${r.text} 條，合起來是 (1 + ${r.text}) 條。兩量和 = 基準量 × (1 + ${r.text})。`
        : `畫線段圖：基準量是 1 條，比較量是 ${r.text} 條，合起來是 (1 + ${r.text}) 條。基準量 = 兩量和 ÷ (1 + ${r.text})。`,
    ],
    explanation: expl,
    answerText: `${fmt(ans)} ${unit}`,
    context,
    helper: helperSpec({
      goal: ask === 'sum' ? ['兩個合起來是多少', baseName, cmpName] : ask === 'base' ? [baseName, cmpName, '兩個合起來是多少'] : [cmpName, baseName, '兩個合起來是多少'],
      known: [ask === 'sum' ? String(B) : fmt(S), r.text],
      base: context === 'age' ? n : context === 'fruit' ? '第一箱' : '一班',
      nouns: context === 'age' ? [n, '媽媽'] : context === 'fruit' ? ['第一箱', '第二箱'] : ['一班', '二班'],
      ops: ask === 'sum' ? [`${B} × (1 + ${r.text})`, `${B} × ${r.text}`, `${B} ÷ ${r.text} + ${B}`]
        : ask === 'base' ? [`${fmt(S)} ÷ (1 + ${r.text})`, `${fmt(S)} ÷ ${r.text}`, `${fmt(S)} × (1 + ${r.text})`]
          : [`${fmt(S)} ÷ (1 + ${r.text}) × ${r.text}`, `${fmt(S)} × ${r.text}`, `${fmt(S)} ÷ (1 + ${r.text})`],
    }),
    params: { variant: ask, context, ratioKind: r.kind, ratio: r.value, B },
    sig: `sum|${ask}|${r.value.toFracString()}|${B}`,
  };
}

function coprimePair(rng) {
  for (let i = 0; i < 50; i++) {
    const m = rng.int(1, 9), n = rng.int(1, 9);
    if (m !== n && Frac.of(m).div(n).n === m) return [m, n];
  }
  throw new GenRetry('找不到互質的比');
}

function sumRatioForm(rng) {
  const [m, n] = coprimePair(rng);
  const t = m + n;
  const k = rng.int(Math.ceil(20 / Math.min(m, n)), Math.floor(3000 / t));
  const S = k * t;
  const context = rng.pick(['fund', 'fruit']);
  const askSecond = rng.chance(0.5);
  const [first, second, unit, verb] = context === 'fund' ? ['一班', '二班', '元', '募了'] : ['第一箱', '第二箱', '公斤', '重'];
  const prompt = context === 'fund'
    ? `六年一班和二班募款金額的比是 ${m} : ${n}，兩班一共募了 ${S} 元。${askSecond ? second : first}募了多少元？`
    : `兩箱蘋果重量的比是 ${m} : ${n}，兩箱共重 ${S} 公斤。${askSecond ? second : first}重多少公斤？`;
  const mine = askSecond ? n : m;
  const theirs = askSecond ? m : n;
  const ans = F(k * mine);
  const mis = misList(ans, [
    [() => F(S * mine, theirs), 'C-base-swap'],        // 把另一邊當成全部
    [() => F(k), 'C-step-missed'],                     // 只算出 1 份
    [() => F(k * theirs), 'C-goal'],                   // 算成另一個
    [() => F(S, mine), 'M-forget-one'],
  ]);
  const who = askSecond ? second : first;
  return {
    prompt,
    parts: [numberPart(ans, mis, { unit })],
    hints: [
      `先用黃色筆點「最後要問什麼」：要問的是${who}。比 ${m} : ${n} 告訴我們什麼？`,
      `把${first}看成 ${m} 份、${second}看成 ${n} 份，合起來是 ${m} + ${n} = ${t} 份。先算 1 份是多少。`,
    ],
    explanation: [
      `第 1 步：要求什麼？→ ${who}。`,
      `第 2 步：比是 ${m} : ${n}，所以${first}是 ${m} 份、${second}是 ${n} 份。`,
      `第 3 步：合起來是 ${m} + ${n} = ${t} 份，共 ${S} ${unit}。`,
      `第 4 步：1 份 = ${S} ÷ ${t} = ${k}，所以${who} = ${k} × ${mine} = ${fmt(ans)}。`,
      `第 5 步：驗算：${k * m} + ${k * n} = ${S} ✓`,
      `答：${fmt(ans)} ${unit}。`,
    ],
    answerText: `${fmt(ans)} ${unit}`,
    context,
    helper: helperSpec({
      goal: [who, askSecond ? first : second, '兩個合起來是多少'],
      known: [String(m), String(n), String(S)],
      ops: [`${S} ÷ (${m} + ${n}) × ${mine}`, `${S} ÷ ${mine}`, `${S} × ${mine} ÷ ${theirs}`],
    }),
    params: { variant: 'ratio-form', context, m, n, k, S, askSecond, verb },
    sig: `sumr|${m}|${n}|${k}|${askSecond}`,
  };
}

function sumChain(rng) {
  const kinds = ['int', 'frac', 'improper', 'dec'];
  const r1 = pickRatio(rng, kinds);
  const r2 = pickRatio(rng, kinds);
  const unitMul = r1.value.d * r2.value.d;
  const parts = F(1).add(r2.value).add(r2.value.mul(r1.value));   // 丙 1 份、乙 r2 份、甲 r1×r2 份
  const kMax = Math.floor(F(3000).div(parts.mul(unitMul)).toNumber());
  if (kMax < 1) throw new GenRetry('連鎖題數字太大');
  const k = rng.int(1, kMax);
  const Cc = F(k * unitMul);
  const Bb = Cc.mul(r2.value);
  const Aa = Bb.mul(r1.value);
  if (!Bb.isInt() || !Aa.isInt()) throw new GenRetry('連鎖題不是整數');
  const S = Aa.add(Bb).add(Cc);
  const [a, b, c] = pickNames(rng, 3);
  const askIdx = rng.int(0, 2);
  const people = [[a, Aa], [b, Bb], [c, Cc]];
  const [who, ans] = people[askIdx];
  const mis = misList(ans, [
    ...people.filter((_, i) => i !== askIdx).map(([, v]) => [() => v, 'C-goal']),
  ]);
  const prompt = `${a}的貼紙張數是${b}的 ${r1.phrase}，${b}的貼紙張數是${c}的 ${r2.phrase}。三人一共有 ${fmt(S)} 張貼紙。${who}有幾張？`;
  return {
    prompt,
    parts: [numberPart(ans, mis, { unit: '張' })],
    hints: [
      `先用黃色筆點「最後要問誰」。再用綠色筆找基準量：兩句話裡，誰一直被拿來當標準？`,
      `把${c}看成 1 份，${b}是 ${r2.text} 份，${a}是 ${r2.text} × ${r1.text} 份。三人合起來是幾份？`,
    ],
    explanation: [
      `第 1 步：要求什麼？→ ${who}的貼紙張數。`,
      `第 2 步：從最後一句開始：${c}是基準量，看成 1 份；${b}是 ${r2.text} 份。`,
      `第 3 步：${a}是${b}的 ${r1.phrase} → ${a}是 ${r2.text} × ${r1.text} = ${r2.value.mul(r1.value).toString()} 份。`,
      `第 4 步：三人合起來 = 1 + ${r2.value.toString()} + ${r2.value.mul(r1.value).toString()} = ${parts.toString()} 份，1 份 = ${fmt(S)} ÷ ${parts.toString()} = ${fmt(Cc)}。`,
      `第 5 步：${a} ${fmt(Aa)} 張、${b} ${fmt(Bb)} 張、${c} ${fmt(Cc)} 張；驗算：${fmt(Aa)} + ${fmt(Bb)} + ${fmt(Cc)} = ${fmt(S)} ✓`,
      `答：${fmt(ans)} 張。`,
    ],
    answerText: `${fmt(ans)} 張`,
    context: 'sticker',
    helper: helperSpec({
      goal: [`${who}的貼紙張數`, '三人一共的張數', `${people[(askIdx + 1) % 3][0]}的貼紙張數`],
      known: [r1.text, r2.text, fmt(S)],
      base: c, nouns: [a, b, c],
      ops: [`${fmt(S)} ÷ (1 + ${r2.text} + ${r2.text} × ${r1.text})`, `${fmt(S)} ÷ 3`, `${fmt(S)} ÷ (${r1.text} + ${r2.text})`],
    }),
    params: { variant: 'chain', r1: r1.value, r2: r2.value, C: Cc, askIdx },
    sig: `sumc|${r1.value.toFracString()}|${r2.value.toFracString()}|${k}|${askIdx}`,
  };
}

// ===========================================================================
// 題型 6：diff-problem 兩量差
// ===========================================================================
function diffProblem(level, rng) {
  if (level === 5) return diffMoreLess(rng);
  const kinds = level === 3 ? ['int', 'frac', 'dec'] : ['frac', 'dec', 'pct', 'improper'];
  const context = rng.pick(['height', 'price', 'tree']);
  let r, B;
  if (context === 'height') {
    // 爸爸比孩子高：比值 > 1，孩子 120–160 公分，爸爸 ≤ 195 公分
    r = pickRatio(rng, kinds, (v) => v.gt(1) && v.lt(F(3, 2)));
    const opts = [];
    for (let c = 120; c <= 160; c++) {
      const dad = r.value.mul(c);
      if (c % r.value.d === 0 && dad.isInt() && dad.toNumber() <= 195) opts.push(c);
    }
    if (!opts.length) throw new GenRetry('身高不合理');
    B = rng.pick(opts);
  } else {
    // 漲價／降價：比值 < 2，避免「現在是原價的 3 倍」這種不自然的情境
    r = pickRatio(rng, kinds, context === 'price' ? (v) => neq1(v) && v.lt(2) : neq1);
    const [lo, hi] = context === 'price' ? [20, 600] : BASE_RANGE[level];
    B = pickMultiple(rng, r.value.d, lo, hi);
  }
  const C = r.value.mul(B);
  const diffRatio = r.value.sub(1).abs();
  const D = diffRatio.mul(B);
  const up = r.value.gt(1);
  const [n] = pickNames(rng, 1);
  const ask = level === 3 ? 'diff' : rng.pick(['base', 'compare']);
  let prompt, unit, baseName, cmpName;
  if (context === 'height') {
    unit = '公分'; baseName = `${n}的身高`; cmpName = '爸爸的身高';
    prompt = ask === 'diff'
      ? `${n}的身高是 ${B} 公分，爸爸的身高是${n}的 ${r.phrase}。兩人相差幾公分？`
      : `爸爸的身高是${n}的 ${r.phrase}，兩人相差 ${fmt(D)} 公分。${ask === 'base' ? `${n}` : '爸爸'}多高？`;
  } else if (context === 'price') {
    unit = '元'; baseName = '原價'; cmpName = '現在的價錢';
    const pr = r.kind === 'pct' ? r.text : r.phrase;
    const change = up ? '漲了' : '便宜了';
    prompt = ask === 'diff'
      ? `一盒餅乾原價 ${B} 元，現在的價錢是原價的 ${pr}。${change}多少元？`
      : `一盒餅乾現在的價錢是原價的 ${pr}，${change} ${fmt(D)} 元。${ask === 'base' ? '原價' : '現在的價錢'}是多少元？`;
  } else {
    unit = '棵'; baseName = '去年種的棵數'; cmpName = '今年種的棵數';
    prompt = ask === 'diff'
      ? `學校去年種了 ${B} 棵樹，今年種的棵數是去年的 ${r.phrase}。兩年相差幾棵？`
      : `學校今年種的樹是去年的 ${r.phrase}，兩年相差 ${fmt(D)} 棵。${ask === 'base' ? '去年' : '今年'}種了幾棵？`;
  }
  const ans = ask === 'diff' ? D : ask === 'base' ? F(B) : C;
  const goal = ask === 'diff' ? '兩量差（相差多少）' : ask === 'base' ? baseName : cmpName;
  const mis = ask === 'diff'
    ? misList(ans, [
      [() => C, 'C-goal'],
      [() => F(B).add(C), 'C-goal'],
      [() => F(B).div(r.value).sub(B).abs(), 'C-base-swap'],
    ])
    : misList(ans, [
      [() => D.div(r.value), 'M-forget-one'],
      [() => D.mul(diffRatio), 'C-operation'],
      ...(ask === 'compare' ? [[() => F(B), 'C-goal']] : [[() => C, 'C-goal']]),
    ]);
  const sign = up ? `${r.text} − 1` : `1 − ${r.text}`;
  const expl = [
    `第 1 步：要求什麼？→ ${goal}。`,
    `第 2 步：基準量是${baseName}（「${cmpName}是${baseName}的 ${r.phrase}」）。`,
    `第 3 步：線段圖：${baseName}是 1 份，${cmpName}是 ${r.text} 份，相差 ${sign} = ${diffRatio.toString()} 份。`,
  ];
  if (ask === 'diff') expl.push(`第 4 步：差 = ${B} × ${diffRatio.toString()} = ${fmt(D)}。`);
  else expl.push(`第 4 步：1 份 = ${fmt(D)} ÷ ${diffRatio.toString()} = ${B}${ask === 'compare' ? `，所以${cmpName} = ${B} × ${r.text} = ${fmt(C)}` : ''}。`);
  expl.push(`第 5 步：驗算：${B} 和 ${fmt(C)} 相差 ${fmt(D)} ✓`, `答：${fmt(ans)} ${unit}。`);
  return {
    prompt,
    parts: [numberPart(ans, mis, { unit })],
    hints: [
      '用黃色筆點出問題：是問「相差多少」，還是問「其中一個」？「是＿＿的」的空格就是基準量。',
      `線段圖上，兩條長條相差 (${sign}) 條。差 = 基準量 × (${sign})。`,
    ],
    explanation: expl,
    answerText: `${fmt(ans)} ${unit}`,
    context,
    helper: helperSpec({
      goal: ask === 'diff' ? ['兩個相差多少', baseName, cmpName] : ask === 'base' ? [baseName, cmpName, '兩個相差多少'] : [cmpName, baseName, '兩個相差多少'],
      known: [ask === 'diff' ? String(B) : fmt(D), r.text],
      base: context === 'height' ? n : context === 'price' ? '原價' : '去年',
      nouns: context === 'height' ? [n, '爸爸'] : context === 'price' ? ['原價', '現在的價錢'] : ['去年', '今年'],
      ops: ask === 'diff' ? [`${B} × (${sign})`, `${B} × ${r.text}`, `${B} × (1 + ${r.text})`]
        : ask === 'base' ? [`${fmt(D)} ÷ (${sign})`, `${fmt(D)} ÷ ${r.text}`, `${fmt(D)} × (${sign})`]
          : [`${fmt(D)} ÷ (${sign}) × ${r.text}`, `${fmt(D)} ÷ ${r.text}`, `${fmt(D)} × ${r.text}`],
    }),
    params: { variant: ask, context, ratioKind: r.kind, ratio: r.value, B },
    sig: `diff|${ask}|${r.value.toFracString()}|${B}`,
  };
}

function diffMoreLess(rng) {
  const more = rng.chance(0.5);
  const pq = pickRatio(rng, ['frac']).value;
  const factor = more ? F(1).add(pq) : F(1).sub(pq);
  const B = pickMultiple(rng, pq.d, 20, Math.floor(3000 / factor.toNumber()));
  const X = factor.mul(B);
  if (!X.isInt()) throw new GenRetry('X 不是整數');
  const context = rng.pick(['tree', 'money', 'book']);
  const [n1, n2] = pickNames(rng, 2);
  const w = more ? '多' : '少';
  let prompt, unit, baseName, cmpName;
  if (context === 'tree') {
    unit = '棵'; baseName = '去年'; cmpName = '今年';
    prompt = `學校今年種的樹比去年${w}去年的 ${pq.toFracString()}，今年種了 ${fmt(X)} 棵。去年種了幾棵？`;
  } else if (context === 'money') {
    unit = '元'; baseName = n2; cmpName = n1;
    prompt = `${n1}存的錢比${n2}${w}${n2}的 ${pq.toFracString()}，${n1}存了 ${fmt(X)} 元。${n2}存了多少元？`;
  } else {
    unit = '本'; baseName = '上學期'; cmpName = '這學期';
    prompt = `圖書館這學期借出的書比上學期${w}上學期的 ${pq.toFracString()}，這學期借出 ${fmt(X)} 本。上學期借出幾本？`;
  }
  const ans = F(B);
  const other = more ? F(1).sub(pq) : F(1).add(pq);
  const mis = misList(ans, [
    [() => X.div(pq), 'M-add-ratio'],
    [() => X.mul(factor), 'C-operation'],
    [() => X.div(other), 'C-goal'],
    [() => X.mul(pq), 'C-operation'],
  ]);
  return {
    prompt,
    parts: [numberPart(ans, mis, { unit })],
    hints: [
      `用黃色筆點出問題：要求的是誰？「比＿＿${w}」的空格就是基準量。`,
      `把${baseName}看成 1 份，${cmpName}是 1 ${more ? '+' : '−'} ${pq.toFracString()} = ${factor.toFracString()} 份。${baseName} = ${fmt(X)} ÷ ${factor.toFracString()}。`,
    ],
    explanation: [
      `第 1 步：要求什麼？→ ${baseName}${unit === '元' ? '存的錢' : unit === '棵' ? '種的棵數' : '借出的本數'}（基準量）。`,
      `第 2 步：「比${baseName}${w}${baseName}的 ${pq.toFracString()}」→ 基準量是${baseName}。`,
      `第 3 步：線段圖：${baseName}是 1 份，${cmpName}是 1 ${more ? '+' : '−'} ${pq.toFracString()} = ${factor.toFracString()} 份。`,
      `第 4 步：${baseName} = ${fmt(X)} ÷ ${factor.toFracString()} = ${fmt(X)} × ${factor.inv().toFracString()} = ${B}。`,
      `第 5 步：驗算：${B} × ${factor.toFracString()} = ${fmt(X)} ✓`,
      `答：${B} ${unit}。`,
    ],
    answerText: `${B} ${unit}`,
    context,
    helper: helperSpec({
      goal: [`${baseName}${unit === '元' ? '存的錢' : unit === '棵' ? '種的棵數' : '借出的本數'}`, `${cmpName}${unit === '元' ? '存的錢' : unit === '棵' ? '種的棵數' : '借出的本數'}`, '兩個相差多少'],
      known: [pq.toFracString(), fmt(X)],
      base: baseName, nouns: [baseName, cmpName],
      ops: [`${fmt(X)} ÷ (1 ${more ? '+' : '−'} ${pq.toFracString()})`, `${fmt(X)} ÷ ${pq.toFracString()}`, `${fmt(X)} × (1 ${more ? '+' : '−'} ${pq.toFracString()})`],
    }),
    params: { variant: 'more-less', context, more, pq, B, X },
    sig: `diffm|${more}|${pq.toFracString()}|${B}`,
  };
}

// ===========================================================================
export default {
  unitId: UNIT_ID,
  types: {
    'tap-base-quantity': { levels: [1, 2, 3], isWordProblem: false, generate: tapBase },
    'find-compare': { levels: [1, 2, 3], isWordProblem: true, generate: findCompare },
    'find-base': { levels: [2, 3, 4], isWordProblem: true, generate: findBase },
    'relation-table': { levels: [2, 3, 4], isWordProblem: false, generate: relationTable },
    'sum-problem': { levels: [3, 4, 5], isWordProblem: true, generate: sumProblem },
    'diff-problem': { levels: [3, 4, 5], isWordProblem: true, generate: diffProblem },
  },
};

// 測試用：讓測試檔可以重算、檢查範圍
export const _internal = { BASE_RANGE, ratioOf, lcm, lt1, gt1 };
