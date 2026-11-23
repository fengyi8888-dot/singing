// 圓圓 & 方方 換裝的參考渲染器（v1，Pixel）。Forge 可以直接 import，或照抄到 site/js/ui/。
// 原理：一個 <svg viewBox="0 -24 340 270">，依 8 個圖層順序用 <use> 疊加
//   夥伴圖層：assets/mascots/layers/duo-s{stage}-{pose}.svg#{pal}-{layer}
//   商品：    assets/items/{id}.svg#{pal}，外面包一層 <g transform="matrix(...)">（矩陣來自 anchors.json）
// 只用 DOM API 與 setAttribute，不用 inline style，符合 CSP。
// 家具、壁紙、地板（items.json 裡沒有 parts、只有 href 的）不是穿在身上的，這裡會略過，請用小屋（hut.json）的位置放。
const NS = 'http://www.w3.org/2000/svg';

/**
 * @param {object} o
 * @param {number} o.stage   1–5
 * @param {'happy'|'cheer'|'think'|'hf-ready'|'hf-clap'} o.pose
 * @param {{yuan?: string[], fang?: string[]}} o.outfit  每隻身上的商品 id（最多帽子、衣服、配件各 1）
 * @param {object} o.anchors  assets/mascots/anchors.json 的內容
 * @param {object} o.items    assets/items/items.json 的內容
 * @param {string} [o.base]   資產路徑前綴，預設 'assets/'
 * @param {string} [o.label]  無障礙文字，預設「圓圓和方方」
 * @returns {SVGSVGElement}
 */
export function renderPal({ stage, pose, outfit = {}, anchors, items, base = 'assets/', label = '圓圓和方方' }) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', anchors.frame.viewBox);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  svg.setAttribute('class', 'mq-pal');
  const layerFile = `${base}mascots/layers/duo-s${stage}-${pose}.svg`;
  const poseAnchors = anchors.poses[`s${stage}-${pose}`];
  if (!poseAnchors) throw new Error(`沒有這個姿勢：s${stage}-${pose}`);
  const use = (href) => { const u = document.createElementNS(NS, 'use'); u.setAttribute('href', href); return u; };

  for (const layer of anchors.layers) {
    if (layer === 'fx') { svg.appendChild(use(`${layerFile}#fx`)); continue; }
    for (const pal of ['yuan', 'fang']) {
      if (anchors.charLayers.includes(layer)) svg.appendChild(use(`${layerFile}#${pal}-${layer}`));
      for (const id of outfit[pal] || []) {
        const it = items.items[id];
        if (!it || !it.parts) continue;
        for (const part of it.parts) {
          if (part.layer !== layer) continue;
          const g = document.createElementNS(NS, 'g');
          g.setAttribute('transform', `matrix(${poseAnchors[pal][part.anchor].matrix.join(' ')})`);
          g.setAttribute('data-item', id);
          const href = part.href.replace(/^assets\//, base);
          g.appendChild(use(`${href}#${part.idPrefix || ''}${pal}`));   // 例如書包的 #back-yuan、#front-yuan
          svg.appendChild(g);
        }
      }
    }
  }
  return svg;
}
