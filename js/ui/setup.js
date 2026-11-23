// 第一次使用（Nova 2.0–2.5、8.5）：iPad 加入主畫面 → 家長設定暱稱與 PIN → 認識圓圓 & 方方 →
// 「點亮群島」診斷（兩段各 10 題，不顯示對錯）→ 判讀、航線 → 首航關卡
import { h, btn, toast } from './dom.js';
import { nav } from './router.js';
import { app } from '../app.js';
import { ActiveTimer } from '../core/timer.js';
import { NICK_ADJ, NICK_NOUN, pickPhrase } from '../data/phrases.js';
import { DIAG_SEGMENTS } from '../data/diagnostic.js';
import { diagItem, diagQuestion, recordDiagAnswer, recordDiagSplit, finishSegment, applyDiagnostic } from '../engine/diagnostic.js';
import { buildRoute, openRouteNodes, ensureDailyPlan, isTypeAllowed } from '../engine/plan.js';
import { pickFocusType, ensureSkill } from '../engine/skills.js';
import { checkBadges } from '../engine/badges.js';
import { questionCard, partsView, numpad, numpadNeeds, applyKey, mascot } from './parts.js';
import { pinPad, hashPin } from './parent.js';
import { startStage } from './screens.js';

export function isStandalone() {
  return !!(globalThis.navigator?.standalone || globalThis.matchMedia?.('(display-mode: standalone)')?.matches);
}

export function validateNickname(name) {
  const v = String(name || '').trim();
  if (!v) return '請取一個綽號';
  if ([...v].length > 8) return '最多 8 個字喔';
  if (/\d{3,}/.test(v.normalize('NFKC'))) return '數字太多囉，換個綽號吧';
  return null;
}

function shell(...kids) {
  return h('div', { class: 'mq-screen' }, h('main', { class: 'mq-main' }, ...kids));
}

export function setupScreen(root) {
  const st = app.state;
  const s = st.settings;
  if (s.setupDone && st.diagnostic.status === 'done') { nav('#/'); return; }
  // 診斷已經開始過：直接回到診斷
  if (st.diagnostic.status !== 'not-started' || s.setupStep === 'diag') { diagIntro(root); return; }
  if (s.setupStep === 'ipad' && (isStandalone() || s.launch.ipadCheckSkipped)) s.setupStep = 'parent';

  if (s.setupStep === 'ipad') {
    root.append(shell(h('section', { class: 'mq-card mq-stack mq-parent' },
      h('h1', { class: 'mq-title' }, '開始前（給家長）'),
      h('p', {}, '建議先把網站加入主畫面再開始，進度比較不會被清除。'),
      h('ol', { class: 'mq-ipad-steps' },
        h('li', {}, '按 Safari 上方或下方的「分享」按鈕（方框加向上的箭頭）。'),
        h('li', {}, '往下滑，點「加入主畫面」，再按「加入」。'),
        h('li', {}, '回到主畫面，點新的「數字群島」圖示打開。')),
      h('p', { class: 'mq-callout' }, '注意：從 Safari 分頁開啟和從主畫面開啟，兩邊的進度是分開的。請在孩子開始玩之前完成這一步。'),
      btn('先略過，直接開始', () => { s.launch.ipadCheckSkipped = true; s.setupStep = 'parent'; app.save(); render(); }, 'mq-btn mq-btn--secondary'))));
    return;
  }

  if (s.setupStep === 'parent') {
    const input = h('input', { type: 'text', maxlength: '8', class: 'mq-answer', 'aria-label': '暱稱', value: st.profile.nickname || '', autocomplete: 'off' });
    const msg = h('p', { class: 'mq-note', 'aria-live': 'polite' });
    const box = h('div', { class: 'mq-stack' });
    const askPin = () => {
      if (s.parentPinHash) { s.setupStep = 'meet'; app.save(); render(); return; }
      let first = null;
      const draw = () => box.replaceChildren(pinPad({
        title: first ? '再輸入一次，確認家長 PIN' : '設定 4 位數家長 PIN',
        note: '進入家長區時要輸入。這是避免孩子誤入的隔間，不是真正的上鎖。',
        onDone: (v) => {
          if (!first) { first = v; draw(); return; }
          if (v !== first) { first = null; toast('兩次輸入不一樣，請重新設定', 'info'); draw(); return; }
          s.parentPinHash = hashPin(v); s.setupStep = 'meet'; app.save(); render();
        },
      }));
      draw();
    };
    box.append(
      h('h1', { class: 'mq-title' }, '幫孩子取一個暱稱（給家長）'),
      h('p', { class: 'mq-callout' }, '取一個好玩的綽號就好，不要用真的名字喔！'),
      input,
      btn('幫我想一個', () => { input.value = NICK_ADJ[Math.floor(Math.random() * NICK_ADJ.length)] + NICK_NOUN[Math.floor(Math.random() * NICK_NOUN.length)]; input.value = [...input.value].slice(0, 8).join(''); }, 'mq-btn mq-btn--ghost'),
      msg,
      btn('下一步', () => {
        const err = validateNickname(input.value);
        if (err) { msg.textContent = err; return; }
        st.profile.nickname = input.value.trim(); app.save(); askPin();
      }, 'mq-btn mq-btn--primary mq-btn--lg', { 'data-test': 'nick-next' }));
    root.append(shell(h('section', { class: 'mq-card mq-parent' }, box)));
    return;
  }

  if (s.setupStep === 'meet') {
    root.append(shell(h('section', { class: 'mq-card mq-stack' },
      mascot('cheer', 'mq-mascot--lg is-hop', 1),
      h('p', { class: 'mq-bubble mq-bubble--cheer' }, `嗨，${st.profile.nickname}！我是圓圓，我們先想一想。`),
      h('p', { class: 'mq-bubble' }, '我是方方，沒問題，再衝一次！'),
      h('p', { class: 'mq-title' }, '從今天起，我們就是好朋友了！'),
      btn('好！', () => { s.setupStep = 'diag'; app.save(); render(); }, 'mq-btn mq-btn--sun mq-btn--lg'))));
    return;
  }
  diagIntro(root);

  function render() { root.replaceChildren(); setupScreen(root); }
}

// ---------------------------------------------------------------------------
// 診斷
// ---------------------------------------------------------------------------
function diagIntro(root) {
  const st = app.state;
  const d = st.diagnostic;
  if (d.status === 'done') { afterDiagnostic(root); return; }
  const seg = d.segmentIndex;
  const answered = new Set(d.answers.map((a) => a.itemId));
  const items = DIAG_SEGMENTS[seg];
  const isBreak = seg > 0 && !items.some((no) => answered.has(`d${no}`));
  root.replaceChildren(shell(h('section', { class: 'mq-card mq-stack' },
    mascot('happy', 'mq-mascot--lg is-idle'),
    h('h1', { class: 'mq-title' }, isBreak ? '第一片海域完成了！' : '點亮群島'),
    h('p', {}, isBreak ? '要繼續下一段，還是明天再來？' : '群島的燈塔都暗掉了，你可以幫我看看哪些地方我們已經會了嗎？每答一題，就會點亮一盞燈。'),
    h('p', { class: 'mq-note' }, '不會的題目按「我還沒學過」就好，一樣會點亮一盞燈。'),
    btn(isBreak ? '繼續' : '開始', () => runSegment(root), 'mq-btn mq-btn--sun mq-btn--lg', { 'data-test': 'diag-start' }),
    isBreak ? btn('明天再來', () => nav('#/later'), 'mq-btn mq-btn--ghost') : null)));
}

function runSegment(root) {
  const st = app.state;
  const d = st.diagnostic;
  d.status = 'in-progress';
  const items = DIAG_SEGMENTS[d.segmentIndex];
  let idx = items.findIndex((no) => !d.answers.some((a) => a.itemId === `d${no}`));
  if (idx < 0) idx = items.length;
  let ui, q, timer, split = null;
  const next = () => {
    if (idx >= items.length) {
      const day = app.today();
      const { done } = finishSegment(st, day);
      app.save();
      if (done) afterDiagnostic(root); else diagIntro(root);
      return;
    }
    q = diagQuestion(diagItem(items[idx]));
    ui = { responses: {}, focus: (q.parts.find((p) => p.kind === 'number') || {}).id || null };
    split = null;
    app.timer = timer = new ActiveTimer().start();
    draw();
  };
  const lamps = () => h('div', { class: 'mq-lamps', 'aria-label': `第 ${idx + 1} 題，共 ${items.length} 題` }, items.map((_, i) => h('span', { class: `mq-lamp${i < idx ? ' is-on' : ''}` })));
  const draw = () => {
    const hasNumber = q.parts.some((p) => p.kind === 'number');
    let work;
    if (split) {
      const c = split.step === 'goal' ? split.data.goal : split.data.op;
      work = h('div', { class: 'mq-card mq-card--soft' },
        h('p', { class: 'mq-helper__prompt' }, split.step === 'goal' ? '這題最後要問什麼？' : '哪一個算式是對的？'),
        h('div', { class: 'mq-choices mq-choices--stack' }, c.options.map((o) => h('button', {
          type: 'button', class: 'mq-choice', 'data-option': o.id,
          onclick: () => {
            split.result[split.step] = o.id;
            if (split.step === 'goal') { split.step = 'op'; draw(); return; }
            recordDiagSplit(st, q.no, split.result); app.save(); idx++; next();
          },
        }, o.label))));
    }
    root.replaceChildren(h('div', { class: 'mq-screen' },
      h('header', { class: 'mq-topbar' }, lamps()),
      h('main', { class: 'mq-stage' },
        h('section', { class: 'mq-stage__question' }, questionCard(q, ui, { locked: !!split, onChange: draw, tts: st.settings.ttsEnabled, mascotExpr: 'think' })),
        h('section', { class: 'mq-stage__work' }, split ? work : partsView(q, ui, { onChange: draw })),
        !split && hasNumber ? h('section', { class: 'mq-stage__pad' }, numpad((k) => { timer.touch(); applyKey(q, ui, k); draw(); }, numpadNeeds(q))) : null,
        split ? null : h('div', { class: 'mq-stage__actions' },
          btn('我還沒學過', () => submit(true), 'mq-btn mq-btn--ghost', { 'data-test': 'diag-skip' }),
          btn('確定', () => submit(false), 'mq-btn mq-btn--primary mq-btn--lg')))));
  };
  const submit = (skipped) => {
    if (!skipped) {
      const g = q.check(ui.responses);
      if (g.empty) { toast('還有地方沒有填喔', 'info'); return; }
    }
    const secs = timer.stop();
    const { needSplit } = recordDiagAnswer(st, q.no, { responses: skipped ? null : ui.responses, skipped, secs });
    app.save();
    toast(pickPhrase('diagThanks'), 'reward', 900);   // 不顯示對錯：一律點亮一盞燈
    if (needSplit) { split = { step: 'goal', data: diagItem(q.no).split, result: {} }; draw(); return; }
    idx++; next();
  };
  next();
}

function afterDiagnostic(root) {
  const st = app.state;
  const day = app.today();
  if (!st.diagnostic.summary?.length) {
    applyDiagnostic(st, day);
    buildRoute(st);
    checkBadges(st, day);
  }
  st.settings.setupDone = true;
  ensureDailyPlan(st, day);
  app.save();
  root.replaceChildren(shell(h('section', { class: 'mq-card mq-stack' },
    mascot('happy', 'mq-mascot--lg is-dance'),
    h('h1', { class: 'mq-title' }, '群島地圖亮起來了！'),
    h('p', {}, '謝謝你幫忙點亮燈塔。我們一起出發第一次航行吧！'),
    st.flags.firstVoyageDone ? btn('回首頁', () => nav('#/'), 'mq-btn mq-btn--sun mq-btn--lg')
      : btn('首航出發！', () => startFirstVoyage(), 'mq-btn mq-btn--sun mq-btn--lg', { 'data-test': 'first-voyage' }))));
}

/** 2.5：在開放的航線節點中，選初始難度最高的技能鍵（同分時 number 航道優先） */
export function startFirstVoyage() {
  const st = app.state;
  const day = app.today();
  const open = openRouteNodes(st, day);
  const cands = ['number', 'geometry'].map((tr) => open[tr]).filter(Boolean).map((unitId) => {
    const key = pickFocusType(st, unitId, { allowed: (t) => isTypeAllowed(st, unitId, t, day) });
    return { unitId, key, level: ensureSkill(st, key).level };
  });
  if (!cands.length) { nav('#/'); return null; }
  const best = cands.reduce((m, c) => (c.level > m.level ? c : m));
  return startStage({ unitId: best.unitId, focusKey: best.key, firstVoyage: true });
}

export function laterScreen(root) {
  root.append(shell(h('section', { class: 'mq-card mq-stack' },
    mascot('happy', 'mq-mascot--lg is-idle'),
    h('p', { class: 'mq-title' }, '明天見，我會在這裡等你！'),
    btn('還是現在繼續', () => nav('#/setup'), 'mq-btn mq-btn--secondary'))));
}
