// 「遊戲日」：每天凌晨 04:00（平板本地時間）換日。日期字串一律 YYYY-MM-DD。
import { CONFIG } from '../config.js';

let clock = () => Date.now();
/** 測試用：替換時鐘 */
export function setClock(fn) { clock = fn || (() => Date.now()); }
export function now() { return clock(); }

function pad(n) { return String(n).padStart(2, '0'); }

export function gameDayOf(ts) {
  const d = new Date(ts - CONFIG.DAY_START_HOUR * 3600 * 1000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today() { return gameDayOf(clock()); }

export function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** b − a 的天數 */
export function daysBetween(a, b) {
  const toUTC = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((toUTC(b) - toUTC(a)) / 86400000);
}

export function compactDate(day) { return day.replace(/-/g, ''); }
