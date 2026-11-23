// 單題作答計時：從題目出現開始；App 切到背景時暫停；超過 60 秒沒有觸控就停止累計，
// 下一次觸控再繼續。時鐘可注入，方便測試。
import { CONFIG } from '../config.js';

export class ActiveTimer {
  constructor(nowFn = () => Date.now(), idleMs = CONFIG.IDLE_STOP_SECS * 1000) {
    this.now = nowFn;
    this.idleMs = idleMs;
    this.accMs = 0;
    this.running = false;
    this.visible = true;
    this.segStart = 0;
    this.lastTouch = 0;
  }

  start() {
    const t = this.now();
    this.accMs = 0; this.running = true; this.visible = true;
    this.segStart = t; this.lastTouch = t;
    return this;
  }

  /** 把目前這一段（segStart → min(now, lastTouch + idle)）結算進 accMs */
  _flush(t) {
    if (!this.running || !this.visible) return;
    const end = Math.min(t, this.lastTouch + this.idleMs);
    if (end > this.segStart) this.accMs += end - this.segStart;
    this.segStart = t;
  }

  touch() {
    const t = this.now();
    this._flush(t);
    this.segStart = t; this.lastTouch = t;
  }

  hide() {
    const t = this.now();
    this._flush(t);
    this.visible = false;
  }

  show() {
    const t = this.now();
    if (!this.visible) { this.visible = true; this.segStart = t; this.lastTouch = t; }
  }

  /** 目前累計秒數（不停止） */
  peekSecs() {
    if (!this.running) return Math.round(this.accMs / 100) / 10;
    const t = this.now();
    let ms = this.accMs;
    if (this.visible) {
      const end = Math.min(t, this.lastTouch + this.idleMs);
      if (end > this.segStart) ms += end - this.segStart;
    }
    return Math.round(ms / 100) / 10;
  }

  stop() {
    const t = this.now();
    this._flush(t);
    this.running = false;
    return Math.round(this.accMs / 100) / 10;   // 秒，一位小數
  }
}
