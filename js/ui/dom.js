// 極簡 DOM 工具：h('div', { class: 'x', onclick }, '文字', child)
// 一律用 textContent 放文字，不用 innerHTML（避免注入）。

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  setAttrs(el, attrs);
  append(el, children);
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}

function setAttrs(el, attrs) {
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

export function btn(label, onClick, cls = 'mq-btn', attrs = {}) {
  return h('button', { type: 'button', class: cls, onclick: onClick, ...attrs }, label);
}

/** 短暫訊息（toast） */
export function toast(text, kind = 'info', ms = 1800) {
  const el = h('div', { class: `mq-toast mq-toast--${kind}`, role: 'status', 'aria-live': 'polite' }, text);
  document.body.append(el);
  setTimeout(() => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 400); }, ms);
}
