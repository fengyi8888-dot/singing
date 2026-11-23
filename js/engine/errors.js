// 迷思代碼 → 錯誤類型（Nova 4.4）。
// C- 讀題、M- 觀念、K- 計算；C-figure（看圖錯）歸 visual。

export const ERROR_TYPE_LABEL = Object.freeze({
  reading: '讀題',
  visual: '看圖',
  calc: '計算',
  concept: '概念',
  unknown: '其他',
});

export function errorTypeOf(code) {
  if (!code) return null;
  if (code === 'C-figure') return 'visual';
  if (code.startsWith('C-')) return 'reading';
  if (code.startsWith('M-')) return 'concept';
  if (code.startsWith('K-')) return 'calc';
  return 'unknown';
}

/** 一題多次作答時，選最有診斷價值的代碼：第一個不是 K-calc／unknown 的，否則第一個 */
export function pickDiagnosticCode(codes) {
  const list = codes.filter(Boolean);
  return list.find((c) => c !== 'K-calc' && c !== 'unknown') || list[0] || null;
}
