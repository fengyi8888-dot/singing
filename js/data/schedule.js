// 單元排程（curriculum/schedule.md v2，2026-11-23）。
// 第一階段（診斷與補洞）用「相對開始日」：day1 = 孩子完成診斷第 2 段的日期；晚開始時依壓縮規則縮短。
// 第二階段以後的日期固定。計算在 engine/schedule.js。
export const SCHEDULE = Object.freeze({
  version: 2,
  standardStart: '2026-11-24',        // 標準開始日（N = 20）
  P1_END: '2026-12-13',               // 第一階段固定結束日
  NOMINAL: 20,
  P2_START: '2026-12-14',
  contestExtensionFrom: '2027-01-11', // 這天以前只出 textbook 題型（例外見 EXCEPTIONS）
  P3_START: '2027-01-11',
  P4_START: '2027-01-25',
  examDate: '2027-01-31',
  MAIN_DELAY_DAYS: 3,                 // 主線熟練度未達 70% → 下一個主線延後 3 天（不超過 01/11）
  MAIN_DELAY_THRESHOLD: 0.7,

  // 第一階段區塊（以標準 20 天定義）。role：main 主線、gap 補洞、preview 預習、review 複習
  P1_BLOCKS: Object.freeze([
    { id: 'p1-diag-gaps', units: 'diag-gaps', start: 1, end: 20, min: null, role: 'gap' },
    { id: 'p1-current', units: ['g6-two-quantity'], start: 1, end: 20, min: null, role: 'main' },
    { id: 'p1-percent', units: ['g5-rate-percent'], start: 1, end: 8, min: 4, role: 'gap', firstPriority: true },
    { id: 'p1-word', units: ['g6-fraction-division', 'g6-decimal-division'], start: 3, end: 14, min: 3, role: 'gap' },
    { id: 'p1-geo', units: ['g3-circle', 'g5-sector', 'geo-wrong'], start: 9, end: 16, min: 3, role: 'gap' },
    { id: 'p1-preview', units: ['g6-frac-decimal-operations'], start: 8, end: 20, min: 0, role: 'preview', dropIfNBelow: 8 },
    { id: 'p1-review', units: ['g6-ratio', 'g6-gcf-lcm'], start: 15, end: 20, min: 0, role: 'review', dropIfNBelow: 10 },
  ]),
  PARALLEL_IF_N_BELOW: 7,             // N < 7：percent、word、geo 三塊同時從第 1 天開始
  LATE_ORDER: Object.freeze(['p1-percent', 'p1-geo', 'p1-word']),   // N ≤ 0：依序各至少 3 天
  LATE_MIN_DAYS: 3,
  GEO_WRONG_UNITS: Object.freeze(['g4-perimeter-area', 'g5-polygon-area', 'g5-volume', 'g5-plane-figures']),

  // 第二階段以後：固定日期的週次（主線／補洞複習／預習）
  WEEKS: Object.freeze([
    { from: '2026-12-14', to: '2026-12-20', main: ['g6-circumference'], gap: ['g6-ratio', 'g6-gcf-lcm'], preview: ['g6-frac-decimal-operations', 'g6-problem-solving-2'] },
    { from: '2026-12-21', to: '2026-12-27', main: ['g6-circumference'], gap: ['g6-two-quantity', 'g5-fraction-add-sub-unlike'], preview: ['g6-problem-solving-2', 'g6-speed'] },
    { from: '2026-12-28', to: '2027-01-03', main: ['g6-scale-drawing', 'g6-problem-solving-1'], gap: ['g6-circumference', 'g5-rate-percent'], preview: ['g6-speed', 'g6-problem-solving-2'] },
    { from: '2027-01-04', to: '2027-01-10', main: ['g6-circle-area', 'g6-prism-cylinder'], gap: ['*all-g6-s1'], preview: ['g6-frac-decimal-operations'] },
    { from: '2027-01-11', to: '2027-01-30', main: ['*contest'], gap: [], preview: [] },
  ]),

  // 第二階段以後的固定解鎖日（不受 day1 影響；但診斷完成前一律不開放）
  FIXED_UNLOCK: Object.freeze({
    'g6-circumference': '2026-12-14',
    'g6-problem-solving-2': '2026-12-15',
    'g6-speed': '2026-12-22',
    'g6-scale-drawing': '2026-12-28',
    'g6-problem-solving-1': '2026-12-28',
    'g6-circle-area': '2027-01-04',
    'g6-prism-cylinder': '2027-01-04',
  }),
  // 主線的順序（延後規則用：前一個主線熟練度未達 70%，下一個延後 3 天）
  MAIN_ORDER: Object.freeze(['g6-two-quantity', 'g6-circumference', 'g6-problem-solving-1']),

  // 01/10 前也可以出的 contest-extension 題型（schedule.md 備註；目前網站還沒有這些題型）
  EXCEPTIONS: Object.freeze([]),
});

export const ROLE_LABEL = Object.freeze({ main: '主線', gap: '補洞', review: '複習', preview: '預習' });
