// 網站目前開放的單元（取自 curriculum/unit-map.json 的子集合）。
// 為什麼不直接 fetch unit-map.json：GitHub Pages 只會部署 site/ 資料夾，而且這樣可以離線使用。
// tests/units-data.test.mjs 會檢查這裡和 unit-map.json 一致（id、題型、等級、source）。

export const UNITS = [
  {
    id: 'g5-rate-percent', shortTitle: '百分率',  // 地圖上的島名（完整名稱在單元簡介面板）
    grade: 5, semester: 2, strand: 'N',
    hanlinOrder: '5下-第8單元', hanlinTitle: '比率與百分率',
    sections: ['8-1 認識比率', '8-2 認識百分率', '8-3 百分率的應用'],
    progress: 'prior-grade', title: '比率與百分率', track: 'number',
    notYet: ['concentration', 'promotion-compare'],
    questionTypes: [
      { id: 'rate-meaning', desc: '認識比率（部分 ÷ 全體）', input: ['fraction-pad', 'numpad', 'tap'], levels: [1, 2], source: 'textbook' },
      { id: 'percent-convert', desc: '百分率、小數、分數互換', input: ['numpad', 'fraction-pad', 'drag'], levels: [1, 2, 3], source: 'textbook' },
      { id: 'find-part', desc: '求部分量（全體 × 百分率）', input: ['numpad'], levels: [1, 2, 3], source: 'textbook' },
      { id: 'find-rate-whole', desc: '求百分率、求全體量', input: ['numpad'], levels: [2, 3, 4], source: 'textbook' },
      { id: 'discount', desc: '打折（售價、便宜多少、原價、比較折扣、以 x 表示）', input: ['numpad', 'choice'], levels: [2, 3, 4, 5], source: 'textbook' },
      { id: 'change-rate', desc: '漲跌幅與漲跌後的量', input: ['numpad'], levels: [2, 3, 4], source: 'textbook' },
      { id: 'markup-profit', desc: '成本加成與利潤', input: ['numpad'], levels: [3, 4, 5], source: 'contest-extension' },
      { id: 'successive-change', desc: '連續變化（先漲後跌、回到原價）', input: ['numpad', 'choice'], levels: [3, 4, 5], source: 'contest-extension' },
    ],
  },
  {
    id: 'g6-fraction-division', shortTitle: '分數除法',  // 地圖上的島名（完整名稱在單元簡介面板）
    grade: 6, semester: 1, strand: 'N',
    hanlinOrder: '6上-第2單元', hanlinTitle: '分數除法',
    sections: ['2-1 最簡分數', '2-2 同分母分數的除法', '2-3 異分母分數的除法', '2-4 分數除法的應用', '2-4 被除數、除數與商'],
    progress: 'learned-this-term', title: '分數除法', track: 'number',
    notYet: ['same-denom-div', 'reciprocal-div'],
    questionTypes: [
      { id: 'frac-div-word', desc: '可裝幾份、每份多少', input: ['fraction-pad', 'choice'], levels: [3, 4, 5], source: 'textbook' },
      { id: 'quotient-size', desc: '不計算判斷商比被除數大或小', input: ['choice'], levels: [3, 4], source: 'textbook' },
    ],
  },
  {
    id: 'g6-ratio', shortTitle: '比與比值',  // 地圖上的島名（完整名稱在單元簡介面板）
    grade: 6, semester: 1, strand: 'R',
    hanlinOrder: '6上-第4單元', hanlinTitle: '比與比值',
    sections: ['4-1 比和相等的比', '4-2 最簡整數比', '4-3 認識比值'],
    progress: 'learned-this-term', title: '比與比值', track: 'number',
    notYet: ['direct-proportion', 'balance-substitution'],
    questionTypes: [
      { id: 'ratio-read-write', desc: '依題意寫出比（順序）', input: ['drag', 'numpad'], levels: [1, 2], source: 'textbook' },
      { id: 'equal-ratio-unknown', desc: '相等的比求未知項', input: ['numpad'], levels: [1, 2, 3], source: 'textbook' },
      { id: 'simplest-ratio', desc: '化成最簡單整數比（含分數、小數）', input: ['numpad'], levels: [2, 3, 4], source: 'textbook' },
      { id: 'ratio-value', desc: '求比值', input: ['fraction-pad'], levels: [1, 2, 3], source: 'textbook' },
      { id: 'ratio-word', desc: '比的應用題（求部分、求全部、求另一量）', input: ['numpad', 'choice', 'drag'], levels: [3, 4, 5], source: 'textbook' },
    ],
  },
  {
    id: 'g6-two-quantity', shortTitle: '兩量關係',  // 地圖上的島名（完整名稱在單元簡介面板）
    grade: 6, semester: 1, strand: 'R',
    hanlinOrder: '6上-第5單元', hanlinTitle: '兩量關係',
    sections: ['5-1 認識基準量與比較量', '5-2 兩量和問題', '5-3 兩量差問題'],
    progress: 'current', title: '兩量關係（基準量與比較量）', track: 'number',
    questionTypes: [
      { id: 'tap-base-quantity', desc: '在題目中點出基準量', input: ['tap', 'choice'], levels: [1, 2, 3], source: 'textbook' },
      { id: 'find-compare', desc: '已知基準量求比較量', input: ['numpad'], levels: [1, 2, 3], source: 'textbook' },
      { id: 'find-base', desc: '已知比較量求基準量', input: ['numpad'], levels: [2, 3, 4], source: 'textbook' },
      { id: 'relation-table', desc: '關係表格：兩個量怎麼一起變', input: ['numpad', 'choice', 'drag'], levels: [2, 3, 4], source: 'textbook' },
      { id: 'sum-problem', desc: '兩量和問題', input: ['numpad'], levels: [3, 4, 5], source: 'textbook' },
      { id: 'diff-problem', desc: '兩量差問題', input: ['numpad'], levels: [3, 4, 5], source: 'textbook' },
    ],
  },
  {
    id: 'g6-circumference', shortTitle: '圓周長',  // 地圖上的島名（完整名稱在單元簡介面板）
    grade: 6, semester: 1, strand: 'S',
    hanlinOrder: '6上-第6單元', hanlinTitle: '圓周長與扇形周長',
    sections: ['6-1 圓周率', '6-2 圓周長', '6-3 扇形弧長與周長', '6-4 圓周長與弧長的應用'],
    progress: 'upcoming', title: '圓周長與扇形周長', track: 'geometry',
    questionTypes: [
      { id: 'circumference', desc: '已知半徑或直徑求圓周長', input: ['numpad'], levels: [1, 2], source: 'textbook' },
      { id: 'reverse-circumference', desc: '已知圓周長求直徑或半徑', input: ['numpad'], levels: [2, 3, 4], source: 'textbook' },
      { id: 'sector-perimeter', desc: '扇形弧長與周長', input: ['numpad', 'tap'], levels: [2, 3, 4], source: 'textbook' },
      { id: 'composite-perimeter', desc: '含半圓、四分之一圓的複合圖形周長', input: ['numpad', 'tap'], levels: [4, 5], source: 'textbook' },
      { id: 'wheel-track', desc: '輪子轉幾圈走多遠、跑道情境', input: ['numpad'], levels: [3, 4, 5], source: 'textbook' },
    ],
  },
  {
    id: 'g6-problem-solving-1', shortTitle: '怎樣解題',  // 地圖上的島名（完整名稱在單元簡介面板）
    grade: 6, semester: 1, strand: 'R',
    hanlinOrder: '6上-第8單元', hanlinTitle: '怎樣解題',
    sections: ['8-1 間隔問題', '8-2 數形規則', '8-3 選擇與組合', '8-4 和差問題'],
    progress: 'upcoming', title: '怎樣解題（間隔、數形規則、選擇與組合、和差）', track: 'number',
    notYet: ['profit-loss', 'periodic-pattern', 'exchange-problem'],
    questionTypes: [
      { id: 'interval-problem', desc: '間隔問題（植樹、鋸木頭、環形、爬樓梯）', input: ['numpad', 'drag'], levels: [1, 2, 3, 4, 5], source: 'textbook' },
      { id: 'figure-pattern', desc: '數形規則（等差、火柴棒、點陣、週期）', input: ['numpad', 'drag', 'choice'], levels: [1, 2, 3, 4, 5], source: 'textbook' },
      { id: 'combinations', desc: '選擇與組合（乘法原理、排列、選 2 人、數字卡）', input: ['numpad', 'drag'], levels: [1, 2, 3, 4, 5], source: 'textbook' },
      { id: 'sum-difference', desc: '和差、和倍、差倍問題', input: ['numpad', 'drag'], levels: [2, 3, 4, 5], source: 'textbook' },
    ],
  },
];

/**
 * 技能鍵層級的先備關係（Nova 3.4 pickPrereqKey 用）。
 * 【暫定，待 Euclid 確認】Euclid 目前只提供單元層級的 prereqs，而那些先備單元還沒有產生器，
 * 所以第一版先用「同單元內較基礎的題型」當先備（依規格的補強去處，例如 C-base-swap → 題型 1）。
 * 沒有先備的題型 → 依 Nova 規則改插入示範題。
 */
export const SKILL_PREREQS = {
  'g6-two-quantity:find-compare': ['g6-two-quantity:tap-base-quantity', 'g5-rate-percent:find-part'],
  'g6-two-quantity:find-base': ['g6-two-quantity:tap-base-quantity', 'g6-two-quantity:find-compare'],
  'g6-two-quantity:relation-table': ['g6-two-quantity:find-compare'],
  'g6-two-quantity:sum-problem': ['g6-two-quantity:find-compare', 'g6-two-quantity:find-base'],
  'g6-two-quantity:diff-problem': ['g6-two-quantity:find-compare', 'g6-two-quantity:find-base'],
  'g6-circumference:reverse-circumference': ['g6-circumference:circumference'],
  'g6-circumference:sector-perimeter': ['g6-circumference:circumference'],
  'g6-circumference:composite-perimeter': ['g6-circumference:sector-perimeter', 'g6-circumference:circumference'],
  'g6-circumference:wheel-track': ['g6-circumference:circumference'],
  'g5-rate-percent:find-part': ['g5-rate-percent:percent-convert'],
  'g5-rate-percent:find-rate-whole': ['g5-rate-percent:find-part', 'g5-rate-percent:rate-meaning'],
  'g5-rate-percent:discount': ['g5-rate-percent:find-part'],
  'g5-rate-percent:change-rate': ['g5-rate-percent:find-part', 'g5-rate-percent:find-rate-whole'],
  'g5-rate-percent:markup-profit': ['g5-rate-percent:discount', 'g5-rate-percent:change-rate'],
  'g5-rate-percent:successive-change': ['g5-rate-percent:change-rate'],
  'g6-fraction-division:frac-div-word': ['g6-fraction-division:quotient-size'],
  'g6-ratio:equal-ratio-unknown': ['g6-ratio:ratio-read-write'],
  'g6-ratio:simplest-ratio': ['g6-ratio:equal-ratio-unknown'],
  'g6-ratio:ratio-value': ['g6-ratio:simplest-ratio'],
  'g6-ratio:ratio-word': ['g6-ratio:equal-ratio-unknown', 'g6-ratio:simplest-ratio'],
  'g6-problem-solving-1:sum-difference': ['g6-two-quantity:sum-problem'],
};

export function getUnit(unitId) { return UNITS.find((u) => u.id === unitId) || null; }

export function getType(unitId, typeId) {
  const u = getUnit(unitId);
  return u ? u.questionTypes.find((t) => t.id === typeId) || null : null;
}

export const skillKey = (unitId, typeId) => `${unitId}:${typeId}`;
export function splitKey(key) { const i = key.indexOf(':'); return [key.slice(0, i), key.slice(i + 1)]; }

export function typeOfKey(key) { const [u, t] = splitKey(key); return getType(u, t); }

export function levelRange(key) {
  const t = typeOfKey(key);
  if (!t) return [1, 5];
  return [Math.min(...t.levels), Math.max(...t.levels)];
}

export function clampLevel(key, level) {
  const [lo, hi] = levelRange(key);
  return Math.min(hi, Math.max(lo, level));
}

/** 題型篩選：之後可用 source（例如 1/10 前只出 textbook） */
export function typesOf(unitId, { sources = null } = {}) {
  const u = getUnit(unitId);
  if (!u) return [];
  return u.questionTypes.filter((t) => !sources || sources.includes(t.source || 'textbook'));
}
