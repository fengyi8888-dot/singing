// 精確分數運算（避免 0.1 + 0.2 這類浮點誤差）。
// 數值都是安全整數範圍內的分子、分母；超出範圍時丟出錯誤，讓測試抓到。

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function assertSafe(n) {
  if (!Number.isSafeInteger(n)) throw new RangeError(`Frac: 非安全整數 ${n}`);
}

export class Frac {
  constructor(n, d = 1) {
    assertSafe(n); assertSafe(d);
    if (d === 0) throw new RangeError('Frac: 分母為 0');
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d) || 1;
    this.n = n / g;
    this.d = d / g;
    Object.freeze(this);
  }

  static of(x) {
    if (x instanceof Frac) return x;
    if (typeof x === 'number') {
      if (Number.isInteger(x)) return new Frac(x, 1);
      // 只用在程式裡寫死的有限小數（例如 0.5、3.14）
      const s = String(x);
      if (/e/i.test(s)) throw new RangeError(`Frac.of: 不支援 ${s}`);
      const [i, f = ''] = s.split('.');
      const d = 10 ** f.length;
      return new Frac(Number(i + f), d);
    }
    if (typeof x === 'string') return Frac.parseDecimal(x);
    if (x && typeof x.n === 'number' && typeof x.d === 'number') return new Frac(x.n, x.d);
    throw new TypeError('Frac.of: 無法轉換');
  }

  static parseDecimal(s) {
    const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(s);
    if (!m) throw new TypeError(`Frac.parseDecimal: ${s}`);
    const f = m[3] || '';
    const v = new Frac(Number(m[2] + f), 10 ** f.length);
    return m[1] ? v.neg() : v;
  }

  add(o) { o = Frac.of(o); return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { o = Frac.of(o); return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { o = Frac.of(o); return new Frac(this.n * o.n, this.d * o.d); }
  div(o) { o = Frac.of(o); if (o.n === 0) throw new RangeError('Frac: 除以 0'); return new Frac(this.n * o.d, this.d * o.n); }
  neg() { return new Frac(-this.n, this.d); }
  abs() { return this.n < 0 ? this.neg() : this; }
  inv() { return new Frac(this.d, this.n); }
  eq(o) { o = Frac.of(o); return this.n === o.n && this.d === o.d; }
  cmp(o) { o = Frac.of(o); return Math.sign(this.n * o.d - o.n * this.d); }
  lt(o) { return this.cmp(o) < 0; }
  gt(o) { return this.cmp(o) > 0; }
  isInt() { return this.d === 1; }
  valueOf() { return this.n / this.d; }
  toNumber() { return this.n / this.d; }

  /** 分母只含 2、5 → 可以寫成有限小數；回傳小數位數，否則 -1 */
  decimalPlaces() {
    let d = this.d, k2 = 0, k5 = 0;
    while (d % 2 === 0) { d /= 2; k2++; }
    while (d % 5 === 0) { d /= 5; k5++; }
    return d === 1 ? Math.max(k2, k5) : -1;
  }

  /** 精確的小數字串（必須是有限小數），例如 18.84 */
  toDecimalString() {
    const places = this.decimalPlaces();
    if (places < 0) throw new RangeError(`Frac: ${this.n}/${this.d} 不是有限小數`);
    if (places === 0) return String(this.n / this.d);
    const scaled = (this.n * (10 ** places)) / this.d;   // 整數
    assertSafe(scaled);
    const neg = scaled < 0;
    const digits = String(Math.abs(scaled)).padStart(places + 1, '0');
    const s = digits.slice(0, -places) + '.' + digits.slice(-places);
    return (neg ? '-' : '') + s.replace(/\.?0+$/, '');
  }

  /** 分數字串 3/4；整數就寫整數 */
  toFracString() { return this.d === 1 ? String(this.n) : `${this.n}/${this.d}`; }

  /** 顯示用：有限小數用小數，其他用分數 */
  toString() { return this.decimalPlaces() >= 0 ? this.toDecimalString() : this.toFracString(); }
  toJSON() { return { n: this.n, d: this.d }; }
}

export const F = (n, d = 1) => new Frac(n, d);
export { gcd };
export function lcm(a, b) { return Math.abs(a * b) / gcd(a, b); }
