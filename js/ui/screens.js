// 孩子看的畫面：首頁、群島地圖（ui-spec 5-B）、單元、結算、修補工坊、收藏；以及給大人的題目預覽。
import { h, s, btn, toast } from './dom.js';
import { nav } from './router.js';
import { app } from '../app.js';
import { CONFIG } from '../config.js';
import { UNITS, getUnit, skillKey } from '../data/units.js';
import { BADGES } from '../data/badges.js';
import { StageRun } from '../engine/stage.js';
import { statusOf, unitStatus, refreshUnlocks, ensureSkill } from '../engine/skills.js';
import { dueMistakes } from '../engine/mistakes.js';
import { ERROR_TYPE_LABEL } from '../engine/errors.js';
import { generateQuestion, answerString } from '../engine/question.js';
import { isUnitOpen, unlockDateOf, ensureDailyPlan, nextPlanItem, openRouteNodes, isTypeAllowed, checkDailyComplete } from '../engine/plan.js';
import { daysSinceBackup } from '../engine/report.js';
import { renderFigure } from './figures.js';
import { mascot } from './parts.js';
import { pickPhrase } from '../data/phrases.js';
import { play } from './sound.js';

const ISLAND_STATE = { new: ['is-open', 'dim', '燈還沒亮'], learning: ['is-open', 'dim', '燈還沒亮'], familiar: ['is-familiar', 'half', '熟悉'], mastered: ['is-mastered', 'full', '精熟'] };
const STATUS_LABEL = { new: '還沒開始', learning: '學習中', familiar: '熟悉', mastered: '精熟' };

function topbar(title, { back = true } = {}) {
  const st = app.state;
  return h('header', { class: 'mq-topbar' },
    back ? btn('首頁', () => nav('#/'), 'mq-btn mq-btn--ghost mq-btn--small') : null,
    title ? h('h1', { class: 'mq-title' }, title) : null,
    h('span', { class: 'mq-spacer' }),
    h('span', { class: 'mq-stat', 'aria-label': `累計星星 ${st.rewards.stars} 顆` }, `★ ${st.rewards.stars}`),
    h('span', { class: 'mq-stat', 'aria-label': `連續練習 ${st.streak.current} 天` }, `火苗 ${st.streak.current}`));
}

function screen(title, opts, ...body) {
  return h('div', { class: 'mq-screen' }, topbar(title, opts), h('main', { class: 'mq-main' }, ...body));
}

/** 開始一關；空的修補關直接提示 */
export function startStage(opts) {
  app.run = new StageRun(app.state, { today: app.today, ...opts });
  if (app.run.isEmpty) {
    app.run = null;
    if (opts.planIdx != null) {   // 每日任務的錯題小站剛好沒有到期的卡：這一關算完成
      const d = app.state.daily[app.today()];
      const p = d?.plan?.find((x) => x.idx === opts.planIdx);
      if (p) p.done = true;
      checkDailyComplete(app.state, app.today());
      app.save();
      return startToday();
    }
    toast('今天沒有要修補的卡片，去群島練習吧！', 'info');
    return null;
  }
  nav('#/stage');
  return app.run;
}

export function startToday() {
  const day = app.today();
  const item = nextPlanItem(app.state, day);
  if (!item) { toast('今日航程完成了！想多練可以去群島地圖。', 'reward'); return null; }
  if (item.kind === 'review') return startStage({ mode: 'review', planIdx: item.idx });
  if (!item.unitId) { toast('目前沒有開放的島嶼。', 'info'); return null; }
  return startStage({ unitId: item.unitId, planIdx: item.idx });
}

// ---------------------------------------------------------------------------
export function homeScreen(root) {
  const st = app.state;
  if (!st.settings.setupDone) { nav('#/setup'); return; }
  const day = app.today();
  const plan = ensureDailyPlan(st, day);
  const doneCount = plan.filter((p) => p.done).length;
  const completed = !!st.daily[day]?.completed;
  const due = dueMistakes(st, day, null).length;
  const info = app.loadInfo;
  const backupDays = daysSinceBackup(st, day);
  const hold = h('button', { type: 'button', class: 'mq-btn mq-btn--icon mq-hold', 'aria-label': '家長區（按住 2 秒）' }, '家長');
  holdToOpen(hold, () => nav('#/parent'));
  const ring = h('span', { class: `mq-ring${completed ? ' is-complete' : ''}` }, h('span', {}, `${doneCount}/${plan.length}`));
  ring.style.setProperty('--mq-ring', String(plan.length ? doneCount / plan.length : 0));
  const stage = st.rewards.mascotStage;
  app.save();
  root.append(h('div', { class: 'mq-screen' },
    topbar(null, { back: false }),
    h('main', { class: 'mq-main mq-home' },
      warnings(info),
      h('div', { class: 'mq-home__pal' },
        mascot('happy', `mq-mascot--lg ${stage === 1 ? 'is-wobble' : 'is-idle'}`),
        h('p', { class: 'mq-bubble mq-bubble--cheer' }, `${greeting()}${st.profile.nickname ? `，${st.profile.nickname}` : ''}！${pickPhrase('greet')}`)),
      h('button', { type: 'button', class: 'mq-btn mq-btn--hero mq-btn--sun mq-today', onclick: () => startToday(), 'data-test': 'today' },
        ring, h('span', {}, completed ? '今日航程完成了！再一關？' : '今日航程')),
      h('div', { class: 'mq-home__cards' },
        h('button', { type: 'button', class: 'mq-card mq-card--tap', onclick: () => nav('#/map') }, '群島地圖'),
        h('button', { type: 'button', class: 'mq-card mq-card--tap', onclick: () => nav('#/mistakes') }, due ? `修補工坊（今天可以修 ${due} 張）` : '修補工坊'),
        h('button', { type: 'button', class: 'mq-card mq-card--tap', onclick: () => nav('#/collection') }, '我的收藏')),
      h('div', { class: 'mq-corner' },
        backupDays == null || backupDays >= CONFIG.BACKUP_CHILD_ICON_DAYS
          ? btn('存檔小提醒', () => toast('記得請爸爸媽媽到家長區存檔喔', 'info'), 'mq-btn mq-btn--ghost mq-btn--small') : null,
        hold))));
}

function warnings(info) {
  const st = app.state;
  const out = [];
  if (!app.store.local) out.push(h('p', { class: 'mq-callout' }, '目前的瀏覽模式無法存檔，請關閉無痕瀏覽。'));
  if (info && info.restored === 'local-from-idb') out.push(h('p', { class: 'mq-callout' }, '我們從備份的地方找回了你的進度。'));
  if (st.settings.launch.everStandalone && st.settings.launch.standalone === false) {
    out.push(h('p', { class: 'mq-callout' }, '（給家長）你現在是從 Safari 開啟，進度存在主畫面的版本，請改從主畫面圖示開啟。'));
  }
  return out;
}

function greeting() {
  const hr = new Date().getHours();
  return hr < 11 ? '早安' : hr < 18 ? '午安' : '晚上好';
}

export function holdToOpen(el, onDone) {
  let t0 = 0, raf = 0;
  const tick = () => {
    const p = Math.min(1, (Date.now() - t0) / 2000);
    el.style.setProperty('--mq-hold-progress', String(p));
    if (p >= 1) { cancel(); onDone(); return; }
    raf = requestAnimationFrame(tick);
  };
  const cancel = () => { cancelAnimationFrame(raf); t0 = 0; el.style.setProperty('--mq-hold-progress', '0'); };
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); t0 = Date.now(); raf = requestAnimationFrame(tick); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, cancel);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ---------------------------------------------------------------------------
// 群島地圖（ui-spec 5-B）：島嶼絕對定位，座標用 %／px；S 形航線
// ---------------------------------------------------------------------------
export function mapScreen(root, tab = 'route') {
  const st = app.state;
  const day = app.today();
  const open = openRouteNodes(st, day);
  const order = st.route.nodes.length ? st.route.nodes.map((n) => n.unitId) : UNITS.map((u) => u.id);
  const ids = order.filter((id) => getUnit(id) && (tab === 'route' || String(getUnit(id).grade) === tab));
  const STEP = 150, TOP = 90;
  const height = Math.max(420, TOP + STEP * ids.length);
  const map = h('div', { class: 'mq-map', 'data-test': 'map' });
  map.style.minHeight = `${height}px`;
  const pts = ids.map((id, i) => ({ id, x: i % 2 === 0 ? 27 : 73, y: TOP + i * STEP }));
  const routes = s('svg', { class: 'mq-map__routes', viewBox: `0 0 100 ${height}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  if (pts.length > 1) routes.append(s('path', { class: 'mq-map__route', d: pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' '), 'vector-effect': 'non-scaling-stroke' }));
  map.append(routes);
  pts.forEach((p, i) => {
    const u = getUnit(p.id);
    const unlocked = isUnitOpen(st, u.id, day);
    if (unlocked) refreshUnlocks(st, u.id, { allowed: (t) => isTypeAllowed(st, u.id, t, day) });
    const status = unitStatus(st, u.id);
    const [cls, art, stateText] = ISLAND_STATE[status];
    const isNext = unlocked && (open.number === u.id || open.geometry === u.id);
    const island = h('button', {
      type: 'button', class: `mq-island ${unlocked ? cls : 'is-locked'}${isNext ? ' is-next' : ''}`, 'data-unit': u.id,
      onclick: () => openSheet(u, unlocked, status),
    },
    h('img', { class: 'mq-island__art', src: `assets/islands/island-${'abc'[i % 3]}-${unlocked ? art : 'dim'}.svg`, alt: '' }),
    h('span', { class: 'mq-island__name' }, u.shortTitle || u.title),
    h('span', { class: 'mq-island__state' }, unlocked ? stateText : '霧中'));
    island.style.left = `${p.x}%`;
    island.style.top = `${p.y}px`;
    map.append(island);
  });
  const tabs = h('div', { class: 'mq-tabs', role: 'tablist' }, [['route', '我的航線'], ['5', '五年級'], ['6', '六年級']].map(([k, label]) => h('button', {
    type: 'button', role: 'tab', class: 'mq-tab', 'aria-selected': k === tab ? 'true' : 'false', onclick: () => nav(k === 'route' ? '#/map' : `#/map/${k}`),
  }, label)));
  root.append(screen('數字群島', {}, tabs, map, h('p', { class: 'mq-note' }, '其他島嶼正在建造中。')));
  app.save();

  function openSheet(u, unlocked, status) {
    document.querySelectorAll('.mq-sheet').forEach((x) => x.remove());
    const art = ISLAND_STATE[status][1];
    const sheet = h('div', { class: 'mq-sheet', role: 'dialog', 'aria-label': u.title },
      h('div', { class: 'mq-sheet__body' },
        h('img', { src: `assets/islands/lighthouse-${unlocked ? art : 'dim'}.svg`, alt: '' }),
        h('div', {},
          h('h2', { class: 'mq-card__title' }, u.title),
          h('p', { class: 'mq-subtitle' }, `${u.hanlinOrder}：${u.sections.slice(0, 3).join('、')}`),
          h('p', {}, unlocked ? `燈塔：${STATUS_LABEL[status]}` : `${unlockDateOf(st, u.id) ? `${unlockDateOf(st, u.id).slice(5).replace('-', '/')} 開放。` : ''}先點亮前面的島就能來玩喔`))),
      h('div', { class: 'mq-sheet__actions' },
        btn('關閉', () => sheet.remove(), 'mq-btn mq-btn--ghost'),
        unlocked ? btn('看看題型', () => { sheet.remove(); nav(`#/unit/${u.id}`); }, 'mq-btn mq-btn--secondary') : null,
        unlocked ? btn('出發！', () => { sheet.remove(); startStage({ unitId: u.id }); }, 'mq-btn mq-btn--primary mq-btn--lg', { 'data-test': 'go' }) : null));
    document.body.append(sheet);
  }
}

export function unitScreen(root, unitId) {
  const st = app.state;
  const u = getUnit(unitId);
  const day = app.today();
  if (!u) { nav('#/map'); return; }
  const allowed = (t) => isTypeAllowed(st, unitId, t, day);
  refreshUnlocks(st, unitId, { allowed });
  root.append(screen(u.title, {},
    h('p', { class: 'mq-subtitle' }, `${u.hanlinOrder}：${u.sections.join('、')}`),
    isUnitOpen(st, unitId, day) ? btn('出發！（一關 6 題）', () => startStage({ unitId }), 'mq-btn mq-btn--primary mq-btn--hero') : h('p', { class: 'mq-callout' }, '這座島還在霧中。'),
    h('div', { class: 'mq-stack' }, u.questionTypes.map((t) => {
      const key = skillKey(unitId, t.id);
      const sk = ensureSkill(st, key);
      const ok = allowed(t.id);
      return h('div', { class: `mq-card mq-card--flat${sk.unlocked && ok ? '' : ' is-locked'}` },
        h('p', { class: 'mq-card__title' }, t.desc),
        h('p', { class: 'mq-card__meta' }, !ok ? '1/11 之後開放（競試延伸）' : sk.unlocked ? STATUS_LABEL[statusOf(st, key)] : '前一個題型熟悉之後會開放'));
    })),
    btn('回地圖', () => nav('#/map'), 'mq-btn mq-btn--ghost')));
}

// ---------------------------------------------------------------------------
// 結算（ui-spec 5-D）
// ---------------------------------------------------------------------------
const STAR_SVG = () => s('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, s('path', { d: 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z', fill: 'currentColor' }));

export function resultScreen(root) {
  const r = app.lastResult;
  if (!r) { nav('#/'); return; }
  const stars = Math.max(1, r.stars);
  // 星星依序亮起（每顆有音效），最後吉祥物說一句總結；離開畫面就停止
  const starEls = [0, 1, 2].map(() => h('span', { class: 'mq-star' }, STAR_SVG()));
  const summary = h('p', { class: 'mq-bubble mq-bubble--cheer mq-result__summary', 'data-test': 'summary', hidden: true }, r.summary || '辛苦了！');
  const step = CONFIG.STAR_INTERVAL_MS;
  for (let i = 0; i < stars; i++) {
    setTimeout(() => { if (location.hash !== '#/result') return; starEls[i].classList.add('is-on'); play('star'); }, step * (i + 1));
  }
  setTimeout(() => { if (location.hash !== '#/result') return; summary.hidden = false; play('result'); }, step * (stars + 1) + 200);
  const cards = [];
  if (r.mascotTo > r.mascotFrom) {
    cards.push(h('div', { class: 'mq-card mq-stack' }, mascot('happy', 'mq-result__mascot is-dance', r.mascotTo), h('p', { class: 'mq-result__title' }, '圓圓和方方長大了！')));
  }
  for (const id of r.newBadges || []) {
    const b = BADGES.find((x) => x.id === id);
    if (b) cards.push(h('div', { class: 'mq-badge is-new' }, h('img', { class: 'mq-badge__art', src: `assets/badges/${b.file}`, alt: '' }), h('span', { class: 'mq-badge__name' }, `新徽章：${b.name}`)));
  }
  root.append(h('div', { class: 'mq-screen mq-screen--night' },
    h('main', { class: 'mq-main' },
      h('div', { class: 'mq-result' },
        h('p', { class: 'mq-result__title' }, '過關了！'),
        h('div', { class: 'mq-stars', 'aria-label': `${stars} 顆星` }, starEls),
        mascot('happy', 'mq-result__mascot is-hop'),
        summary,
        h('p', {}, `努力點 +${r.dew}`),
        (r.highlights || []).map((t) => h('p', { class: 'mq-highlight-line' }, t)),
        cards,
        r.firstVoyage ? btn('回首頁', () => nav('#/'), 'mq-btn mq-btn--sun mq-btn--lg') : null,
        !r.firstVoyage && r.mode !== 'review' && r.unitId ? btn('再一關', () => startStage({ unitId: r.unitId }), 'mq-btn mq-btn--sun mq-btn--lg') : null,
        !r.firstVoyage ? btn('回首頁', () => nav('#/'), 'mq-btn mq-btn--ghost') : null,
        !r.firstVoyage ? btn('回地圖', () => nav('#/map'), 'mq-btn mq-btn--ghost') : null,
        r.dueAfter ? btn('去修補工坊', () => nav('#/mistakes'), 'mq-btn mq-btn--ghost') : null))));
}

// ---------------------------------------------------------------------------
export function mistakesScreen(root) {
  const st = app.state;
  const day = app.today();
  const due = dueMistakes(st, day, null);
  const dueIds = new Set(due.map((m) => m.id));
  const cards = Object.values(st.mistakes).filter((m) => m.status === 'active');
  const fixed = Object.values(st.mistakes).filter((m) => m.status === 'overcome' || m.status === 'archived');
  const typeName = (key) => {
    const i = key.indexOf(':');
    const t = getUnit(key.slice(0, i))?.questionTypes.find((x) => x.id === key.slice(i + 1));
    return t ? t.desc : key;
  };
  const card = (m) => h('div', { class: `mq-card mq-mistake${dueIds.has(m.id) ? ' is-due' : ''}` },
    h('p', { class: 'mq-card__title' }, typeName(m.key)),
    h('span', { class: `mq-chip mq-chip--${m.errorType}` }, ERROR_TYPE_LABEL[m.errorType] || '其他'),
    h('p', { class: 'mq-card__meta' }, '這個概念我們正在修補中'),
    h('div', { class: 'mq-repair', 'aria-label': `修補進度 ${m.step}/4` }, [0, 1, 2, 3].map((i) => h('i', { class: i < m.step ? 'is-on' : '' }))));
  root.append(screen('修補工坊', {},
    h('div', { class: 'mq-row' }, mascot('cheer', 'mq-mascot--sm'), h('p', { class: 'mq-bubble' }, '我們把卡住的地方一個一個修好！')),
    h('h2', { class: 'mq-subtitle' }, '今天可以修的'),
    due.length ? h('div', { class: 'mq-grid' }, due.filter((m) => m.status === 'active').map(card)) : h('p', { class: 'mq-callout' }, '今天沒有要修補的卡片。'),
    due.length ? btn(`開始修補（${Math.min(due.length, CONFIG.REVIEW_STAGE_MAX)} 張）`, () => startStage({ mode: 'review' }), 'mq-btn mq-btn--primary mq-btn--hero') : null,
    h('h2', { class: 'mq-subtitle' }, '正在修補中'),
    h('div', { class: 'mq-grid' }, cards.filter((m) => !dueIds.has(m.id)).map(card)),
    fixed.length ? h('p', { class: 'mq-subtitle' }, `已經修好的寶物：${fixed.length} 個`) : null));
}

export function collectionScreen(root) {
  const st = app.state;
  const fixed = Object.values(st.mistakes).filter((m) => m.status === 'overcome' || m.status === 'archived').length;
  root.append(screen('我的收藏', {},
    h('section', { class: 'mq-house mq-card' },
      mascot('happy', 'mq-mascot--lg is-idle'),
      h('p', {}, `圓圓和方方：第 ${st.rewards.mascotStage} 階　努力點 ${st.rewards.dew}`),
      h('div', { class: 'mq-shelf', 'aria-label': `修好的寶物 ${fixed} 個` }, Array.from({ length: Math.min(fixed, 30) }, () => h('span', { class: 'mq-chip' }, '寶物')))),
    h('h2', { class: 'mq-subtitle' }, '徽章'),
    h('div', { class: 'mq-grid' }, BADGES.map((b) => {
      const got = st.rewards.badges[b.id];
      return h('div', { class: `mq-badge${got ? '' : ' is-locked'}` },
        h('img', { class: 'mq-badge__art', src: `assets/badges/${b.file}`, alt: '' }),
        h('span', { class: 'mq-badge__name' }, b.name),
        h('span', { class: 'mq-badge__how' }, got ? `${got} 拿到` : b.how));
    }))));
}

// ---------------------------------------------------------------------------
// 題目預覽（給 Iris、Euclid 檢查；不寫入進度）
// ---------------------------------------------------------------------------
export function previewScreen(root) {
  const sel = { unitId: UNITS[0].id, typeId: UNITS[0].questionTypes[0].id, level: UNITS[0].questionTypes[0].levels[0], seed: '', mode: 'input' };
  const out = h('div', { class: 'mq-stack' });
  const controls = h('div', { class: 'mq-card mq-stack' });
  const typeDef = () => getUnit(sel.unitId).questionTypes.find((t) => t.id === sel.typeId);
  const select = (label, options, value, onChange) => {
    const el = h('select', { 'aria-label': label, class: 'mq-btn mq-btn--small' }, options.map(([v, t]) => h('option', { value: String(v), selected: String(v) === String(value) }, t)));
    el.addEventListener('change', () => onChange(el.value));
    return h('label', { class: 'mq-row' }, `${label} `, el);
  };
  function drawControls() {
    const u = getUnit(sel.unitId);
    const seedInput = h('input', { type: 'text', value: sel.seed, placeholder: '種子（空白 = 隨機）', class: 'mq-btn mq-btn--small', 'aria-label': '種子' });
    seedInput.addEventListener('change', () => { sel.seed = seedInput.value.trim(); });
    controls.replaceChildren(
      select('單元', UNITS.map((x) => [x.id, x.title]), sel.unitId, (v) => { sel.unitId = v; sel.typeId = getUnit(v).questionTypes[0].id; sel.level = typeDef().levels[0]; drawControls(); }),
      select('題型', u.questionTypes.map((t) => [t.id, `${t.id}（${t.desc}）`]), sel.typeId, (v) => { sel.typeId = v; sel.level = typeDef().levels[0]; drawControls(); }),
      select('難度', typeDef().levels.map((l) => [l, `Level ${l}`]), sel.level, (v) => { sel.level = Number(v); }),
      select('作答方式', [['input', '數字鍵盤'], ['choice', '4 選 1']], sel.mode, (v) => { sel.mode = v; }),
      seedInput,
      btn('產生 5 題', () => draw(5), 'mq-btn mq-btn--primary'));
  }
  function draw(n) {
    out.replaceChildren();
    for (let i = 0; i < n; i++) {
      const seed = sel.seed ? (n === 1 ? sel.seed : `${sel.seed}-${i}`) : undefined;
      let q;
      try { q = generateQuestion({ unitId: sel.unitId, typeId: sel.typeId, level: sel.level, seed, mode: sel.mode }); }
      catch (e) { out.append(h('p', { class: 'mq-callout' }, `產生失敗：${e.message}`)); continue; }
      const hp = q.helper;
      out.append(h('article', { class: 'mq-card mq-stack' },
        h('p', { class: 'mq-note' }, `種子：${q.seed}｜style：${q.style}`),
        h('p', { class: 'mq-question__text' }, q.prompt),
        q.figure ? h('div', { class: 'mq-question__figure' }, renderFigure(q.figure)) : null,
        q.table ? h('pre', {}, q.table.rows.map((r, ri) => `${q.table.headers[ri]}：${r.map((c) => c.v ?? c.blank).join('｜')}`).join('\n')) : null,
        q.tables ? h('pre', {}, q.tables.map((t) => `${t.name}表 ${t.rows[1].map((c) => c.v).join('、')}`).join('\n')) : null,
        q.parts.map((p) => h('div', {},
          h('p', {}, `[${p.id}] ${p.label || ''}（${p.kind}）正解：${p.kind === 'choice' ? (p.options.find((o) => o.id === p.answer) || {}).label : answerString(p)}`),
          p.kind === 'choice' ? h('p', { class: 'mq-note' }, `選項：${p.options.map((o) => o.label).join('／')}`) : null,
          h('p', { class: 'mq-note' }, `迷思：${p.misconceptions.map((m) => `${p.kind === 'choice' ? (p.options.find((o) => o.id === m.value) || {}).label || m.value : String(m.value)} → ${m.code}`).join('；') || '（無）'}`))),
        hp ? h('p', { class: 'mq-note' }, `讀題小幫手：${hp.goal ? `① ${hp.goal.options.find((o) => o.id === hp.goal.answer).label}｜` : ''}② 圈 ${hp.known.join('、')}${hp.base ? `，基準量「${hp.base}」` : ''}｜③ ${hp.ops.options.find((o) => o.id === hp.ops.answer).label}`) : null,
        q.noHelperReason ? h('p', { class: 'mq-note' }, `不開讀題小幫手：${q.noHelperReason}`) : null,
        h('p', {}, `提示 1：${q.hints[0]}`),
        h('p', {}, `提示 2：${q.hints[1]}`),
        h('ol', { class: 'mq-steps' }, q.explanation.map((x) => h('li', {}, x)))));
    }
  }
  drawControls();
  root.append(screen('題目預覽', {}, h('p', { class: 'mq-note' }, '這裡出的題目不會寫入進度。'), controls, out));
}
