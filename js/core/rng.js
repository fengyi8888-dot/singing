// 可重現的亂數：同一個種子字串 → 同一串亂數，方便除錯與重現題目。

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(xmur3(String(seed))());
  const rng = {
    seed: String(seed),
    next,
    /** 整數，含 lo 與 hi */
    int(lo, hi) {
      if (!(hi >= lo)) throw new RangeError(`rng.int(${lo}, ${hi})`);
      return lo + Math.floor(next() * (hi - lo + 1));
    },
    pick(arr) {
      if (!arr.length) throw new RangeError('rng.pick: 空陣列');
      return arr[Math.floor(next() * arr.length)];
    },
    chance(p) { return next() < p; },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    /** 從陣列取 k 個不重複 */
    sample(arr, k) { return rng.shuffle(arr).slice(0, k); },
    /** 依權重選：[[value, weight], ...] */
    weighted(pairs) {
      const total = pairs.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [v, w] of pairs) { if ((r -= w) < 0) return v; }
      return pairs[pairs.length - 1][0];
    },
  };
  return rng;
}

let counter = 0;
/** 產生新的題目種子（時間 + 計數 + 亂數）；種子本身存進 log 可重現 */
export function newSeed(prefix = 'q') {
  counter = (counter + 1) % 1e6;
  const rand = Math.floor(Math.random() * 1e9).toString(36);
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${rand}`;
}
