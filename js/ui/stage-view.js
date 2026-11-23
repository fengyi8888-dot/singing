// 關卡畫面：一次一題。流程邏輯在 engine/stage.js，讀題小幫手邏輯在 engine/helper.js；這裡只負責畫面與觸控。
import { h, btn, toast } from './dom.js';
import { stopSpeaking, speak } from './speech.js';
import { ActiveTimer } from '../core/timer.js';
import { CONFIG } from '../config.js';
import { app } from '../app.js';
import { nav } from './router.js';
import { checkPart } from '../engine/question.js';
import { ReadingHelper, STEP_LABEL, GEO_STEP_LABEL } from '../engine/helper.js';
import { pickPhrase, MISTAKE_NOTE } from '../data/phrases.js';
import { questionCard, partsView, numpad, numpadNeeds, applyKey, mascot } from './parts.js';
import { play } from './sound.js';
import { flyStar, celebrateLayer, highFiveBlock } from './celebrate.js';

const KIND_TAG = { prereq: '秘密捷徑題', review: '修補題', warmup: '暖身', 'worked-example': '示範題' };

export function stageScreen(root) {
  const run = app.run;
  if (!run) { nav('#/'); return; }
  let ui = null;
  let confirmUnlockAt = 0;
  let autoTimer = null;
  // 這個畫面還是目前的畫面嗎？（離開 #/stage 之後，計時器或延遲的重畫都不可以再畫進 #app）
  const alive = () => location.hash === '#/stage' && app.run === run;

  function startItem() {
    clearTimeout(autoTimer);
    const c = run.next();
    if (!c) { finish(); return; }
    const q = c.question;
    ui = {
      responses: {}, focus: firstNumberPart(q), phase: c.example ? 'example' : 'answer',
      feedback: null, solveShown: 1, selfValue: '', selfDone: null, answerSecs: null, firstSecs: null,
      helper: null, marks: { blue: new Set(), green: new Set(), noise: new Set(), nudge: new Set() }, pen: 'known',
      hSel: null, hMsg: null, mascotExpr: 'think',
    };
    if (q.helper && c.G != null) {
      ui.helper = new ReadingHelper(q, c.G);
      if (ui.helper.active && ui.phase === 'answer') ui.phase = 'helper';
    }
    if (c.kind === 'assisted') ui.feedback = { kind: 'hint', text: q.hints[0] };
    if (c.slowDown) { confirmUnlockAt = Date.now() + CONFIG.CONFIRM_DELAY_MS; toast(CONFIG.SLOW_DOWN_PHRASE, 'info'); setTimeout(render, CONFIG.CONFIRM_DELAY_MS + 50); }
    app.timer = new ActiveTimer().start();
    render();
    if (ui.phase === 'helper' && app.state.settings.ttsEnabled) speak(helperPrompt());
  }

  function firstNumberPart(q) { const p = q.parts.find((x) => x.kind === 'number'); return p ? p.id : null; }

  async function finish() {
    const result = run.finish();
    app.lastResult = { ...result, unitId: run.unitId, mode: run.mode };
    app.run = null; app.timer = null;
    await app.save();
    nav('#/result');
  }

  // ---------------------------------------------------------------------------
  function render() {
    if (!alive()) { clearTimeout(autoTimer); return; }
    const c = run.cur;
    if (!c) return;
    const q = c.question;
    const locked = ui.phase !== 'answer';
    const hp = ui.helper;
    const showTokens = hp && (hp.opened && (ui.phase === 'helper' || hp.steps.some((s) => s.done)));
    const tokenStep = ui.phase === 'helper' && hp.active?.id === 'known';
    root.replaceChildren(h('div', { class: 'mq-screen' },
      h('header', { class: 'mq-topbar' },
        btn('離開', () => { if (confirm('要先離開這一關嗎？已經做的題目都會保存。')) leave(); }, 'mq-btn mq-btn--ghost mq-btn--small'),
        dots(),
        h('span', { class: 'mq-spacer' }),
        KIND_TAG[c.kind] ? h('span', { class: 'mq-chip' }, KIND_TAG[c.kind]) : null),
      h('main', { class: 'mq-stage' },
        h('section', { class: 'mq-stage__question' },
          hp && hp.opened ? helperBar(hp) : null,
          ui.phase === 'example' ? exampleCard(c) : questionCard(q, ui, {
            locked, onChange: render, tts: app.state.settings.ttsEnabled, mascotExpr: ui.mascotExpr,
            tokens: showTokens ? hp.tokens : null, tokensTappable: tokenStep, marks: ui.marks, onToken: tapToken,
          })),
        h('section', { class: 'mq-stage__work' },
          ui.phase === 'helper' ? helperWork(hp) : null,
          ui.phase === 'example' || ui.phase === 'helper' ? null : partsView(q, ui, { locked, onChange: render, eliminated: c.eliminated, reveal: ui.phase === 'correct' || (ui.phase === 'solve' && ui.solveShown >= q.explanation.length) }),
          feedbackView(c),
          // 草稿區：預留給之後的手寫草稿板（競試可以在題目卷上計算）；慶祝時收起來，節省空間
          ui.phase === 'correct' ? null : h('section', { class: 'mq-scratch', id: 'scratch', 'data-reserved': 'handwriting-pad', 'aria-label': '草稿區' },
            h('span', { class: 'mq-note' }, '草稿區（之後可以在這裡手寫計算）'))),
        padView(c),
        actionsView(c))));
  }

  function dots() {
    return h('div', { class: 'mq-dots', 'aria-label': `第 ${run.index + 1} 題，共 ${run.total} 題` },
      run.items.map((_, i) => {
        const d = run.done[i];
        const cls = i === run.index ? 'is-current' : d ? (d.outcome === 'half' ? 'is-half' : 'is-done') : '';
        return h('span', { class: `mq-dot ${cls}` });
      }));
  }

  function exampleCard(c) {
    const ex = c.example;
    return h('div', { class: 'mq-question' },
      h('p', { class: 'mq-question__text' }, '先看一題示範：'),
      h('p', { class: 'mq-question__text' }, ex.prompt),
      h('ol', { class: 'mq-steps' }, ex.explanation.map((st) => h('li', {}, st))));
  }

  // ---------------------------------------------------------------------------
  // 讀題小幫手
  // ---------------------------------------------------------------------------
  function helperBar(hp) {
    const labels = hp.isGeo ? GEO_STEP_LABEL : STEP_LABEL;
    const steps = [...hp.steps, { id: 'calc', required: true, done: false }];
    let n = 0;
    return h('div', { class: 'mq-helper', role: 'list', 'aria-label': '讀題小幫手' }, steps.map((s) => {
      n += 1;
      const isActive = (ui.phase === 'helper' && hp.active?.id === s.id) || (s.id === 'calc' && ui.phase !== 'helper');
      const cls = ['mq-helper__step', s.done ? (s.demoed && !s.optionalUsed ? 'is-demo' : 'is-done') : '', isActive ? 'is-active' : '', !s.required && !s.done ? 'is-optional' : ''].filter(Boolean).join(' ');
      const optionalBtn = !s.required && !s.done && s.id !== 'calc';
      const label = optionalBtn ? (s.id === 'known' ? '幫我圈重點' : s.id === 'goal' ? '幫我找問題' : '幫我選') : labels[s.id];
      const inner = [h('span', { class: 'mq-helper__num' }, h('span', {}, String(n))), h('span', { class: 'mq-helper__label' }, label)];
      return optionalBtn
        ? h('button', { type: 'button', class: cls, role: 'listitem', onclick: () => useOptional(s.id) }, inner)
        : h('div', { class: cls, role: 'listitem' }, inner);
    }));
  }

  function helperPrompt() {
    const hp = ui.helper;
    const s = hp?.active;
    if (!s) return '';
    if (s.id === 'goal') return '先找最後一句：題目要我們求什麼？';
    if (s.id === 'known') {
      if (hp.isGeo) return '圖和題目裡，哪些數字是算這題要用的？用藍色筆點出來。';
      return hp.h.base ? '題目給了哪些數？用藍色筆點出來。再換綠色筆點出基準量：「是＿＿的」，空格裡的就是基準量。' : '題目給了哪些數？用藍色筆點出來。';
    }
    return hp.isGeo ? '要用哪一個算式？' : '要用什麼方法算呢？';
  }

  function helperWork(hp) {
    const s = hp.active;
    if (!s) return null;
    const box = [h('p', { class: 'mq-helper__prompt' }, helperPrompt())];
    if (s.id === 'known' && hp.h.base) {
      box.push(h('div', { class: 'mq-markers', role: 'group', 'aria-label': '螢光筆' },
        h('button', { type: 'button', class: 'mq-marker mq-marker--known', 'aria-pressed': ui.pen === 'known' ? 'true' : 'false', onclick: () => { ui.pen = 'known'; render(); } }, '藍色筆（已知的數）'),
        h('button', { type: 'button', class: 'mq-marker mq-marker--base', 'aria-pressed': ui.pen === 'base' ? 'true' : 'false', onclick: () => { ui.pen = 'base'; render(); } }, '綠色筆（基準量）')));
    }
    if (s.id === 'goal' || s.id === 'op') {
      const c = s.id === 'goal' ? hp.h.goal : hp.h.ops;
      box.push(h('div', { class: 'mq-choices mq-choices--stack mq-helper__opts', role: 'radiogroup' }, c.options.map((o) => h('button', {
        type: 'button', role: 'radio', 'aria-checked': ui.hSel === o.id ? 'true' : 'false', 'data-option': o.id,
        class: `mq-choice${ui.hSel === o.id ? ' is-selected' : ''}`, onclick: () => { ui.hSel = o.id; render(); },
      }, o.label))));
    }
    if (ui.hMsg) box.push(h('div', { class: `mq-feedback ${ui.hMsg.kind === 'ok' ? 'mq-feedback--correct' : 'mq-feedback--retry'}`, role: 'status' }, h('p', { class: 'mq-feedback__body' }, ui.hMsg.text)));
    return h('div', { class: 'mq-card mq-card--soft' }, box);
  }

  function tapToken(t) {
    const m = ui.marks;
    if (t.kind === 'noun' || ui.pen === 'base') {
      if (t.kind !== 'noun') { ui.hMsg = { kind: 'retry', text: '綠色筆是用來點「誰是基準量」的名詞喔。' }; render(); return; }
      m.green.has(t.i) ? m.green.delete(t.i) : m.green.add(t.i);
    } else {
      m.blue.has(t.i) ? m.blue.delete(t.i) : m.blue.add(t.i);
    }
    m.nudge.clear();
    render();
  }

  function helperSubmit() {
    const hp = ui.helper;
    const s = hp.active;
    let r;
    if (s.id === 'known') r = hp.answer('known', { blue: [...ui.marks.blue], green: [...ui.marks.green] });
    else { if (!ui.hSel) { toast('先選一個喔', 'info'); return; } r = hp.answer(s.id, ui.hSel); }
    if (r.ok) {
      ui.hMsg = { kind: 'ok', text: pickPhrase('helperStep') };
      ui.hSel = null;
    } else if (r.retry) {
      if (s.id === 'known') {
        ui.marks.nudge = new Set(r.detail.missingIdx);    // 漏圈的片段輕輕閃；多圈的不標色
        ui.hMsg = { kind: 'retry', text: r.detail.baseOk ? '還有重要的數字沒有點到，再看一次題目。' : '再找找看基準量：「是＿＿的」空格裡的那個。' };
      } else {
        ui.hMsg = { kind: 'retry', text: s.id === 'goal' ? '再讀一次最後一句，題目問的是什麼？' : '想想看：已知的量和要求的量，是什麼關係？' };
      }
      ui.hSel = null;
    } else {
      applyDemo(r.demo);
      ui.hMsg = { kind: 'retry', text: `${pickPhrase('helperDemo')}${demoText(s.id, r.demo)}` };
    }
    if (hp.finished) { ui.phase = 'answer'; ui.mascotExpr = 'think'; }
    render();
  }

  function demoText(id, demo) {
    const hp = ui.helper;
    if (id === 'goal') return `題目要求的是「${hp.h.goal.options.find((o) => o.id === demo.goal).label}」。`;
    if (id === 'op') return `要用「${hp.h.ops.options.find((o) => o.id === demo.op).label}」。`;
    return '藍色的是要用的數字，灰色的跟問題沒有關係。';
  }

  function applyDemo(demo) {
    if (demo.marks) {
      ui.marks.blue = new Set(demo.marks.blue); ui.marks.green = new Set(demo.marks.green); ui.marks.noise = new Set(demo.marks.noise);
      ui.marks.nudge.clear();
    }
  }

  function useOptional(id) {
    const demo = ui.helper.useOptional(id);
    if (demo) { applyDemo(demo); ui.hMsg = { kind: 'ok', text: demoText(id, demo) }; }
    render();
  }

  // ---------------------------------------------------------------------------
  // 每按一個鍵都會重畫：回饋面板只在第一次出現時播淡入動畫，之後不重播（避免輸入時一直閃）
  let lastPanel = null;
  function once(el, key) {
    if (!el) { lastPanel = null; return el; }
    if (key === lastPanel) el.style.animation = 'none';
    lastPanel = key;
    return el;
  }

  function feedbackView(c) {
    return once(feedbackPanel(c), `${run.index}|${ui.phase}|${ui.feedback ? ui.feedback.text : ''}`);
  }

  function feedbackPanel(c) {
    const f = ui.feedback;
    if (ui.phase === 'correct') {
      // 答對時刻：停在慶祝畫面；吉祥物可以點來擊掌（+1 努力點，每題 1 次，不強迫）
      const lv = ui.celebrate || 'normal';
      return h('div', { class: 'mq-correct-moment' },
        h('div', { class: 'mq-feedback mq-feedback--correct', role: 'status', 'data-celebrate': lv },
          h('div', {},
            lv !== 'normal' ? h('p', { class: 'mq-feedback__body' }, lv === 'streak' ? '連續答對！' : '挑戰成功！') : null,
            h('p', { class: 'mq-feedback__title' }, ui.correctPhrase || '答對了！'))),
        highFiveBlock({
          done: !!ui.highFived,
          onClap: () => {
            const r = run.highFive();
            if (!r.ok) return false;
            play('highfive');
            ui.highFived = true;
            return `${pickPhrase('highFive')}${r.dew ? `　+${r.dew} 努力點` : ''}`;
          },
        }));
    }
    if (ui.phase === 'solve') return solveView(c);
    if (!f) return null;
    const offerHelper = f.kind === 'retry' && c.question.helper && c.G === 0 && !(ui.helper && ui.helper.opened);
    return h('div', { class: 'mq-feedback mq-feedback--retry', role: 'status' },
      mascot('cheer', 'is-tilt'),
      h('div', {},
        h('p', { class: 'mq-feedback__title' }, f.phrase || '小提示'),
        h('p', { class: 'mq-feedback__body' }, f.text),
        offerHelper ? btn('要不要用讀題小幫手看看？', () => {
          ui.helper = new ReadingHelper(c.question, 3, { diagnose: true });
          ui.phase = 'helper'; ui.hMsg = null; render();
        }, 'mq-btn mq-btn--secondary mq-btn--small') : null));
  }

  function selfFillPart(c) {
    const parts = c.question.parts;
    return parts.length === 1 && parts[0].kind === 'number' ? parts[0] : null;
  }

  function solveView(c) {
    const steps = c.question.explanation;
    const shown = steps.slice(0, ui.solveShown);
    const allShown = ui.solveShown >= steps.length;
    const sp = selfFillPart(c);
    const lastIsAnswer = sp && steps[steps.length - 1].startsWith('答：');
    const visible = lastIsAnswer && allShown && ui.selfDone == null ? shown.slice(0, -1) : shown;
    return h('div', { class: 'mq-feedback mq-feedback--solve', role: 'status' },
      mascot('cheer'),
      h('div', {},
        h('p', { class: 'mq-feedback__title' }, ui.solvePhrase || '沒關係，我們一起一步一步做。'),
        h('ol', { class: 'mq-steps' }, visible.map((st, i) => h('li', { class: i === visible.length - 1 ? 'is-current' : '' }, st))),
        lastIsAnswer && allShown && ui.selfDone == null
          ? h('div', {}, h('p', { class: 'mq-feedback__body' }, '最後一步換你：答案是多少？'),
            h('div', { class: 'mq-answer is-focus' }, h('span', { class: 'mq-answer__value' }, ui.selfValue), sp.unit ? h('span', { class: 'mq-answer__unit' }, sp.unit) : null))
          : null,
        ui.selfDone === true ? h('p', { class: 'mq-feedback__body' }, '對了！你自己完成最後一步！') : null,
        ui.selfDone === false ? h('p', { class: 'mq-feedback__body' }, `我們一起看答案：${c.question.answerText}`) : null,
        !sp && allShown ? h('p', { class: 'mq-feedback__body' }, `答案：${c.question.answerText}`) : null,
        h('p', { class: 'mq-note' }, MISTAKE_NOTE)));
  }

  function padView(c) {
    const q = c.question;
    const selfFill = ui.phase === 'solve' && selfFillPart(c) && ui.solveShown >= q.explanation.length && ui.selfDone == null;
    const needPad = (ui.phase === 'answer' && q.parts.some((p) => p.kind === 'number')) || selfFill;
    if (!needPad) return null;
    const press = (k) => {
      app.timer?.touch();
      if (selfFill) {
        let v = ui.selfValue;
        if (k === 'back') v = v.slice(0, -1); else if (k === 'clear') v = ''; else if (v.length < 12) v += k;
        ui.selfValue = v;
      } else applyKey(q, ui, k);
      render();
    };
    return h('section', { class: 'mq-stage__pad' }, numpad(press, numpadNeeds(q)));
  }

  function actionsView(c) {
    const q = c.question;
    const bar = (...kids) => h('div', { class: 'mq-stage__actions' }, ...kids);
    if (ui.phase === 'example') return bar(btn('我懂了，換我試試', () => { ui.phase = ui.helper && ui.helper.active ? 'helper' : 'answer'; render(); }, 'mq-btn mq-btn--primary mq-btn--lg'));
    if (ui.phase === 'helper') return bar(btn('確定', () => helperSubmit(), 'mq-btn mq-btn--primary mq-btn--lg'));
    if (ui.phase === 'correct') return bar(btn('下一題', () => completeItem(), 'mq-btn mq-btn--primary mq-btn--lg'));
    if (ui.phase === 'solve') {
      const steps = q.explanation;
      const allShown = ui.solveShown >= steps.length;
      const sp = selfFillPart(c);
      if (!allShown) return bar(btn('下一步', () => { ui.solveShown += 1; render(); }, 'mq-btn mq-btn--primary mq-btn--lg'));
      if (sp && steps[steps.length - 1].startsWith('答：') && ui.selfDone == null) {
        return bar(btn('確定', () => { if (!ui.selfValue) return; ui.selfDone = checkPart(sp, ui.selfValue).correct; render(); }, 'mq-btn mq-btn--primary mq-btn--lg'));
      }
      return bar(btn('下一題', () => completeItem(), 'mq-btn mq-btn--primary mq-btn--lg'));
    }
    const hintsLeft = c.hintsShown < q.hints.length;
    const waiting = Date.now() < confirmUnlockAt;
    const helperBtn = q.helper && ui.helper && !ui.helper.opened
      ? btn('讀題小幫手', () => { ui.helper.open(); ui.phase = ui.helper.active ? 'helper' : 'answer'; render(); }, 'mq-btn mq-btn--secondary') : null;
    return bar(
      btn(c.hintsShown === 0 ? '給我提示' : '再一個提示', () => {
        const t = run.useHint();
        if (t) { ui.feedback = { kind: 'hint', text: t }; ui.mascotExpr = 'think'; }
        render();
      }, 'mq-btn mq-btn--hint', { disabled: !hintsLeft }),
      helperBtn,
      btn('看解法', () => {
        const r = run.showSolution();
        ui.answerSecs = app.timer.peekSecs();
        ui.solvePhrase = r.phrase; ui.phase = 'solve'; ui.solveShown = 1; render();
      }, 'mq-btn mq-btn--ghost'),
      btn('確定', () => submit(), 'mq-btn mq-btn--primary mq-btn--lg', { disabled: waiting, 'aria-disabled': waiting ? 'true' : null }));
  }

  function submit() {
    const secs = app.timer.peekSecs();
    if (ui.firstSecs == null) ui.firstSecs = secs;
    if (ui.helper && ui.helper.opened) run.setHelperResult(ui.helper.result());   // 讓稱讚可以說「你先找出題目要問什麼」
    const res = run.submit(ui.responses, { secs });
    if (res.status === 'incomplete') { toast('還有地方沒有填喔', 'info'); return; }
    if (res.status === 'correct') {
      ui.answerSecs = secs; ui.phase = 'correct'; ui.feedback = null; ui.correctPhrase = res.phrase; ui.mascotExpr = 'happy';
      ui.celebrate = res.celebrate; ui.highFived = false;
      play(res.celebrate === 'normal' ? 'correct' : res.celebrate);
      render();
      // 三種慶祝等級（Pixel 16 節）：一般 → 星星飛到這一題的進度點；連續 3 題 → 徽章；難題一次就對 → 大型慶祝卡
      flyStar(root.querySelector('.mq-question'), root.querySelector('.mq-dot.is-current'));
      celebrateLayer(res.celebrate, res.celebrate === 'streak' ? '連續 3 題！' : res.phrase);
      if (CONFIG.CORRECT_AUTO_ADVANCE_MS != null) {
        autoTimer = setTimeout(() => { if (alive() && run.cur && ui.phase === 'correct' && !run.cur.completed) completeItem(); }, CONFIG.CORRECT_AUTO_ADVANCE_MS);
      }
      return;
    }
    if (res.status === 'retry') {
      ui.feedback = { kind: 'retry', phrase: res.phrase, text: res.hint };
      ui.mascotExpr = 'cheer';
      for (const [pid, id] of Object.entries(res.eliminated)) if (ui.responses[pid] === id) delete ui.responses[pid];
      render();
      return;
    }
    ui.answerSecs = secs;
    ui.solvePhrase = res.phrase;
    ui.phase = 'solve'; ui.solveShown = 1; ui.feedback = null;
    render();
  }

  async function completeItem() {
    clearTimeout(autoTimer);
    if (!alive() || !run.cur || run.cur.completed) return;
    stopSpeaking();
    const secs = ui.answerSecs ?? app.timer.peekSecs();
    app.timer.stop();
    if (ui.helper && ui.helper.opened) run.setHelperResult(ui.helper.result());
    const { messages } = run.complete({ secs, firstSecs: ui.firstSecs ?? secs });
    for (const m of messages) if (m !== MISTAKE_NOTE) toast(m, 'reward');
    await app.save();
    if (alive()) startItem();
  }

  async function leave() {
    clearTimeout(autoTimer);
    stopSpeaking();
    if (run.cur && run.cur.outcome && !run.cur.completed) {
      if (ui.helper && ui.helper.opened) run.setHelperResult(ui.helper.result());
      run.complete({ secs: ui.answerSecs ?? app.timer.peekSecs(), firstSecs: ui.firstSecs });
    }
    if (run.done.length) run.finish();
    app.run = null; app.timer = null;
    await app.save();
    nav('#/');
  }

  startItem();
}
