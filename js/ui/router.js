// 以網址 # 切換畫面（GitHub Pages 靜態網站可用，不需要伺服器設定）
const routes = [];

export function route(pattern, render) { routes.push({ pattern, render }); }

export function nav(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

export function render() {
  const root = document.getElementById('app');
  const hash = location.hash || '#/';
  for (const r of routes) {
    const m = r.pattern.exec(hash);
    if (m) {
      root.replaceChildren();
      for (const el of document.querySelectorAll('.mq-sheet, .mq-overlay, .mq-celebrate, .mq-flystar')) el.remove();   // 換畫面時收起底部面板
      window.scrollTo(0, 0);
      r.render(root, ...m.slice(1).map(decodeURIComponent));
      return;
    }
  }
  location.hash = '#/';
}

export function startRouter() {
  window.addEventListener('hashchange', render);
  render();
}
