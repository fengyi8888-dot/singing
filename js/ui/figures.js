// 幾何圖（SVG），比例跟題目數字一致。class 名稱對齊 Pixel 的 theme.css（.mqd-*）。
import { s } from './dom.js';

const W = 340, H = 240;

function svgRoot(plain, label) {
  return s('svg', { viewBox: `0 0 ${W} ${H}`, class: `mqd${plain ? ' mqd-plain' : ''}`, role: 'img', 'aria-label': label });
}

function text(x, y, str, cls = 'mqd-label', anchor = 'middle') {
  return s('text', { x, y, class: cls, 'text-anchor': anchor, 'dominant-baseline': 'middle' }, str);
}

function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
}

export function renderFigure(fig) {
  if (!fig) return null;
  switch (fig.type) {
    case 'circle': return circleFig(fig);
    case 'sector': return sectorFig(fig);
    case 'composite': return compositeFig(fig);
    case 'wheel': return wheelFig(fig);
    default: return null;
  }
}

function circleFig(f) {
  const cx = W / 2, cy = H / 2 + 6, R = 92;
  const svg = svgRoot(!f.colored, '圓形圖');
  svg.append(s('circle', { cx, cy, r: R, class: 'mqd-circle' }));
  svg.append(s('circle', { cx, cy, r: 4, class: 'mqd-center' }));
  if (f.show === 'r') {
    svg.append(s('line', { x1: cx, y1: cy, x2: cx + R, y2: cy, class: 'mqd-radius' }));
    svg.append(text(cx + R / 2, cy - 18, f.label, f.label === '?' ? 'mqd-unknown' : 'mqd-label'));
    svg.append(text(cx + R / 2, cy + 20, '半徑', 'mqd-label mqd-label--sm'));
  } else {
    svg.append(s('line', { x1: cx - R, y1: cy, x2: cx + R, y2: cy, class: 'mqd-diameter' }));
    svg.append(text(cx, cy - 18, f.label, f.label === '?' ? 'mqd-unknown' : 'mqd-label'));
    svg.append(text(cx, cy + 20, '直徑', 'mqd-label mqd-label--sm'));
  }
  if (f.ask === 'circumference') svg.append(text(cx, 16, '圓周長 = ?', 'mqd-unknown'));
  else if (f.circumLabel && !f.hideCircum) svg.append(text(cx, 16, `圓周長 ${f.circumLabel}`));
  return svg;
}

function sectorFig(f) {
  const theta = f.theta;
  const R = theta > 180 ? 88 : 120;
  const cx = theta > 180 ? W / 2 : theta > 90 ? W / 2 : 90;
  const cy = theta > 180 ? H / 2 : H - 40;
  const svg = svgRoot(!f.colored, '扇形圖');
  const [x0, y0] = polar(cx, cy, R, 0);
  const [x1, y1] = polar(cx, cy, R, theta);
  const large = theta > 180 ? 1 : 0;
  const d = theta === 360
    ? `M ${cx - R} ${cy} A ${R} ${R} 0 1 0 ${cx + R} ${cy} A ${R} ${R} 0 1 0 ${cx - R} ${cy}`
    : `M ${cx} ${cy} L ${x0} ${y0} A ${R} ${R} 0 ${large} 0 ${x1} ${y1} Z`;
  svg.append(s('path', { d, class: 'mqd-sector' }));
  svg.append(s('path', { d: `M ${x0} ${y0} A ${R} ${R} 0 ${large} 0 ${x1} ${y1}`, class: 'mqd-arc' }));
  svg.append(s('line', { x1: cx, y1: cy, x2: x0, y2: y0, class: 'mqd-radius' }));
  const [ax0, ay0] = polar(cx, cy, 26, 0);
  const [ax1, ay1] = polar(cx, cy, 26, theta);
  svg.append(s('path', { d: `M ${cx} ${cy} L ${ax0} ${ay0} A 26 26 0 ${large} 0 ${ax1} ${ay1} Z`, class: 'mqd-angle' }));
  svg.append(s('circle', { cx, cy, r: 4, class: 'mqd-center' }));
  svg.append(text((cx + x0) / 2, cy + 18, f.rLabel));
  const [tx, ty] = polar(cx, cy, 48, theta / 2);
  svg.append(text(tx, ty, f.thetaLabel, 'mqd-label mqd-label--sm'));
  return svg;
}

function compositeFig(f) {
  const svg = svgRoot(false, '複合圖形');
  const t = f.template;
  if (t === 'A') {
    const total = f.a + f.d;
    const k = Math.min(280 / total, 150 / f.d);
    const a = f.a * k, d = f.d * k, r = d / 2;
    const x = (W - a) / 2, y = (H - d) / 2;
    svg.append(s('path', { d: `M ${x} ${y} L ${x + a} ${y} A ${r} ${r} 0 0 1 ${x + a} ${y + d} L ${x} ${y + d} A ${r} ${r} 0 0 1 ${x} ${y} Z`, class: 'mqd-outline mqd-fill' }));
    svg.append(s('line', { x1: x, y1: y, x2: x, y2: y + d, class: 'mqd-diameter', 'stroke-dasharray': '6 6' }));
    svg.append(s('line', { x1: x + a, y1: y, x2: x + a, y2: y + d, class: 'mqd-diameter', 'stroke-dasharray': '6 6' }));
    svg.append(text(x + a / 2, y - 16, f.labels.a));
    svg.append(text(x + a + r / 2 + 4, y + d / 2, f.labels.d, 'mqd-label mqd-label--sm', 'start'));
  } else if (t === 'B') {
    const k = Math.min(200 / f.d, 190 / (f.h + f.d / 2));
    const d = f.d * k, hh = f.h * k, r = d / 2;
    const x = (W - d) / 2, yTop = (H - (hh + r)) / 2 + r;
    svg.append(s('path', { d: `M ${x} ${yTop} A ${r} ${r} 0 0 1 ${x + d} ${yTop} L ${x + d} ${yTop + hh} L ${x} ${yTop + hh} Z`, class: 'mqd-outline mqd-fill' }));
    if (f.innerLine) svg.append(s('line', { x1: x, y1: yTop, x2: x + d, y2: yTop, class: 'mqd-outline', 'stroke-dasharray': '6 6' }));
    svg.append(text(x + d / 2, yTop + hh + 18, f.labels.d));
    svg.append(text(x + d + 10, yTop + hh / 2, f.labels.h, 'mqd-label', 'start'));
  } else if (t === 'C') {
    const side = 170, x = (W - side) / 2, y = (H - side) / 2;
    svg.append(s('rect', { x, y, width: side, height: side, class: 'mqd-outline' }));
    svg.append(s('path', { d: `M ${x} ${y} A ${side} ${side} 0 0 1 ${x + side} ${y + side} A ${side} ${side} 0 0 1 ${x} ${y} Z`, class: 'mqd-sector' }));
    svg.append(text(x + side / 2, y + side + 16, f.labels.s));
  } else if (t === 'D') {
    const d = 240, r = d / 2, x = (W - d) / 2, y = H / 2 + 50;
    svg.append(s('path', { d: `M ${x} ${y} A ${r} ${r} 0 0 1 ${x + d} ${y} Z`, class: 'mqd-outline mqd-fill' }));
    svg.append(text(x + r, y + 18, f.labels.d));
  } else if (t === 'E') {
    const side = 180, x = (W - side) / 2, y = (H - side) / 2;
    const rr = (f.rr / f.s) * side;
    svg.append(s('path', {
      d: `M ${x} ${y} L ${x + side - rr} ${y} A ${rr} ${rr} 0 0 0 ${x + side} ${y + rr} L ${x + side} ${y + side} L ${x} ${y + side} Z`,
      class: 'mqd-outline mqd-fill',
    }));
    svg.append(text(x + side / 2, y + side + 16, f.labels.s));
    svg.append(text(x + side - rr / 2, y + rr / 2 + 4, f.labels.rr, 'mqd-label mqd-label--sm'));
  }
  return svg;
}

function wheelFig(f) {
  const svg = svgRoot(false, '輪子圖');
  const R = 80, cx = 120, cy = H - 30 - R;
  svg.append(s('line', { x1: 10, y1: cy + R, x2: W - 10, y2: cy + R, class: 'mqd-outline' }));
  svg.append(s('circle', { cx, cy, r: R, class: 'mqd-circle' }));
  svg.append(s('line', { x1: cx, y1: cy - R, x2: cx, y2: cy + R, class: 'mqd-diameter' }));
  svg.append(s('circle', { cx, cy, r: 4, class: 'mqd-center' }));
  svg.append(text(cx + 14, cy - 30, f.label, 'mqd-label', 'start'));
  svg.append(s('path', { d: `M ${cx + R + 20} ${cy + R - 14} L ${W - 30} ${cy + R - 14}`, class: 'mqd-arc' }));
  svg.append(text((cx + R + W) / 2, cy + R - 34, '滾一圈 = ?', 'mqd-unknown'));
  return svg;
}
