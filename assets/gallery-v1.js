import { renderPal } from './pal-render.js';
const [anchors, items, hut] = await Promise.all(['mascots/anchors.json', 'items/items.json', 'hut/hut.json'].map((u) => fetch(u).then((r) => r.json())));
const $ = (s) => document.querySelector(s);
const el = (t, c, a = {}) => { const e = document.createElement(t); if (c) e.className = c; for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); return e; };
$('#goal-meter').style.setProperty('--mq-meter', '0.8');
$('#fogbar').style.setProperty('--fog', String(45 / 60));

// 試穿
const pal = (stage, pose, outfit) => renderPal({ stage, pose, outfit, anchors, items, base: '' });
const tryon = pal(4, 'happy', { yuan: ['hat-knit-red', 'clo-vest-stripe', 'acc-glasses-round'], fang: ['hat-sailor', 'clo-overalls', 'acc-backpack'] });
tryon.classList.add('mq-mascot', 'mq-mascot--lg'); $('#tryon').appendChild(tryon);

// 商品格
const states = { 'hat-knit-red': 'is-trying', 'acc-scarf-sky': 'is-wearing', 'hat-sun-dot': 'is-owned', 'clo-raincoat': 'is-short' };
const price = { 'acc-scarf-sky': 8, 'fur-mat-grid': 10, 'hat-knit-red': 15, 'acc-glasses-round': 15, 'fur-pillow-round': 15, 'clo-vest-stripe': 18, 'hat-sun-dot': 20, 'wal-grid-blue': 20, 'acc-backpack': 22, 'clo-raincoat': 25, 'clo-overalls': 35, 'hat-sailor': 40 };
for (const [id, p] of Object.entries(price)) {
  const it = items.items[id];
  const b = el('button', `mq-product ${states[id] || ''}`, { type: 'button', 'data-id': id });
  let art;
  if (it.parts) { art = pal(4, 'cheer', { yuan: [id] }); art.setAttribute('viewBox', '30 -24 170 270'); art.classList.add('mq-product__art'); }
  else { art = el('img', 'mq-product__art', { src: it.href.replace(/^assets\//, ''), alt: '' }); }
  const name = el('span', 'mq-product__name'); name.textContent = it.name;
  const pr = el('span', 'mq-price'); pr.innerHTML = `<svg class="mq-icon"><use href="icons/ui-icons.svg#ic-star-coin"/></svg>${p}`;
  b.append(art, name, pr); $('#products').appendChild(b);
}

// 小屋（用 hut.json 的座標，以百分比定位）
const box = el('div', 'g-hut'); box.setAttribute('data-test', 'hut');
const S = el('svg'); // 用 SVG 組，比較好對齊
const NS = 'http://www.w3.org/2000/svg';
const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', hut.viewBox); svg.setAttribute('class', 'mq-pal');
const img = (href, x, y, w, h) => { const i = document.createElementNS(NS, 'image'); i.setAttribute('href', href); for (const [k, v] of Object.entries({ x, y, width: w, height: h })) i.setAttribute(k, v); return i; };
svg.appendChild(img('items/wal-grid-blue.svg', 0, 0, 800, 400));
svg.appendChild(img(hut.floor.default.replace(/^hut\//, 'hut/'), 0, 400, 800, 160));
svg.appendChild(img(hut.room, 0, 0, 800, 560));
const furn = ['items/fur-pillow-round.svg', null, 'items/fur-mat-grid.svg'];
hut.furnitureSlots.forEach((s, i) => { if (furn[i]) svg.appendChild(img(furn[i], s.x - 100, s.y - 150, 200, 160)); });
const ph = hut.pals.width * 270 / 340;
const g = document.createElementNS(NS, 'svg');
for (const [k, v] of Object.entries({ x: hut.pals.x - hut.pals.width / 2, y: hut.pals.y - ph, width: hut.pals.width, height: ph })) g.setAttribute(k, v);
const p2 = pal(3, 'cheer', { yuan: ['hat-sun-dot', 'acc-scarf-sky'], fang: ['clo-raincoat'] });
g.setAttribute('viewBox', p2.getAttribute('viewBox')); [...p2.childNodes].forEach((n) => g.appendChild(n)); svg.appendChild(g);
svg.appendChild(img('package/package-closed.svg', hut.package.x - 55, hut.package.y - 100, 110, 100));
['ornaments/pkg-plant.svg', 'ornaments/pkg-shell.svg', 'ornaments/rare-lighthouse-model.svg', 'badges/badge-01-first-light.svg'].forEach((h, i) => { const s = hut.shelfSlots[i]; svg.appendChild(img(h, s.x - 28, s.y - 56, 56, 56)); });
$('#hut').appendChild(svg);

// 霧燈精：<use> ＋ CSS 變數換色
const units = ['g6-rate-percent', 'g6-fraction-division', 'g6-ratio', 'g6-two-quantity', 'g6-circumference', 'g6-problem-solving'];
const ex = ['normal', 'funny', 'happy', 'normal', 'funny', 'happy'];
units.forEach((u, i) => {
  const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 200 200'); s.setAttribute('class', `mq-fog mq-fog--${u} is-idle`); s.setAttribute('data-unit', u);
  for (const h of [`boss/fog.svg#fog-${ex[i]}`, `boss/fog.svg#emblem-${u}`]) { const us = document.createElementNS(NS, 'use'); us.setAttribute('href', h); s.appendChild(us); }
  $('#fogs').appendChild(s);
});

// 包裹
$('#pkg').addEventListener('click', (e) => { const b = e.currentTarget; b.classList.remove('is-waiting'); b.classList.add('is-opening');
  b.querySelector('.mq-package__art--open').addEventListener('animationend', () => { b.classList.replace('is-opening', 'is-opened'); }, { once: true }); });

// 朋友圖鑑
const cards = [['chiuchiu', 'normal', 'is-joined', '啾啾', '小松鼠・兩量關係島', 3, 3], ['mianmian', 'worried', 'is-waiting', '棉棉', '小綿羊・比與比值島', 1, 3], ['chiuchiu', 'normal', 'is-unknown', '？？？', '即將登場', 0, 0]];
for (const [f, e, st, nm, meta, on, tot] of cards) {
  const c = el('div', `mq-friendcard ${st}`);
  const rb = el('span', 'mq-friendcard__ribbon'); rb.textContent = st === 'is-joined' ? '好朋友' : st === 'is-waiting' ? '還在等你幫忙' : '即將登場';
  const im = el('img', 'mq-friendcard__art', { src: `friends/${f}-${st === 'is-joined' ? 'happy' : e}.svg`, alt: '' });
  const n = el('p', 'mq-friendcard__name'); n.textContent = nm;
  const m = el('p', 'mq-friendcard__meta'); m.textContent = meta;
  c.append(rb, im, n, m);
  if (tot) { const h = el('span', 'mq-hearts', { 'aria-label': `${tot} 顆心裡有 ${on} 顆` }); for (let i = 0; i < tot; i++) h.appendChild(el('i', i < on ? 'is-on' : '')); c.appendChild(h); }
  $('#friends').appendChild(c);
}
document.body.dataset.ready = '1';
