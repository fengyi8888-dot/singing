// 六年級診斷測驗（curriculum/diagnostic.md，22 題）：分兩次，第 1–11 題、第 12–22 題，不顯示對錯。
// 題目內容照 Euclid 的 diagnostic.md；格式轉成網站的作答元件（numpad／choice／tap／multi）。
// split：應用題答錯或按「我還沒學過」時的拆題小步驟（① 這題最後要問什麼 ③ 哪一個算式是對的）。
//   每個選項可以帶迷思代碼：選到 M- → 概念錯；選到 C- 或沒有代碼 → 讀題錯（engine/diagnostic.js）。
//   拆題第 ② 步（點出基準量）第一版不做。
// 第 6、11、14、15、17、19 題的拆題選項已由 Euclid 檢查（2026-11-23）；第 21、22 題的拆題選項是 Forge 補的，【待 Euclid 確認】。
import { F } from '../core/frac.js';

const num = (answer, mis, extra = {}) => ({ id: 'a', kind: 'number', answer, misconceptions: mis.map(([v, code]) => ({ value: v, code })), ...extra });
const choice = (labels, answerIndex, codes, extra = {}) => ({
  id: 'a', kind: 'choice',
  options: labels.map((label, i) => ({ id: `o${i}`, label })),
  answer: `o${answerIndex}`,
  misconceptions: codes.map((c, i) => (c && i !== answerIndex ? { value: `o${i}`, code: c } : null)).filter(Boolean),
  ...extra,
});
const split = (goal, goalAnswer, op, opAnswer, { goalCodes = [], opCodes = [] } = {}) => ({
  goal: { options: goal.map((label, i) => ({ id: `g${i}`, label, code: goalCodes[i] || null })), answer: `g${goalAnswer}` },
  op: { options: op.map((label, i) => ({ id: `p${i}`, label, code: opCodes[i] || null })), answer: `p${opAnswer}` },
});

export const DIAG_ITEMS = Object.freeze([
  { no: 1, unitId: 'g3-circle', group: 'S', prompt: '圖上的圓，半徑是 6 公分。這個圓的直徑是幾公分？',
    figure: { type: 'circle', show: 'r', label: '6 公分', colored: true },
    parts: [num(F(12), [[F(3), 'M-d-r'], [F(6), 'M-d-r']], { unit: '公分' })] },
  { no: 2, unitId: 'g6-two-quantity', key: 'g6-two-quantity:tap-base-quantity', group: 'P',
    segments: [{ text: '哥哥', tap: '哥哥' }, { text: '存的錢是' }, { text: '妹妹', tap: '妹妹' }, { text: '的 4/3。' }, { text: '\n' }, { text: '在這句話裡，點出基準量是誰。' }],
    parts: [{ id: 'a', kind: 'tap', answer: '妹妹', misconceptions: [{ value: '哥哥', code: 'C-base-swap' }] }] },
  { no: 3, unitId: 'g5-multiples-factors', group: 'G', prompt: '數字卡裡，點出所有是 24 的因數的卡片，再按「確定」。',
    parts: [{ id: 'a', kind: 'multi', options: [1, 2, 3, 4, 5, 6, 8, 9, 12, 16, 24].map((n) => ({ id: `n${n}`, label: String(n) })),
      answer: [1, 2, 3, 4, 6, 8, 12, 24].map((n) => `n${n}`),
      misconceptionRules: [{ when: 'includes-any', ids: ['n16', 'n9'], code: 'M-factor-multiple' }, { when: 'missing-any', ids: ['n1', 'n24'], code: 'M-factor-ends' }] }] },
  { no: 4, unitId: 'g4-perimeter-area', group: 'S', prompt: '一個長方形花圃，長 8 公尺、寬 5 公尺。沿著花圃邊緣圍一圈籬笆，籬笆要多長？',
    figure: { type: 'rect', w: 8, h: 5, labels: { w: '8 公尺', h: '5 公尺' } },
    parts: [num(F(26), [[F(40), 'M-area-perimeter'], [F(13), 'M-half-perimeter']], { unit: '公尺' })] },
  { no: 5, unitId: 'g5-fraction-multiplication', group: 'F', prompt: '3/5 × 10/9 = ？（用分數回答）',
    parts: [num(F(2, 3), [[F(13, 14), 'K-frac-add-parts'], [F(27, 50), 'K-cross-mult']], { flagUnsimplified: true, allowFraction: true })] },
  { no: 6, unitId: 'g6-gcf-lcm', group: 'G', word: true,
    prompt: '小禾有 18 顆蘋果和 24 顆橘子，要分裝成好幾袋。每袋的蘋果一樣多、橘子也一樣多，而且都沒有剩下。最多可以裝成幾袋？',
    parts: [num(F(6), [[F(72), 'M-gcf-lcm-swap'], [F(2), 'M-not-greatest'], [F(3), 'M-not-greatest'], [F(4), 'C-goal']], { unit: '袋' })],
    split: split(['最多可以裝成幾袋', '每袋有幾顆蘋果', '一共有幾顆水果'], 0, ['18 和 24 的最大公因數', '18 和 24 的最小公倍數', '18 + 24'], 0,
      { opCodes: [null, 'M-gcf-lcm-swap', null] }) },
  { no: 7, unitId: 'g4-fraction-improper-mixed', group: 'F', prompt: '把帶分數 2又1/3 化成假分數。',
    parts: [num(F(7, 3), [[F(5, 3), 'M-mixed-convert'], [F(2), 'M-mixed-convert'], [F(1), 'M-mixed-convert']], { allowFraction: true })] },
  { no: 8, unitId: 'g5-sector', group: 'S', prompt: '圖上是一個圓心角 90° 的扇形。它是幾分之幾個圓？',
    figure: { type: 'sector', r: 4, theta: 90, rLabel: '', thetaLabel: '90°', colored: true },
    parts: [choice(['1/4', '1/90', '1/3', '1/2'], 0, [null, 'M-angle-fraction', 'M-angle-fraction', 'M-angle-fraction'])] },
  { no: 9, unitId: 'g6-fraction-division', group: 'F', prompt: '2/3 ÷ 4/9 = ？',
    parts: [choice(['3/2', '8/27', '2/3', '27/8'], 0, [null, 'K-frac-div-no-reciprocal', 'K-frac-div-wrong-reciprocal', 'K-frac-div-wrong-reciprocal'])] },
  { no: 10, unitId: 'g5-polygon-area', group: 'S', prompt: '一個三角形，底 10 公分、高 6 公分（虛線），一條斜邊 7.5 公分。這個三角形的面積是多少平方公分？',
    figure: { type: 'triangle', labels: { base: '10 公分', height: '6 公分', slant: '7.5 公分' } },
    parts: [num(F(30), [[F(60), 'M-triangle-no-half'], [F(75, 2), 'M-wrong-height'], [F(75), 'M-wrong-height']], { unit: '平方公分' })] },
  { no: 11, unitId: 'g6-fraction-division', key: 'g6-fraction-division:frac-div-word', group: 'F', word: true,
    prompt: '一瓶果汁有 3/4 公升。每杯倒 1/8 公升，可以倒滿幾杯？',
    parts: [num(F(6), [[F(3, 32), 'C-operation'], [F(1, 6), 'C-base-swap']], { unit: '杯' })],
    split: split(['可以倒滿幾杯', '每杯倒多少公升', '一瓶有多少公升'], 0, ['3/4 ÷ 1/8', '3/4 × 1/8', '1/8 ÷ 3/4'], 0) },
  // ---- 第二次（第 12–22 題）----
  { no: 12, unitId: 'g5-decimal-multiplication', group: 'D', prompt: '2.4 × 0.3 = ？',
    parts: [num(F(72, 100), [[F(72, 10), 'K-decimal-point'], [F(72, 1000), 'K-decimal-point'], [F(72), 'K-decimal-point']])] },
  { no: 13, unitId: 'g5-plane-figures', group: 'S', prompt: '一個三角形有兩個角是 65° 和 40°，第三個角是幾度？',
    parts: [num(F(75), [[F(105), 'C-goal'], [F(255), 'M-angle-sum']], { unit: '度' })] },
  { no: 14, unitId: 'g5-fraction-add-sub-unlike', group: 'F', word: true,
    prompt: '阿凱早上喝了 2/3 公升的水，下午又喝了 1/4 公升。他今天一共喝了幾公升？',
    parts: [num(F(11, 12), [[F(3, 7), 'K-frac-add-parts'], [F(3, 12), 'K-common-denom'], [F(5, 12), 'C-operation']], { unit: '公升', allowFraction: true })],
    split: split(['一共喝了幾公升', '早上喝了幾公升', '早上比下午多喝多少'], 0, ['2/3 + 1/4', '2/3 − 1/4', '2/3 × 1/4'], 0) },
  { no: 15, unitId: 'g6-decimal-division', group: 'D', word: true,
    prompt: '一條緞帶長 4.5 公尺。每 0.6 公尺剪成一段，最多可以剪成幾段？還剩下幾公尺？',
    parts: [
      { id: 'a', kind: 'number', label: '段數', unit: '段', answer: F(7), misconceptions: [{ value: F(15, 2), code: 'C-goal' }, { value: F(8), code: 'M-round-up' }] },
      { id: 'b', kind: 'number', label: '剩下', unit: '公尺', answer: F(3, 10), misconceptions: [{ value: F(3), code: 'K-remainder-point' }] },
    ],
    split: split(['最多幾段、還剩幾公尺', '可以剪成幾段（段數可以有小數）', '剪完一共用掉幾公尺'], 0, ['4.5 ÷ 0.6', '4.5 × 0.6', '0.6 ÷ 4.5'], 0,
      { goalCodes: [null, 'C-goal', null] }) },
  { no: 16, unitId: 'g6-ratio', key: 'g6-ratio:simplest-ratio', group: 'R', prompt: '把 0.6 : 1.5 化成最簡單整數比。',
    parts: [
      { id: 'a', kind: 'number', label: '前項', ratioPair: true, answer: F(2), misconceptions: [{ value: F(6), code: 'M-not-simplified' }, { value: F(5), code: 'C-order' }] },
      { id: 'b', kind: 'number', label: '後項', ratioPair: true, answer: F(5), misconceptions: [{ value: F(15), code: 'M-not-simplified' }, { value: F(2), code: 'C-order' }] },
    ] },
  { no: 17, unitId: 'g5-rate-percent', key: 'g5-rate-percent:find-part', group: 'P', word: true,
    prompt: '全班有 25 人，戴眼鏡的人占全班的 40%。戴眼鏡的有幾人？',
    parts: [num(F(10), [[F(125, 2), 'C-base-swap'], [F(15), 'C-goal'], [F(1000), 'M-percent-as-int']], { unit: '人' })],
    split: split(['戴眼鏡的有幾人', '沒戴眼鏡的有幾人', '全班有幾人'], 0, ['25 × 40%', '25 ÷ 40%', '25 × 40'], 0,
      { opCodes: [null, null, 'M-percent-as-int'] }) },
  { no: 18, unitId: 'g5-volume', group: 'S', prompt: '一個長方體紙盒，長 5 公分、寬 4 公分、高 3 公分。它的體積是多少立方公分？',
    figure: { type: 'box', labels: { l: '5 公分', w: '4 公分', h: '3 公分' } },
    parts: [num(F(60), [[F(12), 'M-volume-add'], [F(20), 'M-volume-base-only'], [F(94), 'M-volume-surface']], { unit: '立方公分' })] },
  { no: 19, unitId: 'g6-ratio', key: 'g6-ratio:ratio-word', group: 'R', word: true,
    prompt: '米雅調飲料，果汁和水的比是 2 : 5。她用了 300 毫升果汁，要加多少毫升的水？',
    parts: [num(F(750), [[F(120), 'C-base-swap'], [F(1050), 'C-goal']], { unit: '毫升' })],
    split: split(['要加多少毫升的水', '果汁有多少毫升', '果汁和水一共多少毫升'], 0, ['300 ÷ 2 × 5', '300 ÷ 5 × 2', '300 ÷ 2 × 7'], 0,
      { opCodes: [null, null, 'C-goal'] }) },
  { no: 20, unitId: 'g6-two-quantity', key: 'g6-two-quantity:sum-problem', group: 'P', word: true,
    prompt: '妹妹有 360 元。哥哥的錢是妹妹的 3/4。兩人一共有多少元？',
    parts: [num(F(630), [[F(270), 'C-goal'], [F(480), 'C-base-swap'], [F(840), 'C-base-swap'], [F(90), 'C-goal']], { unit: '元' })],
    split: split(['兩人一共有多少元', '哥哥有多少元', '兩人相差多少元'], 0, ['360 × 3/4 + 360', '360 ÷ 3/4 + 360', '360 × 3/4'], 0) },
  { no: 21, unitId: 'g5-rate-percent', key: 'g5-rate-percent:discount', group: 'P', word: true,
    prompt: '一件外套原價 800 元，週年慶打七五折。打折後要付多少元？',
    parts: [choice(['600 元', '200 元', '560 元', '725 元'], 0, [null, 'M-off-part', 'M-discount-meaning', 'M-percent-as-int'])],
    split: split(['打折後要付多少元', '便宜了多少元', '原價是多少元'], 0, ['800 × 0.75', '800 × 0.25', '800 − 75'], 0,
      { goalCodes: [null, 'C-goal', 'C-goal'], opCodes: [null, 'M-off-part', 'M-percent-as-int'] }) },
  { no: 22, unitId: 'g5-rate-percent', key: 'g5-rate-percent:change-rate', group: 'P', word: true,
    prompt: '一個筆袋原本賣 40 元，現在漲到 50 元。漲幅是百分之多少？',
    parts: [choice(['25%', '20%', '125%', '10%'], 0, [null, 'M-wrong-base', 'C-goal', 'M-percent-as-int'])],
    split: split(['漲幅是百分之多少', '漲了多少元', '現在的價錢是原價的百分之多少'], 0, ['(50 − 40) ÷ 40 × 100%', '(50 − 40) ÷ 50 × 100%', '50 ÷ 40 × 100%'], 0,
      { goalCodes: [null, 'C-goal', 'C-goal'], opCodes: [null, 'M-wrong-base', 'C-goal'] }) },
]);

export const DIAG_SEGMENTS = Object.freeze([[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]]);

// 給家長摘要用的單元名稱（網站還沒有的單元）
export const UNIT_TITLES = Object.freeze({
  'g3-circle': '圓（半徑、直徑）', 'g5-multiples-factors': '因數與倍數', 'g4-perimeter-area': '周長與面積',
  'g5-fraction-multiplication': '分數乘法', 'g6-gcf-lcm': '最大公因數與最小公倍數', 'g4-fraction-improper-mixed': '假分數與帶分數',
  'g5-sector': '扇形', 'g6-fraction-division': '分數除法', 'g5-polygon-area': '多邊形面積', 'g5-decimal-multiplication': '小數乘法',
  'g5-plane-figures': '平面圖形（三角形內角）', 'g5-fraction-add-sub-unlike': '異分母分數加減', 'g6-decimal-division': '小數除法',
  'g6-ratio': '比與比值', 'g5-rate-percent': '比率與百分率', 'g5-volume': '體積', 'g6-two-quantity': '兩量關係',
});
