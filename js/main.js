// 啟動：讀進度（localStorage + IndexedDB）→ 請求持久儲存 → 每日快照 → 開始畫面路由
import { app } from './app.js';
import { Store, requestPersist } from './storage/store.js';
import { route, startRouter } from './ui/router.js';
import { stageScreen } from './ui/stage-view.js';
import {
  homeScreen, mapScreen, unitScreen, resultScreen, mistakesScreen, collectionScreen, previewScreen,
} from './ui/screens.js';
import { parentScreen } from './ui/parent.js';
import { setupScreen, laterScreen, isStandalone } from './ui/setup.js';
import { ensureWeekSnapshot } from './engine/report.js';
import { buildRoute } from './engine/plan.js';
import { unlockAudio, soundLog } from './ui/sound.js';

route(/^#\/$/, homeScreen);
route(/^#\/setup$/, setupScreen);
route(/^#\/later$/, laterScreen);
route(/^#\/map$/, (root) => mapScreen(root, 'route'));
route(/^#\/map\/(\d)$/, (root, g) => mapScreen(root, g));
route(/^#\/unit\/([\w-]+)$/, unitScreen);
route(/^#\/stage$/, stageScreen);
route(/^#\/result$/, resultScreen);
route(/^#\/mistakes$/, mistakesScreen);
route(/^#\/collection$/, collectionScreen);
route(/^#\/parent$/, parentScreen);
route(/^#\/preview$/, previewScreen);

// 作答計時：切到背景暫停、回來繼續；任何觸控都算「有在作答」
document.addEventListener('visibilitychange', () => {
  if (!app.timer) return;
  if (document.visibilityState === 'hidden') app.timer.hide();
  else app.timer.show();
});
document.addEventListener('pointerdown', () => { if (app.timer) app.timer.touch(); }, { capture: true, passive: true });
// iOS：第一次觸控之後才能播放聲音
document.addEventListener('pointerdown', () => unlockAudio(), { capture: true, passive: true, once: true });
document.addEventListener('keydown', () => { if (app.timer) app.timer.touch(); }, { capture: true, passive: true });
window.addEventListener('pagehide', () => { app.save(); });

async function boot() {
  app.store = new Store();
  const { data, source, restored } = await app.store.load();
  app.state = data;
  app.loadInfo = { source, restored };
  const standalone = isStandalone();
  const L = app.state.settings.launch;
  L.standalone = standalone; L.lastAt = Date.now();
  if (standalone) L.everStandalone = true;
  if (!app.state.route.nodes.length) buildRoute(app.state);
  await requestPersist(app.state);
  ensureWeekSnapshot(app.state, app.today());
  await app.save();
  await app.store.dailySnapshot(app.state, app.today());
  if (!location.hash || location.hash === '#') location.hash = '#/';
  // e2e 測試用：網址有 ?e2e 時，讓 Playwright 讀得到目前題目的正解（只在本機記憶體，不傳送任何資料）
  if (new URLSearchParams(location.search).has('e2e')) window.__mq = { app, soundLog };
  startRouter();
}

boot().catch((e) => {
  console.error(e);
  const root = document.getElementById('app');
  root.textContent = '啟動時發生問題，請重新整理頁面。';
});
