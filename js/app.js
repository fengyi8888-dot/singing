// 全站共用的執行狀態
import { today } from './core/gameday.js';

export const app = {
  state: null,        // 整份資料（schema.js）
  store: null,        // Store
  loadInfo: null,     // { source, restored }
  run: null,          // 進行中的 StageRun
  lastResult: null,   // 上一關結算
  timer: null,        // 目前題目的 ActiveTimer
  today,
  async save() {
    if (!this.store || !this.state) return null;
    try { return await this.store.save(this.state); } catch (e) { console.warn('儲存失敗', e); return null; }
  },
};
