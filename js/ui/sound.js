// 音效：使用 Pixel 的 assets/sfx.js（Web Audio 即時合成，沒有音檔、不連網；沒答對時一律不出聲）。
// iOS 規定要在使用者觸控之後才能播放：main.js 在第一次 pointerdown 時呼叫 unlockAudio()。
// 家長設定「音效：關」時，這裡完全不呼叫 sfx.play。
import { app } from '../app.js';
import { play as sfxPlay, unlock, setEnabled } from '../../assets/sfx.js';

export const soundLog = [];            // e2e 用：記錄每次真的送出播放的音效名稱

// 網站的事件名稱 → sfx.js 的三種音效
const MAP = { correct: 'correct', streak: 'streak', challenge: 'streak', highfive: 'highfive', star: 'correct', result: 'streak' };

export function unlockAudio() {
  try { unlock(); } catch { return false; }
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  return !!AC;
}

export function soundEnabled() { return app.state?.settings?.soundEnabled !== false; }

/** 播放；音效關閉時完全不呼叫 */
export function play(name) {
  if (!soundEnabled()) return false;
  soundLog.push(name);
  try { setEnabled(true); sfxPlay(MAP[name] || 'correct'); } catch { /* 音效失敗不影響練習 */ }
  return true;
}
