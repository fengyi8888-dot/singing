// 共用作答元件：題目卡、點選片段、選項卡、複選、比的兩格、數字鍵盤。關卡與診斷都用這裡。
import { h, btn } from './dom.js';
import { renderFigure } from './figures.js';
import { speak } from './speech.js';
import { app } from '../app.js';
import { Frac } from '../core/frac.js';

export function mascotSrc(stage, expr) { return `assets/mascots/duo/duo-s${Math.min(5, Math.max(1, stage || 1))}-${expr}.svg`; }
export function mascot(expr = 'happy', cls = '', stage = null) {
  const s = stage ?? app.state?.rewards?.mascotStage ?? 1;
  return h('img', { class: `mq-mascot ${cls}`.trim(), src: mascotSrc(s, expr), alt: '圓圓和方方', draggable: 'false' });
}

/**
 * 題目文字。三種畫法：
 *  - tokens（讀題小幫手）：數字與名詞可以點，依 marks 上色
 *  - q.segments（點選題）：可點的字
 *  - 純文字
 */
export function promptText(q, ui, ctx = {}) {
  const tapPart = q.parts.find((p) => p.kind === 'tap');
  if (ctx.tokens) {
    const m = ctx.marks || {};
    return h('p', { class: 'mq-question__text' }, ctx.tokens.map((t) => {
      if (t.kind === 'text') return t.text;
      const cls = ['mq-seg'];
      if (ctx.tokensTappable) cls.push('is-tappable');
      if (m.blue?.has(t.i)) cls.push('is-mark-known');
      if (m.green?.has(t.i)) cls.push('is-mark-base');
      if (m.noise?.has(t.i)) cls.push('is-mark-noise');
      if (m.nudge?.has(t.i)) cls.push('is-nudge');
      return h('button', { type: 'button', class: cls.join(' '), disabled: !ctx.tokensTappable, 'data-token': String(t.i), onclick: () => ctx.onToken && ctx.onToken(t) }, t.text);
    }));
  }
  if (q.segments) {
    return h('p', { class: 'mq-question__text' }, q.segments.map((sg) => {
      if (sg.text === '\n') return h('br');
      if (sg.tap && tapPart) {
        const selected = ui.responses[tapPart.id] === sg.tap;
        return h('button', {
          type: 'button', class: `mq-seg is-tappable${selected ? ' is-mark-base' : ''}`, disabled: !!ctx.locked,
          onclick: () => { ui.responses[tapPart.id] = sg.tap; ctx.onChange && ctx.onChange(); },
        }, sg.text);
      }
      return sg.text;
    }));
  }
  return h('p', { class: 'mq-question__text' }, q.prompt);
}

export function questionCard(q, ui, ctx = {}) {
  return h('div', { class: `mq-question${ctx.mascotExpr ? ' has-mascot' : ''}` },
    promptText(q, ui, ctx),
    ctx.tts ? btn('朗讀', () => speak(q.prompt), 'mq-btn mq-btn--small mq-speak', { 'aria-label': '朗讀題目' }) : null,
    q.figure ? h('div', { class: 'mq-question__figure' }, renderFigure(q.figure)) : null,
    q.table ? h('div', { class: 'mq-question__figure' }, tableView(q, q.table, ui)) : null,
    q.tables ? h('div', { class: 'mq-question__figure mq-tables' }, q.tables.map((t) => tableView(q, t, ui, `${t.name}表`))) : null,
    ctx.mascotExpr ? mascot(ctx.mascotExpr, 'mq-mascot--sm') : null);
}

function tableView(q, t, ui, caption) {
  const blanks = {};
  q.parts.forEach((p) => { if (p.label) blanks[p.label.replace('空格 ', '')] = p; });
  return h('table', { class: 'mq-table' },
    caption ? h('caption', {}, caption) : null,
    h('tbody', {}, t.rows.map((row, ri) => h('tr', {},
      h('th', { scope: 'row' }, t.headers[ri]),
      row.map((cell) => {
        if (cell.blank) {
          const p = blanks[cell.blank];
          const v = p ? ui.responses[p.id] : '';
          return h('td', { class: 'is-blank' }, cell.blank, v ? ` ${v}` : '');
        }
        return h('td', {}, cell.v);
      })))));
}

/** 作答區（數字框、比的兩格、選項、複選） */
export function partsView(q, ui, ctx = {}) {
  const out = [];
  const parts = q.parts;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.ratioPair && parts[i + 1]?.ratioPair) {
      out.push(h('div', { class: 'mq-ratio-pair' }, numberBox(p, ui, ctx), h('span', { class: 'mq-ratio-pair__colon', 'aria-hidden': 'true' }, ':'), numberBox(parts[i + 1], ui, ctx)));
      i++;
      continue;
    }
    if (p.kind === 'number') out.push(numberBox(p, ui, ctx));
    else if (p.kind === 'choice') out.push(choiceView(p, ui, ctx));
    else if (p.kind === 'multi') out.push(multiView(p, ui, ctx));
    else if (p.kind === 'tap') out.push(h('p', { class: 'mq-subtitle' }, `${p.label || '點出答案'}：點題目裡的字`));
  }
  return out;
}

function numberBox(p, ui, ctx) {
  const v = ui.responses[p.id] || '';
  const focus = ui.focus === p.id && !ctx.locked;
  return h('div', {
    class: `mq-answer${focus ? ' is-focus' : ''}`, role: 'textbox', 'aria-readonly': 'true', 'aria-label': p.label || '答案', tabindex: '0', 'data-part': p.id,
    onclick: () => { if (!ctx.locked) { ui.focus = p.id; ctx.onChange && ctx.onChange(); } },
  },
  p.label && !p.ratioPair ? h('span', { class: 'mq-answer__unit' }, p.label) : null,
  h('span', { class: 'mq-answer__value' }, v),
  p.unit ? h('span', { class: 'mq-answer__unit' }, p.unit) : null);
}

function choiceView(p, ui, ctx) {
  const elim = (ctx.eliminated && ctx.eliminated[p.id]) || [];
  const long = p.options.some((o) => o.label.length > 10);
  return h('div', { class: 'mq-part' },
    p.label ? h('p', { class: 'mq-subtitle' }, p.label) : null,
    h('div', { class: `mq-choices${long ? ' mq-choices--stack' : ''}`, role: 'radiogroup' },
      p.options.map((o) => {
        const sel = ui.responses[p.id] === o.id;
        const isAns = ctx.reveal && o.id === p.answer;
        return h('button', {
          type: 'button', role: 'radio', 'aria-checked': sel ? 'true' : 'false', 'data-option': o.id,
          class: `mq-choice${sel ? ' is-selected' : ''}${elim.includes(o.id) ? ' is-eliminated' : ''}${isAns ? ' is-correct' : ''}`,
          disabled: !!ctx.locked || elim.includes(o.id),
          onclick: () => { ui.responses[p.id] = o.id; ctx.onChange && ctx.onChange(); },
        }, o.label);
      })));
}

function multiView(p, ui, ctx) {
  const picked = new Set(ui.responses[p.id] || []);
  return h('div', { class: 'mq-multi', role: 'group' }, p.options.map((o) => h('button', {
    type: 'button', 'aria-pressed': picked.has(o.id) ? 'true' : 'false', 'data-option': o.id,
    class: `mq-choice${picked.has(o.id) ? ' is-selected' : ''}`, disabled: !!ctx.locked,
    onclick: () => { picked.has(o.id) ? picked.delete(o.id) : picked.add(o.id); ui.responses[p.id] = [...picked]; ctx.onChange && ctx.onChange(); },
  }, o.label)));
}

/** 只需要整數的題目，「.」「分數」「帶分數」變淡但位置不變（ui-spec 第 6 節） */
export function numpadNeeds(q) {
  const nums = q.parts.filter((p) => p.kind === 'number');
  const anyFrac = nums.some((p) => p.allowFraction || !Frac.of(p.answer).isInt());
  return { decimal: anyFrac, fraction: anyFrac };
}

export function numpad(onKey, { decimal = true, fraction = true } = {}) {
  const key = (label, k, cls = 'mq-key', disabled = false) => h('button', { type: 'button', class: cls, disabled, onclick: () => onKey(k), 'aria-label': label, 'data-key': k }, label);
  return h('div', { class: 'mq-numpad' },
    key('7', '7'), key('8', '8'), key('9', '9'), key('⌫', 'back', 'mq-key mq-key--fn'),
    key('4', '4'), key('5', '5'), key('6', '6'), key('清除', 'clear', 'mq-key mq-key--fn'),
    key('1', '1'), key('2', '2'), key('3', '3'), key('分數', '/', 'mq-key mq-key--fn', !fraction),
    key('0', '0', 'mq-key mq-key--wide'), key('.', '.', 'mq-key', !decimal), key('帶分數', '又', 'mq-key mq-key--fn', !fraction));
}

/** 共用的按鍵處理：改 ui.responses[ui.focus]；比的兩格填完前項自動跳到後項 */
export function applyKey(q, ui, k) {
  if (!ui.focus) return;
  let v = ui.responses[ui.focus] || '';
  if (k === 'back') v = v.slice(0, -1);
  else if (k === 'clear') v = '';
  else if (v.length < 12) v += k;
  ui.responses[ui.focus] = v;
}
