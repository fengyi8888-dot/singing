// Math Quest 音效（v0.3，Pixel）
// 全部用 Web Audio 即時合成，沒有任何音檔、沒有外部素材、不連網。
// 只有三種「好消息」音效；沒答對時一律不發出聲音（這個模組刻意沒有 wrong 音效）。
//
// 用法（ES module）：
//   import { play, unlock, setEnabled, setVolume } from './assets/sfx.js';
//   document.addEventListener('pointerdown', unlock, { once: true });  // iPad 必須在第一次觸控時解鎖
//   play('correct');   // 答對：叮咚
//   play('highfive');  // 擊掌：啪
//   play('streak');    // 連續答對：上升音階
//
// 音量：預設 0.6（0–1），實際最大振幅約 0.15，比系統提示音小聲。家長設定關閉時呼叫 setEnabled(false)。

const NAMES = ['correct', 'highfive', 'streak'];
const PEAK = 0.25;            // 主音量 1.0 時的最大增益；再乘上 volume
let ctx = null;
let enabled = true;
let volume = 0.6;

function getCtx() {
  if (ctx) return ctx;
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  try { ctx = new AC(); } catch (e) { ctx = null; }
  return ctx;
}

/** 在使用者第一次觸控時呼叫（iOS Safari 規定聲音要由觸控啟動）。可重複呼叫。 */
export function unlock() {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function setEnabled(on) { enabled = !!on; }
export function isEnabled() { return enabled; }
/** v：0–1 */
export function setVolume(v) { volume = Math.min(1, Math.max(0, Number(v) || 0)); }

/** 播放音效。name 不是三種之一、關閉中、或瀏覽器不支援時，安靜地不做任何事。 */
export function play(name) {
  if (!enabled || !NAMES.includes(name)) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const out = c.createGain();
  out.gain.value = PEAK * volume;
  out.connect(c.destination);
  schedule(c, out, name, c.currentTime + 0.01);
}

/** 測試用：在離線環境算出音效波形（AudioBuffer），不會發出聲音。 */
export async function renderOffline(name, sampleRate = 44100) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const c = new OAC(1, Math.ceil(sampleRate * 1.0), sampleRate);
  const out = c.createGain();
  out.gain.value = PEAK * volume;
  out.connect(c.destination);
  schedule(c, out, name, 0);
  return c.startRendering();
}

// ---------------------------------------------------------------------------
// 合成

function schedule(c, out, name, t) {
  if (name === 'correct') correct(c, out, t);
  else if (name === 'highfive') highfive(c, out, t);
  else if (name === 'streak') streak(c, out, t);
}

// 鐘聲般的一個音：正弦基音 + 很小的八度泛音，快速起音、自然衰減
function bell(c, out, freq, t, dur, level = 1) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(level, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(out);
  [[freq, 1], [freq * 2, 0.18], [freq * 3, 0.06]].forEach(([f, a]) => {
    const o = c.createOscillator();
    const og = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    og.gain.value = a;
    o.connect(og); og.connect(g);
    o.start(t); o.stop(t + dur + 0.02);
  });
}

// 答對「叮咚」：G5 → C6（上行四度，聽起來是「好耶」），共約 0.5 秒
function correct(c, out, t) {
  bell(c, out, 783.99, t, 0.28, 0.8);
  bell(c, out, 1046.5, t + 0.13, 0.38, 0.9);
}

// 擊掌「啪」：很短的帶通雜訊（手掌拍擊感）＋小小的音高下滑「啵」＋一顆亮晶晶的小鈴
function highfive(c, out, t) {
  const len = Math.floor(c.sampleRate * 0.09);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let seed = 12345;                                  // 固定種子：每次聲音一樣、可測試
  for (let i = 0; i < len; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    d[i] = (seed / 0x7fffffff) * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.9;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.9, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
  src.connect(bp); bp.connect(ng); ng.connect(out);
  src.start(t); src.stop(t + 0.09);

  const o = c.createOscillator();
  const og = c.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(520, t);
  o.frequency.exponentialRampToValueAtTime(180, t + 0.07);
  og.gain.setValueAtTime(0.5, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
  o.connect(og); og.connect(out);
  o.start(t); o.stop(t + 0.09);

  bell(c, out, 2093, t + 0.05, 0.22, 0.25);          // C7 小鈴，很輕
}

// 連續答對：C5 E5 G5 C6 上升琶音，最後一個音拉長
function streak(c, out, t) {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    const last = i === notes.length - 1;
    bell(c, out, f, t + i * 0.085, last ? 0.45 : 0.18, last ? 0.85 : 0.6);
  });
}
