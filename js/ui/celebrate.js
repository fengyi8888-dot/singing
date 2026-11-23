// 答對時刻（Pixel theme.css 第 16 節、assets/celebrate-demo.js 的正式版）：
// 星星飛行、三種慶祝等級（一般／連續 3 題／難題一次就對）、擊掌元件。
// 只用 CSSOM（style.setProperty）設定變數，元素用 h()/s() 建立，不用 innerHTML（符合 CSP）。
import { h, s } from './dom.js';
import { mascotSrc } from './parts.js';
import { app } from '../app.js';

const starIcon = () => s('svg', { 'aria-hidden': 'true' }, s('use', { href: '#i-star' }));
const reduced = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

/** 星星從 fromEl 中心飛到 toEl 中心；落地時 toEl 跳一下 */
export function flyStar(fromEl, toEl, onLand) {
  if (!fromEl || !toEl) return;
  const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
  const star = h('span', { class: 'mq-flystar', 'aria-hidden': 'true' }, starIcon());
  star.style.setProperty('--from-x', `${a.left + a.width / 2}px`);
  star.style.setProperty('--from-y', `${a.top + a.height / 2}px`);
  star.style.setProperty('--to-x', `${b.left + b.width / 2}px`);
  star.style.setProperty('--to-y', `${b.top + b.height / 2}px`);
  document.body.append(star);
  const land = () => {
    star.remove();
    toEl.classList.remove('is-bump'); void toEl.offsetWidth; toEl.classList.add('is-bump');
    if (onLand) onLand();
  };
  if (reduced()) land(); else star.addEventListener('animationend', land, { once: true });
  setTimeout(() => star.isConnected && land(), 1500);      // 保險：動畫事件沒有觸發也會收掉
}

const confetti = (cls, n) => h('div', { class: `mq-confetti ${cls}`, 'aria-hidden': 'true' }, Array.from({ length: n }, () => h('i')));

/**
 * 慶祝圖層（不擋觸控）。level：'streak' → 「連續 3 題！」徽章 + 小彩帶；'challenge' → 大型慶祝卡 + 全螢幕彩帶
 * 回傳圖層元素（會自己移除）。
 */
export function celebrateLayer(level, title) {
  if (level !== 'streak' && level !== 'challenge') return null;
  const layer = h('div', { class: 'mq-celebrate', 'aria-hidden': 'true', 'data-level': level });
  if (level === 'streak') {
    layer.append(h('div', { class: 'mq-streak-badge' }, starIcon(), title || '連續 3 題！', confetti('mq-confetti--small', 16)));
  } else {
    layer.append(
      h('div', { class: 'mq-bigcheer' },
        h('img', { class: 'mq-mascot is-dance', src: mascotSrc(app.state.rewards.mascotStage, 'happy'), alt: '' }),
        h('p', { class: 'mq-bigcheer__title' }, title || '好難的題目，一次就答對！')),
      confetti('mq-confetti--big', 40));
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), level === 'streak' ? 1900 : 3700);
  return layer;
}

/** 擊掌元件：.mq-highfive.is-ready → 點下去 → .is-clapped（只會成功一次） */
export function highFiveBlock({ done = false, onClap }) {
  const stage = app.state.rewards.mascotStage;
  const prompt = h('p', { class: 'mq-highfive__prompt', role: 'status' }, done ? '擊掌成功！' : '點我擊掌！');
  const wrap = h('div', { class: `mq-highfive ${done ? 'is-clapped' : 'is-ready'}` });
  const btn = h('button', {
    type: 'button', class: 'mq-highfive__btn', 'aria-label': '和圓圓方方擊掌', 'data-test': 'highfive', disabled: done,
    onclick: () => {
      if (wrap.classList.contains('is-clapped')) return;
      const text = onClap ? onClap() : null;
      if (text === false) return;
      wrap.classList.replace('is-ready', 'is-clapped');
      btn.disabled = true;
      prompt.textContent = text || '耶！我們一起做到了！';
    },
  },
  h('img', { class: 'mq-highfive__art mq-highfive__art--ready', src: `assets/mascots/duo/duo-s${stage}-hf-ready.svg`, alt: '' }),
  h('img', { class: 'mq-highfive__art mq-highfive__art--clap', src: `assets/mascots/duo/duo-s${stage}-hf-clap.svg`, alt: '' }),
  h('span', { class: 'mq-highfive__burst', 'aria-hidden': 'true' }, Array.from({ length: 8 }, () => h('i'))));
  wrap.append(btn, prompt);
  return wrap;
}
