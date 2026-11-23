// 寬容的答案判斷：全形轉半形、去空白、接受等值分數、小數與帶分數。
import { Frac } from './frac.js';

const UNIT_SUFFIX = /(平方公分|立方公分|公分|公尺|公里|公斤|公克|毫升|公升|人次|元|頁|人|隻|下|棵|杯|歲|圈|段|倍|本|張|顆|片|根|種|場|個|支|處|秒|分鐘|次|度|°|%|cm|m|kg)$/i;

/** 全形 → 半形，並統一符號 */
export function normalizeInput(raw) {
  if (raw == null) return '';
  let s = String(raw).normalize('NFKC');           // 全形數字、全形斜線、全形小數點 → 半形
  s = s.replace(/[\s,，]/g, '');
  s = s.replace(/[÷∕⁄／]/g, '/').replace(/[。．]/g, '.');
  s = s.replace(/又|and/gi, '又');
  return s;
}

/**
 * 解析數字答案 → Frac；無法解析回傳 null。
 * 接受：12、12.50、.5、3/4、1又1/2、1 1/2（空白已去除前先處理）、-3。
 */
export function parseNumber(raw) {
  if (raw == null) return null;
  let s = String(raw).normalize('NFKC').trim();
  // 帶分數「1 1/2」：在去空白前先轉成「1又1/2」
  s = s.replace(/^(\d+)\s+(\d+\s*\/\s*\d+)$/, '$1又$2');
  s = normalizeInput(s).replace(UNIT_SUFFIX, '');
  if (!s) return null;
  let m;
  try {
    if ((m = /^(-?)(\d+)又(\d+)\/(\d+)$/.exec(s))) {
      const d = Number(m[4]); if (d === 0) return null;
      const v = new Frac(Number(m[2]) * d + Number(m[3]), d);
      return m[1] ? v.neg() : v;
    }
    if ((m = /^(-?)(\d+(?:\.\d+)?|\.\d+)\/(\d+(?:\.\d+)?)$/.exec(s))) {
      const num = Frac.parseDecimal(m[2].startsWith('.') ? '0' + m[2] : m[2]);
      const den = Frac.parseDecimal(m[3]);
      if (den.n === 0) return null;
      const v = num.div(den);
      return m[1] ? v.neg() : v;
    }
    if ((m = /^(-?)(\d+(?:\.\d*)?|\.\d+)$/.exec(s))) {
      let body = m[2];
      if (body.startsWith('.')) body = '0' + body;
      if (body.endsWith('.')) body = body.slice(0, -1);
      const v = Frac.parseDecimal(body);
      return m[1] ? v.neg() : v;
    }
  } catch {
    return null;
  }
  return null;
}

/** 數字是否相等（精確） */
export function sameNumber(a, b) {
  if (a == null || b == null) return false;
  return Frac.of(a).eq(Frac.of(b));
}
