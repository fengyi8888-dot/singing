// 家長區（Nova 8、ui-spec 5-G）：PIN、本週報告、備份、設定、試玩工具。
import { h, btn, toast } from './dom.js';
import { nav } from './router.js';
import { app } from '../app.js';
import { CONFIG } from '../config.js';
import { UNITS, skillKey } from '../data/units.js';
import { sha256Hex } from '../core/sha256.js';
import { buildReport, daysSinceBackup, ensureWeekSnapshot } from '../engine/report.js';
import { ERROR_TYPE_LABEL } from '../engine/errors.js';
import { startStage } from './screens.js';

let unlockedAt = 0;               // 輸入 PIN 後 10 分鐘內不用再輸入
const UNLOCK_MS = 10 * 60 * 1000;

export function hashPin(pin) { return sha256Hex(`${CONFIG.PIN_SALT}:${pin}`); }

/** PIN 畫面。onOk 在輸入正確後呼叫；設定模式要輸入兩次 */
export function pinPad({ title, note, onDone, verify = null }) {
  let value = '';
  const dots = h('div', { class: 'mq-pin', 'aria-label': '已輸入的位數' });
  const msg = h('p', { class: 'mq-note', 'aria-live': 'polite' });
  const draw = () => dots.replaceChildren(...[0, 1, 2, 3].map((i) => h('span', { class: `mq-pin__dot${i < value.length ? ' is-filled' : ''}` })));
  const press = (k) => {
    if (k === 'back') value = value.slice(0, -1);
    else if (value.length < 4) value += k;
    draw();
    if (value.length === 4) {
      const v = value; value = '';
      setTimeout(() => {
        if (verify && !verify(v)) { dots.classList.add('is-retry'); msg.textContent = '再試一次'; draw(); setTimeout(() => dots.classList.remove('is-retry'), 600); return; }
        onDone(v);
      }, 120);
    }
  };
  draw();
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];
  return h('div', { class: 'mq-card mq-stack' },
    h('h2', { class: 'mq-card__title' }, title),
    dots, msg,
    h('div', { class: 'mq-numpad mq-pin-pad' }, keys.map((k) => (k ? h('button', { type: 'button', class: `mq-key${k === 'back' ? ' mq-key--fn' : ''}`, 'data-key': k, onclick: () => press(k) }, k === 'back' ? '⌫' : k) : h('span', {})))),
    note ? h('p', { class: 'mq-note' }, note) : null);
}

export function parentScreen(root) {
  const st = app.state;
  const s = st.settings;
  const shell = (...kids) => h('div', { class: 'mq-screen mq-parent' },
    h('header', { class: 'mq-topbar mq-noprint' }, btn('回首頁', () => nav('#/'), 'mq-btn mq-btn--ghost mq-btn--small'), h('h1', { class: 'mq-title' }, '家長區')),
    h('main', { class: 'mq-main' }, ...kids));
  if (!s.parentPinHash) {
    let first = null;
    const draw = () => root.replaceChildren(shell(pinPad({
      title: first ? '再輸入一次，確認 PIN' : '第一次進入：請設定 4 位數 PIN',
      note: '這是避免孩子誤入的隔間，不是真正的上鎖。',
      onDone: (v) => {
        if (!first) { first = v; draw(); return; }
        if (v !== first) { first = null; toast('兩次輸入不一樣，請重新設定', 'info'); draw(); return; }
        s.parentPinHash = hashPin(v); unlockedAt = Date.now(); app.save(); draw2();
      },
    })));
    const draw2 = () => { root.replaceChildren(); renderParent(root, shell); };
    draw();
    return;
  }
  if (Date.now() - unlockedAt > UNLOCK_MS) {
    root.append(shell(pinPad({
      title: '請輸入家長 PIN', note: '這是避免孩子誤入的隔間，不是真正的上鎖。',
      verify: (v) => hashPin(v) === s.parentPinHash,
      onDone: () => { unlockedAt = Date.now(); root.replaceChildren(); renderParent(root, shell); },
    })));
    return;
  }
  renderParent(root, shell);
}

/** 測試用：讓 e2e 測試直接進入（模擬已輸入 PIN） */
export function _unlockParentForTest() { unlockedAt = Date.now(); }

function renderParent(root, shell) {
  const st = app.state;
  const s = st.settings;
  const day = app.today();
  ensureWeekSnapshot(st, day);
  let range = 'this';
  const reportBox = h('div', { class: 'mq-stack' });
  const status = h('p', { class: 'mq-note', 'aria-live': 'polite' });
  const backupDays = daysSinceBackup(st, day);

  function drawReport() {
    const r = buildReport(st, day, range);
    const maxSecs = Math.max(60, ...r.daily.map((d) => d.secs));
    const bars = h('div', { class: 'mq-bars', 'aria-label': '每天的練習時間' }, r.daily.map((d) => { const b = h('span', { title: `${d.day} ${Math.round(d.secs / 60)} 分鐘` }); b.style.setProperty('--v', String(d.secs / maxSecs)); return b; }));
    const errTotal = Object.values(r.errorTypes).reduce((a, b) => a + b, 0);
    reportBox.replaceChildren(
      h('section', { class: 'mq-card mq-report-section' },
        h('h2', { class: 'mq-card__title' }, `① ${range === 'this' ? '本週' : range === 'last' ? '上週' : '全部'}一覽`),
        h('div', { class: 'mq-kpis' },
          kpi(`${r.practiceDays}/${r.totalDays}`, '練習天數'), kpi(`${r.activeMinutes}`, '主動作答分鐘'),
          kpi(`${r.dailyCompleted}`, '完成每日任務天數'), kpi(`${r.answered}`, '作答題數')),
        range !== 'all' ? bars : null,
        range !== 'all' ? h('div', { class: 'mq-bars__labels' }, r.daily.map((d) => h('span', {}, ['一', '二', '三', '四', '五', '六', '日'][r.daily.indexOf(d)]))) : null),
      h('section', { class: 'mq-card mq-report-section' },
        h('h2', { class: 'mq-card__title' }, '② 亮點'),
        h('ul', {},
          r.mistakes.overcomeInRange ? h('li', {}, `修好了 ${r.mistakes.overcomeInRange} 張錯題卡`) : null,
          r.badgesInRange.length ? h('li', {}, `拿到 ${r.badgesInRange.length} 個新徽章`) : null,
          h('li', {}, `圓圓和方方：第 ${r.mascotStage} 階`),
          r.patientCount ? h('li', {}, `有 ${r.patientCount} 題想了很久最後答對，這份耐心很值得稱讚！`) : null)),
      h('section', { class: 'mq-card mq-report-section' },
        h('h2', { class: 'mq-card__title' }, '③ 單元熟練度'),
        h('table', { class: 'mq-table' },
          h('thead', {}, h('tr', {}, ['單元', '狀態', '熟練度', '本週變化', '目前難度', '思考秒數（中位數）'].map((x) => h('th', {}, x)))),
          h('tbody', {}, r.units.map((u) => h('tr', {},
            h('td', {}, u.title), h('td', {}, { new: '未開始', learning: '學習中', familiar: '熟悉', mastered: '精熟' }[u.status]),
            h('td', {}, String(u.score)),
            // theme.css 的 .mq-delta--up 自己會加 ▲；沒練習過的單元，分數變化來自診斷設定的起始難度，不算進步
            h('td', {}, u.touched && u.delta > 0 ? h('span', { class: 'mq-delta--up' }, `+${u.delta}`) : u.touched ? h('span', { class: 'mq-delta--flat' }, '持平') : '—'),
            h('td', {}, u.levelRange), h('td', {}, u.medianSecs != null ? `${Math.round(u.medianSecs)} 秒` : '—'))))),
        h('p', { class: 'mq-note' }, '首次答對率 65%–85% 代表難度剛剛好。分數只看孩子自己的進步，不和別人比較。')),
      h('section', { class: 'mq-card mq-report-section' },
        h('h2', { class: 'mq-card__title' }, '④ 作答時間與錯誤類型'),
        h('p', {}, r.avgFirstSecs != null ? `每題平均思考 ${r.avgFirstSecs} 秒（中位數 ${Math.round(r.medianFirstSecs)} 秒）。孩子的畫面上不顯示秒數。` : '還沒有作答紀錄。'),
        h('p', {}, errTotal ? Object.entries(r.errorTypes).filter(([, n]) => n).map(([k, n]) => `${ERROR_TYPE_LABEL[k]} ${n} 次`).join('、') : '這段期間沒有記錄到錯誤。'),
        r.rushed.length ? h('p', {}, `可能有點急的題目：${r.rushed.map((x) => `${x.desc}（${x.n} 次）`).join('、')}。可以提醒她「先圈重點、再作答」。`) : null,
        r.guidance.length ? h('p', { class: 'mq-note' }, `讀題引導等級：${r.guidance.map((g) => `${g.desc} G${g.G}`).join('、')}（G3 全引導 → G0 自己來）`) : null),
      h('section', { class: 'mq-card mq-report-section' },
        h('h2', { class: 'mq-card__title' }, '⑤ 錯題本'),
        h('p', {}, `修補中 ${r.mistakes.active} 張；這段期間新增 ${r.mistakes.newInRange} 張、修好 ${r.mistakes.overcomeInRange} 張。`),
        r.mistakes.list.length ? h('ul', {}, r.mistakes.list.map((m) => h('li', {}, `${m.desc}（${ERROR_TYPE_LABEL[m.errorType] || '其他'}）`))) : null,
        r.mistakes.needsHelp.length ? h('p', { class: 'mq-callout' }, `需要大人陪伴：${r.mistakes.needsHelp.map((m) => m.desc).join('、')} 已經試了 3 次還卡住，建議陪她看一次解說。`) : null),
      st.diagnostic.summary?.length ? h('section', { class: 'mq-card mq-card--peach mq-report-section' }, h('h2', { class: 'mq-card__title' }, '診斷摘要'), st.diagnostic.summary.map((x) => h('p', {}, x))) : null,
      h('section', { class: 'mq-card mq-card--peach mq-report-section' }, h('p', {}, '請稱讚她的努力與堅持，而不是答對幾題。')));
  }

  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'mq-visually-hidden', id: 'import-file' });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    const text = await f.text();
    const res = app.store.parseBackup(text);
    fileInput.value = '';
    if (!res.ok) { status.textContent = `這個檔案不能匯入：${res.errors.join('；')}`; return; }
    const when = res.info.backupDate ? new Date(res.info.backupDate).toLocaleString('zh-TW') : '不明';
    if (!confirm(`將覆蓋目前進度（備份日期：${when}，星星 ${res.info.stars} 顆）。確定要匯入嗎？`)) return;
    app.state = await app.store.applyImport(app.state, res.data);
    status.textContent = '匯入完成。原本的進度已另外保存一份。';
  });

  const toggle = (label, options, current, onChange) => {
    const group = h('div', { class: 'mq-seg-toggle', role: 'group', 'aria-label': label });
    for (const [v, text] of options) {
      group.append(h('button', { type: 'button', 'aria-pressed': v === current ? 'true' : 'false', onclick: (e) => { onChange(v); group.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false')); e.currentTarget.setAttribute('aria-pressed', 'true'); } }, text));
    }
    return h('div', { class: 'mq-row mq-wrap' }, h('span', {}, `${label}：`), group);
  };

  const rangeToggle = toggle('報告範圍', [['this', '本週'], ['last', '上週'], ['all', '全部']], range, (v) => { range = v; drawReport(); });
  drawReport();
  root.append(shell(
    backupDays == null || backupDays >= CONFIG.BACKUP_CARD_DAYS
      ? h('div', { class: 'mq-card mq-callout' }, h('p', {}, backupDays == null ? '該備份囉！還沒有備份過。' : `該備份囉！上次備份是 ${backupDays} 天前。`), btn('現在備份', () => exportBackup(status), 'mq-btn mq-btn--primary'))
      : null,
    h('div', { class: 'mq-noprint' }, rangeToggle),
    reportBox,
    btn('列印／存成 PDF', () => window.print(), 'mq-btn mq-btn--secondary mq-noprint'),
    h('section', { class: 'mq-card mq-noprint' },
      h('h2', { class: 'mq-card__title' }, '備份進度'),
      h('p', { class: 'mq-callout' }, '備份檔裡有孩子的暱稱與練習紀錄，請存在家裡的裝置，不要上傳到公開的地方。'),
      h('p', {}, backupDays == null ? '還沒有備份過。' : `上次備份：${backupDays} 天前`),
      btn('匯出備份（存到「檔案」）', () => exportBackup(status), 'mq-btn mq-btn--secondary mq-btn--block'),
      h('label', { class: 'mq-btn mq-btn--secondary mq-btn--block', for: 'import-file' }, '匯入備份'),
      fileInput, status,
      h('p', { class: 'mq-note' }, `資料保護：${s.storagePersisted === true ? '已開啟' : '未開啟（請把網站加入主畫面）'}；從主畫面開啟：${s.launch.standalone ? '是' : '否'}；本機儲存：${app.store.local ? '可用' : '不可用'}；IndexedDB 鏡像：${app.store.idb ? '可用' : '不可用'}`)),
    h('section', { class: 'mq-card mq-noprint' },
      h('h2', { class: 'mq-card__title' }, '設定'),
      toggle('每天練習', [[10, '10 分鐘'], [15, '15 分鐘']], s.dailyMinutes, (v) => { s.dailyMinutes = v; const d = st.daily[day]; if (d && !d.plan.some((p) => p.done)) d.plan = []; app.save(); }),
      toggle('作答方式', [['input', '數字鍵盤'], ['choice', '4 選 1（競試格式）']], s.answerMode, (v) => { s.answerMode = v; app.save(); }),
      toggle('朗讀按鈕', [[true, '開'], [false, '關']], s.ttsEnabled, (v) => { s.ttsEnabled = v; app.save(); }),
      toggle('音效', [[true, '開'], [false, '關']], s.soundEnabled !== false, (v) => { s.soundEnabled = v; app.save(); }),
      toggle('解鎖全部單元（試玩用）', [[false, '關（照排程）'], [true, '開']], !!s.unlockAll, (v) => { s.unlockAll = v; app.save(); }),
      btn('重新設定 PIN', () => { s.parentPinHash = null; app.save(); nav('#/'); }, 'mq-btn mq-btn--ghost')),
    h('section', { class: 'mq-card mq-noprint' },
      h('h2', { class: 'mq-card__title' }, '試玩與檢查（給大人）'),
      btn('題目預覽：每個題型的題目、答案與迷思', () => nav('#/preview'), 'mq-btn mq-btn--secondary mq-btn--block'),
      h('p', { class: 'mq-note' }, '直接玩指定題型（會記錄進度）：'),
      UNITS.map((u) => h('div', { class: 'mq-row mq-wrap' }, h('strong', {}, u.title), u.questionTypes.map((t) => btn(t.desc, () => startStage({ unitId: u.id, focusKey: skillKey(u.id, t.id) }), 'mq-btn mq-btn--small')))))));
}

function kpi(value, label) { return h('div', { class: 'mq-kpi' }, h('span', { class: 'mq-kpi__value' }, value), h('span', { class: 'mq-kpi__label' }, label)); }

/** iPad：優先用「分享」選單（可選「儲存到檔案」）；不支援時改用下載 */
export function exportBackup(status) {
  const { filename, json } = app.store.buildBackup(app.state);
  const blob = new Blob([json], { type: 'application/json' });
  let shared = false;
  try {
    const file = new File([blob], filename, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      shared = true;
      navigator.share({ files: [file], title: filename }).then(
        () => { status.textContent = `已分享備份檔 ${filename}。`; },
        (e) => { if (e && e.name !== 'AbortError') downloadBlob(blob, filename, status); },
      );
    }
  } catch { shared = false; }
  if (!shared) downloadBlob(blob, filename, status);
  app.save();
}

function downloadBlob(blob, filename, status) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  status.textContent = `已下載 ${filename}（iPad 會存到「檔案」App 的「下載項目」）。`;
}
