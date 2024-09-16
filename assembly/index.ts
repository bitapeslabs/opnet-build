type Potential<T> = T | null;


const ADDRESS_BYTE_LENGTH: u8 = 66;
declare type Address = string;
declare type PotentialAddress = Potential<Address>;
import { CharCode } from "util/string";

// @ts-ignore: decorator
@lazy const MaxBaseForExponent128 = memory.data<u64>([
  u64.MAX_VALUE,       // 0
  u64.MAX_VALUE,       // 1
  u64.MAX_VALUE,       // 2
  0x000006597FA94F5B,  // 3
  0x00000000FFFFFFFF,  // 4
  0x0000000003080C00,  // 5
  0x0000000000285145,  // 6
  0x000000000004E045,  // 7
  0x000000000000FFFF,  // 8
  0x0000000000004AA8,  // 9
  0x0000000000001BDB,  // 10
  0x0000000000000C6F,  // 11
  0x0000000000000659,  // 12
  0x0000000000000398,  // 13
  0x0000000000000235,  // 14
  0x0000000000000172,  // 15
  0x00000000000000FF,  // 16
  0x00000000000000B8,  // 17
  0x000000000000008A,  // 18
  0x000000000000006A,  // 19
  0x0000000000000054,  // 20
  0x0000000000000044,  // 21
  0x0000000000000038,  // 22
  0x000000000000002F,  // 23
  0x0000000000000028,  // 24
  0x0000000000000022,  // 25
  0x000000000000001E,  // 26
  0x000000000000001A,  // 27
  0x0000000000000017,  // 28
  0x0000000000000015,  // 29
  0x0000000000000013,  // 30
  0x0000000000000011,  // 31
  0x000000000000000F,  // 32
  0x000000000000000E,  // 33
  0x000000000000000D,  // 34
  0x000000000000000C,  // 35
  0x000000000000000B,  // 36
  0x000000000000000B,  // 37
  0x000000000000000A,  // 38
]);

// Use LUT wrapped by function for lazy compilation
// @ts-ignore: decorator
@lazy const RadixCharsTable = memory.data<u8>([
   0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 36, 36, 36, 36, 36, 36,
  36, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
  25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 36, 36, 36, 36,
  36, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
  25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35
]);

// @ts-ignore: decorator
@inline function isPowerOverflow128(base: u128, exponent: i32): bool {
  // never overflow
  if (exponent <= 1 || base <= u128.One) {
    return false;
  }
  // always overflow
  if (base.hi != 0 || exponent >= 128) {
    return true;
  }
  var low = base.lo;
  if (low <= 10) {
    switch (<i32>low) {
      case 2:  return exponent > 127;
      case 3:  return exponent > 80;
      case 4:  return exponent > 63;
      case 5:  return exponent > 55;
      case 6:  return exponent > 49;
      case 7:  return exponent > 45;
      case 8:  return exponent > 42;
      case 9:  return exponent > 40;
      case 10: return exponent > 38;
    }
  }
  if (exponent >= 38) return true;
  return low > load<u64>(MaxBaseForExponent128 + (exponent << 3));
}

// helper function for utoa
function processU64(digits: Uint8Array, value: u64): void {
  var length = digits.length - 1;
  for (let i = 63; i != -1; --i) {
    for (let j = 0; j <= length; ++j) {
      unchecked(digits[j] += (u8(digits[j] >= 5) * 3));
    }
    for (let j = length; j != -1; --j) {
      let d = unchecked(digits[j]) << 1;
      if (j < length) unchecked(digits[j + 1] |= u8(d > 15));
      unchecked(digits[j] = d & 15);
    }
    unchecked(digits[0] += u8((value & (1 << i)) != 0));
  }
}

function u128toDecimalString(value: u128): string {
  var length = 40;
  var digits = new Uint8Array(length);
  var result = "", start = false;

  processU64(digits, value.hi);
  processU64(digits, value.lo);

  for (let i = length - 1; i != -1; --i) {
    let d = unchecked(digits[i]);
    if (!start && d != 0) start = true;
    if (start) {
      assert(<u32>d <= 9);
      result += String.fromCharCode(0x30 + d);
    }
  }
  return result;
}

function u256toDecimalString(value: u256): string {
  var length = 78;
  var digits = new Uint8Array(length);
  var result = "", start = false;

  processU64(digits, value.hi2);
  processU64(digits, value.hi1);
  processU64(digits, value.lo2);
  processU64(digits, value.lo1);

  for (let i = length - 1; i != -1; --i) {
    let d = unchecked(digits[i]);
    if (!start && d != 0) start = true;
    if (start) {
      assert(<u32>d <= 9);
      result += String.fromCharCode(0x30 + d);
    }
  }
  return result;
}

function atou128(str: string, radix: i32 = 10): u128 {
  if (radix < 2 || radix > 36) {
    throw new Error("Invalid radix");
  }
  var len = str.length;
  if (!len) return u128.Zero;

  var first = str.charCodeAt(0);
  if (len == 1 && first == CharCode._0) {
    return u128.Zero;
  }
  var isNeg = first == CharCode.MINUS;
  // @ts-ignore
  var index = i32(isNeg | (first == CharCode.PLUS));

  if (str.charCodeAt(index) == CharCode._0) {
    let second = str.charCodeAt(++index);
    if ((second | 32) == CharCode.x) {
      radix = 16; ++index;
    } else if ((second | 32) == CharCode.o) {
      radix = 8; ++index;
    } else if ((second | 32) == CharCode.b) {
      radix = 2; ++index;
    } else if (second == CharCode._0) {
      // skip leading zeros
      while (index < len && str.charCodeAt(index) == CharCode._0) ++index;
    }
  }
  var result = u128.Zero;
  var table  = RadixCharsTable;

  if (index >= len) return result;

  if (ASC_SHRINK_LEVEL >= 1) {
    let radix128 = u128.fromU64(radix);
    do {
      let n: u32 = str.charCodeAt(index) - CharCode._0;
      if (n > <u32>(CharCode.z - CharCode._0)) break;

      let num = load<u8>(table + n);
      if (num >= <u8>radix) break;

      // @ts-ignore
      result *= radix128;
      // @ts-ignore
      result += u128.fromU64(num);
    } while (++index < len);
  } else {
    switch (radix) {
      case 2: {
        do {
          let num: u32 = str.charCodeAt(index) - CharCode._0;
          if (num >= 2) break;
          // @ts-ignore
          result <<= 1;
          // @ts-ignore
          result |= u128.fromU64(num);
        } while (++index < len);
        break;
      }
      case 10: {
        do {
          let num: u32 = str.charCodeAt(index) - CharCode._0;
          if (num >= 10) break;
          // @ts-ignore
          result  = (result << 3) + (result << 1);
          // @ts-ignore
          result += u128.fromU64(num);
        } while (++index < len);
        break;
      }
      case 16: {
        do {
          let n: u32 = str.charCodeAt(index) - CharCode._0;
          if (n > <u32>(CharCode.z - CharCode._0)) break;

          let num = load<u8>(table + n);
          if (num >= 16) break;

          // @ts-ignore
          result <<= 4;
          // @ts-ignore
          result |= u128.fromU64(num);
        } while (++index < len);
        break;
      }
      default: {
        let radix128 = u128.fromU64(radix);
        do {
          let n: u32 = str.charCodeAt(index) - CharCode._0;
          if (n > <u32>(CharCode.z - CharCode._0)) break;

          let num = load<u8>(table + n);
          if (num >= <u8>radix) break;

          // @ts-ignore
          result *= radix128;
          // @ts-ignore
          result += u128.fromU64(num);
        } while (++index < len);
        break;
      }
    }
  }
  // @ts-ignore
  return isNeg ? -result : result;
}


// used for returning quotient and reminder from __divmod128
@lazy var __divmod_quot_hi: u64 = 0;
@lazy var __divmod_rem_lo:  u64 = 0;
@lazy var __divmod_rem_hi:  u64 = 0;

// used for returning low and high part of __mulq64, __multi3 etc
@lazy var __res128_hi: u64 = 0;
// used for returning 0 or 1
@lazy var __carry: u64 = 0;

/**
 * Convert 128-bit unsigned integer to 64-bit float
 * @param  lo lower  64-bit part of unsigned 128-bit integer
 * @param  hi higher 64-bit part of unsigned 128-bit integer
 * @return    64-bit float result
 */
// @ts-ignore: decorator
@global
function __floatuntidf(lo: u64, hi: u64): f64 {
  // __floatuntidf ported from LLVM sources
  if (!(lo | hi)) return 0.0;

  var v  = new u128(lo, hi);
  var sd = 128 - __clz128(lo, hi);
  var e  = sd - 1;

  if (sd > 53) {
    if (sd != 55) {
      if (sd == 54) {
        v = u128.shl(v, 1);
      } else {
        v = u128.or(
          u128.shr(v, sd - 55),
          u128.fromBool(u128.and(v, u128.shr(u128.Max, 128 + 55 - sd)).toBool())
        );
      }
    }

    v.lo |= (v.lo & 4) >> 2;
    v.preInc();

    v = u128.shr(v, 2);

    if (v.lo & (1 << 53)) {
      v = u128.shr(v, 1);
      ++e;
    }

  } else {
    v = u128.shl(v, 53 - sd);
  }

  var w: u64 = u128.shr(v, 32).lo & 0x000FFFFF;
  var u: u64 = <u64>(((e + 1023) << 20) | w) << 32;
  return reinterpret<f64>(u | (v.lo & 0xFFFFFFFF));
}

// @ts-ignore: decorator
@global
function __umulh64(a: u64, b: u64): u64 {
  var u = a & 0xFFFFFFFF; a >>= 32;
  var v = b & 0xFFFFFFFF; b >>= 32;

  var uv = u * v;
  var uv = a * v + (uv >> 32);
  var w0 = u * b + (uv & 0xFFFFFFFF);
  return a * b + (uv >> 32) + (w0 >> 32);
}

// @ts-ignore: decorator
@global
function __umulq64(a: u64, b: u64): u64 {
  var u = a & 0xFFFFFFFF; a >>= 32;
  var v = b & 0xFFFFFFFF; b >>= 32;

  var uv = u * v;
  var w0 = uv & 0xFFFFFFFF;
  uv = a * v + (uv >> 32);
  var w1 = uv >> 32;
  uv = u * b + (uv & 0xFFFFFFFF);

  __res128_hi = a * b + w1 + (uv >> 32);
  return (uv << 32) | w0;
}

// __umul64Hop computes (hi * 2^64 + lo) = z + (x * y)
// @ts-ignore: decorator
@inline
function __umul64Hop(z: u64, x: u64, y: u64): u64 {
  var lo = __umulq64(x, y);
  lo = __uadd64(lo, z);
  var hi = __res128_hi +__carry;
  __res128_hi = hi;
  return lo
}

// __umul64Step computes (hi * 2^64 + lo) = z + (x * y) + carry.
// @ts-ignore: decorator
@inline
function __umul64Step(z: u64, x: u64, y: u64, carry: u64): u64 {
  var lo = __umulq64(x, y)
  lo = __uadd64(lo, carry);
  var hi = __uadd64(__res128_hi, 0, __carry);
  lo = __uadd64(lo, z);
  hi += __carry;
  __res128_hi = hi;
  return lo
}

// __uadd64 returns the sum with carry of x, y and carry: sum = x + y + carry.
// The carry input must be 0 or 1; otherwise the behavior is undefined.
// The carryOut output is guaranteed to be 0 or 1.
// @ts-ignore: decorator
@inline
function __uadd64(x: u64, y: u64, carry: u64 = 0): u64 {
  var sum = x + y + carry
  // // The sum will overflow if both top bits are set (x & y) or if one of them
  // // is (x | y), and a carry from the lower place happened. If such a carry
  // // happens, the top bit will be 1 + 0 + 1 = 0 (& ~sum).
  __carry = ((x & y) | ((x | y) & ~sum)) >>> 63
  return sum;

}

// u256 * u256 => u256 implemented from https://github.com/holiman/uint256
// @ts-ignore: decorator
@global
function __mul256(x0: u64, x1: u64, x2: u64, x3: u64, y0: u64, y1: u64, y2: u64, y3: u64): u256 {
  var lo1 = __umulq64(x0, y0);
  var res1 = __umul64Hop(__res128_hi, x1, y0);
  var res2 = __umul64Hop(__res128_hi, x2, y0);
  var res3 = x3 * y0 + __res128_hi;

  var lo2 = __umul64Hop(res1, x0, y1);
  res2 = __umul64Step(res2, x1, y1, __res128_hi);
  res3 += x2 * y1 + __res128_hi;

  var hi1 = __umul64Hop(res2, x0, y2);
  res3 += x1 * y2 + __res128_hi

  var hi2 = __umul64Hop(res3, x0, y3);

  return new u256(lo1, lo2, hi1, hi2);
}

// @ts-ignore: decorator
@global
function __multi3(al: u64, ah: u64, bl: u64, bh: u64): u64 {
  var u = al, v = bl;
  var w: u64, k: u64;

  var u1 = u & 0xFFFFFFFF; u >>= 32;
  var v1 = v & 0xFFFFFFFF; v >>= 32;
  var t  = u1 * v1;
  var w1 = t & 0xFFFFFFFF;

  t = u * v1 + (t >> 32);
  k = t & 0xFFFFFFFF;
  w = t >> 32;
  t = u1 * v + k;

  var lo  = (t << 32) | w1;
  var hi  = u  * v + w;
      hi += ah * bl;
      hi += al * bh;
      hi += t >> 32;

  __res128_hi = hi;
  return lo;
}

// @ts-ignore: decorator
@global
function __floatuntfdi(value: f64): u64 {
  var u = reinterpret<u64>(value);

  // if (value < -1.7014118346046e38) { // -(2^127-1)
  if (value < reinterpret<f64>(0xC7F0000000000000)) { // -(2^128-1)
    // __float_u128_hi = <u64>-1; // for i128
    __res128_hi = 0;
    // overflow negative
    return 0;
    // } else if (value < -9.2233720368547e18) { // -2^63-1 // for i128
  } else if (value < reinterpret<f64>(0xC3F0000000000000)) { // // -(2^64-1)
    let lo: u64, hi: u64, m: u64;

    m = (u & 0x000FFFFFFFFFFFFF) | (1 << 52);
    u = (u & 0x7FFFFFFFFFFFFFFF) >> 52;

    u -= 1075;
    if (u > 64) {
      lo = 0;
      hi = m << (u - 64);
    } else {
      lo = m << u;
      hi = m >> (64 - u);
    }
    __res128_hi = ~hi;
    return ~lo;
    // } else if (value < 9.2233720368547e18) { // 2^63-1 // for i128
  } else if (value < reinterpret<f64>(0x43F0000000000000)) { // 2^64-1
    // __float_u128_hi = (value < 0) ? -1 : 0; // for int
    __res128_hi = 0;
    // fit in a u64
    return <u64>value;
    // } else if (value < 1.7014118346046e38) {
  } else if (value < reinterpret<f64>(0x47F0000000000000)) { // 2^128-1
    let lo: u64, hi: u64, m: u64;

    m = (u & 0x000FFFFFFFFFFFFF) | (1 << 52);
    u = (u & 0x7FFFFFFFFFFFFFFF) >> 52;
    u -= 1075;
    if (u > 64) {
      lo = 0;
      hi = m << (u - 64);
    } else {
      lo = m << u;
      hi = m >> (64 - u);
    }
    __res128_hi = hi;
    return lo;
  } else {
    // overflow positive
    __res128_hi = <u64>-1; // 0x7FFFFFFFFFFFFFFF for i128
    return <u64>-1;
  }
}

// @ts-ignore: decorator
@global @inline
function __clz128(lo: u64, hi: u64): i32 {
  var mask: u64 = <i64>(hi ^ (hi - 1)) >> 63;
  return <i32>clz((hi & ~mask) | (lo & mask)) + (<i32>mask & 64);
}

// @ts-ignore: decorator
@global @inline
function __ctz128(lo: u64, hi: u64): i32 {
  var mask: u64 = <i64>(lo ^ (lo - 1)) >> 63;
  return <i32>ctz((hi & mask) | (lo & ~mask)) + (<i32>mask & 64);
}

// @ts-ignore: decorator
@global
function __udivmod128(alo: u64, ahi: u64, blo: u64, bhi: u64): u64 {
  var bzn = __clz128(blo, bhi); // N

  // b == 0
  if (bzn == 128) {
    throw new RangeError("Division by zero"); // division by zero
  }

  // var azn = __clz128(alo, ahi); // M
  var btz = __ctz128(blo, bhi); // N

  // a == 0
  if (!(alo | ahi)) {
    __divmod_quot_hi = 0;
    __divmod_rem_lo  = 0;
    __divmod_rem_hi  = 0;
    return 0;
  }

  // a / 1
  if (bzn == 127) {
    __divmod_quot_hi = ahi;
    __divmod_rem_lo  = 0;
    __divmod_rem_hi  = 0;
    return alo;
  }

  // a == b
  if (alo == blo && ahi == bhi) {
    __divmod_quot_hi = 0;
    __divmod_rem_lo  = 0;
    __divmod_rem_hi  = 0;
    return 1;
  }

  // if (btz + bzn == 127) {
  //   // TODO
  //   // __divmod_quot = a >> btz
  //   // b++
  //   // __divmod_rem = a & b
  //   return;
  // }

  if (!(ahi | bhi)) {
    __divmod_quot_hi = 0;
    __divmod_rem_hi  = 0;
    // if `b.lo` is power of two
    if (!(blo & (blo - 1))) {
      __divmod_rem_lo = alo & (blo - 1);
      return alo >> btz;
    } else {
      let dlo = alo / blo;
      __divmod_rem_lo = alo - dlo * blo;
      return dlo;
    }
  }

  // if b.lo == 0 and `b.hi` is power of two
  // if (!blo && !(bhi & (bhi - 1))) {
  //   __divmod_rem = 0;

  //   // TODO

  //   return 0;
  // }

  // var diff: i64 = ahi - bhi;
  // var cmp = <i32>(diff != 0 ? diff : alo - blo); // TODO optimize this

  // if (cmp <= 0) {
  //   __divmod_quot_hi = 0;
  //   __divmod_rem     = 0;
  //   return u64(cmp == 0);
  // }

  // if (bzn - azn <= 5) {
  //   // TODO
  //   // fast path
  //   return __udivmod128core(alo, ahi, blo, bhi);
  // }
  return __udivmod128core(alo, ahi, blo, bhi);
}

function __udivmod128core(alo: u64, ahi: u64, blo: u64, bhi: u64): u64 {
  var a = new u128(alo, ahi);
  var b = new u128(blo, bhi);
  // get leading zeros for left alignment
  var alz = __clz128(alo, ahi);
  var blz = __clz128(blo, bhi);
  var off = blz - alz;
  var nb  = b << off;
  var q = u128.Zero;
  var n = a.clone();

  // create a mask with the length of b
  var mask = u128.One;
  mask <<= 128 - blz;
  --mask;
  mask <<= off;

  var i = 0;
  while (n >= b) {
    ++i;
    q <<= 1;
    if ((n & mask) >= nb) {
      ++q;
      n -= nb;
    }

    mask |= mask >> 1;
    nb >>= 1;
  }
  q <<= (blz - alz - i + 1);

  __divmod_quot_hi = q.hi;
  __divmod_rem_lo  = n.lo;
  __divmod_rem_hi  = n.hi;
  return q.lo;
}

// @ts-ignore: decorator
@global
function __udivmod128_10(lo: u64, hi: u64): u64 {
  if (!hi) {
    __divmod_quot_hi = 0;
    if (lo < 10) {
      __divmod_rem_lo = 0;
      __divmod_rem_hi = 0;
      return 0;
    } else {
      let qlo = lo / 10;
      __divmod_rem_lo = lo - qlo * 10;
      __divmod_rem_hi = 0;
      return qlo;
    }
  }

  var q: u128, r: u128;
  var n = new u128(lo, hi);

  q  = n >> 1;
  q += n >> 2;
  q += q >> 4;
  q += q >> 8;
  q += q >> 16;
  q += q >> 32;
  q += u128.fromU64(q.hi); // q >> 64
  q >>= 3;
  r = n - (((q << 2) + q) << 1);
  n = q + u128.fromBool(r.lo > 9);

  __divmod_quot_hi = n.hi;
  __divmod_rem_lo  = r.lo;
  __divmod_rem_hi  = r.hi;
  return n.lo;
}


@lazy const HEX_CHARS = '0123456789abcdef';

class u256 {

  @inline static get Zero(): u256 { return new u256(); }
  @inline static get One():  u256 { return new u256(1); }
  @inline static get Min():  u256 { return new u256(); }
  @inline static get Max():  u256 { return new u256(-1, -1, -1, -1); }

  // TODO: fromString

  @inline
  static fromU256(value: u256): u256 {
    return new u256(value.lo1, value.lo2, value.hi1, value.hi2);
  }

  @inline
  static fromU128(value: u128): u256 {
    return new u256(value.lo, value.hi);
  }

  @inline
  static fromU64(value: u64): u256 {
    return new u256(value);
  }

  @inline
  static fromI64(value: i64): u256 {
    var mask = value >> 63;
    return new u256(value, mask, mask, mask);
  }

  @inline
  static fromU32(value: u32): u256 {
    return new u256(value);
  }

  @inline
  static fromI32(value: i32): u256 {
    var mask: u64 = value >> 63;
    return new u256(value, mask, mask, mask);
  }

  @inline
  static fromBits(
    l0: u32, l1: u32, l2: u32, l3: u32,
    h0: u32, h1: u32, h2: u32, h3: u32,
  ): u256 {
    return new u256(
      <u64>l0 | ((<u64>l1) << 32),
      <u64>l2 | ((<u64>l3) << 32),
      <u64>h0 | ((<u64>h1) << 32),
      <u64>h2 | ((<u64>h3) << 32),
    );
  }

  @inline
  static fromBytes<T>(array: T, bigEndian: bool = false): u256 {
    // @ts-ignore
    if (array instanceof u8[]) {
      return bigEndian
        // @ts-ignore
        ? u256.fromBytesBE(<u8[]>array)
        // @ts-ignore
        : u256.fromBytesLE(<u8[]>array);
    } else if (array instanceof Uint8Array) {
      return bigEndian
        ? u256.fromUint8ArrayBE(<Uint8Array>array)
        : u256.fromUint8ArrayLE(<Uint8Array>array);
    } else {
      throw new TypeError("Unsupported generic type");
    }
  }

  @inline
  static fromBytesLE(array: u8[]): u256 {
    assert(array.length && (array.length & 31) == 0);
    // @ts-ignore
    var buffer = array.dataStart
    return new u256(
      load<u64>(buffer, 0 * sizeof<u64>()),
      load<u64>(buffer, 1 * sizeof<u64>()),
      load<u64>(buffer, 2 * sizeof<u64>()),
      load<u64>(buffer, 3 * sizeof<u64>()),
    );
  }

  @inline
  static fromBytesBE(array: u8[]): u256 {
    assert(array.length && (array.length & 31) == 0);
    var buffer = array.dataStart;
    return new u256(
      bswap<u64>(load<u64>(buffer, 3 * sizeof<u64>())),
      bswap<u64>(load<u64>(buffer, 2 * sizeof<u64>())),
      bswap<u64>(load<u64>(buffer, 1 * sizeof<u64>())),
      bswap<u64>(load<u64>(buffer, 0 * sizeof<u64>()))
    );
  }

  @inline
  static fromUint8ArrayLE(array: Uint8Array): u256 {
    assert(array.length && (array.length & 31) == 0);
    var buffer = array.dataStart;
    return new u256(
        load<u64>(buffer, 0 * sizeof<u64>()),
        load<u64>(buffer, 1 * sizeof<u64>()),
        load<u64>(buffer, 2 * sizeof<u64>()),
        load<u64>(buffer, 3 * sizeof<u64>())
    );
  }

  @inline
  static fromUint8ArrayBE(array: Uint8Array): u256 {
    assert(array.length && (array.length & 31) == 0);
    var buffer = array.dataStart;
    return new u256(
        bswap<u64>(load<u64>(buffer, 3 * sizeof<u64>())),
        bswap<u64>(load<u64>(buffer, 2 * sizeof<u64>())),
        bswap<u64>(load<u64>(buffer, 1 * sizeof<u64>())),
        bswap<u64>(load<u64>(buffer, 0 * sizeof<u64>()))
    );
  }

  // TODO need improvement
  // max safe uint for f64 actually 52-bits
  @inline
  static fromF64(value: f64): u256 {
    var mask = u64(reinterpret<i64>(value) >> 63);
    return new u256(<u64>value, mask, mask, mask);
  }

  // TODO need improvement
  // max safe int for f32 actually 23-bits
  @inline
  static fromF32(value: f32): u256 {
    var mask = u64(reinterpret<i32>(value) >> 31);
    return new u256(<u64>value, mask, mask, mask);
  }

  /**
 * Create 256-bit unsigned integer from generic type T
 * @param  value
 * @returns 256-bit unsigned integer
 */
  @inline
  static from<T>(value: T): u256 {
    if (value instanceof bool) return u256.fromU64(<u64>value);
    else if (value instanceof i8) return u256.fromI64(<i64>value);
    else if (value instanceof u8) return u256.fromU64(<u64>value);
    else if (value instanceof i16) return u256.fromI64(<i64>value);
    else if (value instanceof u16) return u256.fromU64(<u64>value);
    else if (value instanceof i32) return u256.fromI64(<i64>value);
    else if (value instanceof u32) return u256.fromU64(<u64>value);
    else if (value instanceof i64) return u256.fromI64(<i64>value);
    else if (value instanceof u64) return u256.fromU64(<u64>value);
    else if (value instanceof f32) return u256.fromF64(<f64>value);
    else if (value instanceof f64) return u256.fromF64(<f64>value);
    else if (value instanceof u128) return u256.fromU128(<u128>value);
    else if (value instanceof u256) return u256.fromU256(<u256>value);
    else if (value instanceof u8[]) return u256.fromBytes(<u8[]>value);
    else if (value instanceof Uint8Array) return u256.fromBytes(<Uint8Array>value);
    else throw new TypeError("Unsupported generic type");
  }

  // TODO
  // static fromString(str: string): u256

  constructor(
    public lo1: u64 = 0,
    public lo2: u64 = 0,
    public hi1: u64 = 0,
    public hi2: u64 = 0,
  ) {}

  @inline
  set(value: u256): this {
    this.lo1 = value.lo1;
    this.lo2 = value.lo2;
    this.hi1 = value.hi1;
    this.hi2 = value.hi2;
    return this;
  }

  @inline
  setU128(value: u128): this {
    this.lo1 = value.lo;
    this.lo2 = value.hi;
    this.hi1 = 0;
    this.hi2 = 0;
    return this;
  }

  @inline
  setI64(value: i64): this {
    var mask: u64 = value >> 63;
    this.lo1 = value;
    this.lo2 = mask;
    this.hi1 = mask;
    this.hi2 = mask;
    return this;
  }

  @inline
  setU64(value: u64): this {
    this.lo1 = value;
    this.lo2 = 0;
    this.hi1 = 0;
    this.hi2 = 0;
    return this;
  }

  @inline
  setI32(value: i32): this {
    var mask: u64 = value >> 63;
    this.lo1 = value;
    this.lo2 = mask;
    this.hi1 = mask;
    this.hi2 = mask;
    return this;
  }

  @inline
  setU32(value: u32): this {
    this.lo1 = value;
    this.lo2 = 0;
    this.hi1 = 0;
    this.hi2 = 0;
    return this;
  }

  @inline
  isZero(): bool {
    return !(this.lo1 | this.lo2 | this.hi1 | this.hi2);
  }

  @inline @operator.prefix('!')
  static isEmpty(value: u256): bool {
    return value.isZero();
  }

  @inline @operator.prefix('~')
  not(): u256 {
    return new u256(~this.lo1, ~this.lo2, ~this.hi1, ~this.hi2);
  }

  @inline @operator.prefix('+')
  pos(): u256 {
    return this;
  }

  @operator.prefix('-')
  neg(): u256 {
    var
      lo1 = ~this.lo1,
      lo2 = ~this.lo2,
      hi1 = ~this.hi1,
      hi2 = ~this.hi2;

    var lo1p = lo1 + 1;
    var lo2p = lo2 + u64(lo1p < lo1);
    var hi1p = hi1 + ((lo2 & ~lo2p) >> 63);
    var hi2p = hi2 + ((hi1 & ~hi1p) >> 63);

    return new u256(lo1p, lo2p, hi1p, hi2p);
  }

  @operator.prefix('++')
  preInc(): this {
    var
      lo1 = this.lo1,
      lo2 = this.lo2,
      hi1 = this.hi1,
      hi2 = this.hi2;

    var lo1p = lo1 + 1;
    var lo2p = lo2 + u64(lo1p < lo1);
    var hi1p = hi1 + ((lo2 & ~lo2p) >> 63);
    var hi2p = hi2 + ((hi1 & ~hi1p) >> 63);

    this.lo1 = lo1p;
    this.lo2 = lo2p;
    this.hi1 = hi1p;
    this.hi2 = hi2p;

    return this;
  }

  @operator.prefix('--')
  preDec(): this {
    var
      lo1 = this.lo1,
      lo2 = this.lo2,
      hi1 = this.hi1,
      hi2 = this.hi2;

    var lo1p = lo1 - 1;
    var lo2p = lo2 - u64(lo1p > lo1);
    var hi1p = hi1 - ((~lo2 & lo2p) >> 63);
    var hi2p = hi2 - ((~hi1 & hi1p) >> 63);

    this.lo1 = lo1p;
    this.lo2 = lo2p;
    this.hi1 = hi1p;
    this.hi2 = hi2p;

    return this;
  }

  @inline @operator.postfix('++')
  postInc(): u256 {
    return this.clone().preInc();
  }

  @inline @operator.postfix('--')
  postDec(): u256 {
    return this.clone().preDec();
  }

  @operator('+')
  static add(a: u256, b: u256): u256 {
    var
      lo1a = a.lo1,
      lo2a = a.lo2,
      hi1a = a.hi1,
      hi2a = a.hi2;

    var
      lo1b = b.lo1,
      lo2b = b.lo2,
      hi1b = b.hi1,
      hi2b = b.hi2;

    var lo1 = lo1a + lo1b;
    var cy  = u64(lo1 < lo1a);
    var lo2 = lo2a + lo2b + cy;
        // for a + b + c case we should calculate carry bit differently
        cy  = ((lo2a & lo2b) | ((lo2a | lo2b) & ~lo2)) >> 63;
    var hi1 = hi1a + hi1b + cy;
        cy  = ((hi1a & hi1b) | ((hi1a | hi1b) & ~hi1)) >> 63;
    var hi2 = hi2a + hi2b + cy;
    return new u256(lo1, lo2, hi1, hi2);
  }

  @operator('-')
  static sub(a: u256, b: u256): u256 {
    var
      lo1a = a.lo1,
      lo2a = a.lo2,
      hi1a = a.hi1,
      hi2a = a.hi2;

    var
      lo1b = b.lo1,
      lo2b = b.lo2,
      hi1b = b.hi1,
      hi2b = b.hi2;

    var lo1 = lo1a - lo1b;
    var cy  = u64(lo1 > lo1a);
    var lo2 = lo2a - lo2b - cy;
        // for a - b - c case we should calculate carry bit differently
        cy  = ((~lo2a & lo2b) | ((~lo2a | lo2b) & lo2)) >> 63;
    var hi1 = hi1a - hi1b - cy;
        cy  = ((~hi1a & hi1b) | ((~hi1a | hi1b) & hi1)) >> 63;
    var hi2 = hi2a - hi2b - cy;
    return new u256(lo1, lo2, hi1, hi2);
  }

  @inline @operator('|')
  static or(a: u256, b: u256): u256 {
    return new u256(a.lo1 | b.lo1, a.lo2 | b.lo2, a.hi1 | b.hi1, a.hi2 | b.hi2);
  }

  @inline @operator('^')
  static xor(a: u256, b: u256): u256 {
    return new u256(a.lo1 ^ b.lo1, a.lo2 ^ b.lo2, a.hi1 ^ b.hi1, a.hi2 ^ b.hi2);
  }

  @inline @operator('&')
  static and(a: u256, b: u256): u256 {
    return new u256(a.lo1 & b.lo1, a.lo2 & b.lo2, a.hi1 & b.hi1, a.hi2 & b.hi2);
  }

  @operator('>>')
  static shr(value: u256, shift: i32): u256 {
    shift &= 255;
    var off = shift as u64;
    if (shift <= 64) {
      if (shift == 0) return value;
      let hi2 =  value.hi2 >> off;
      let hi1 = (value.hi1 >> off) | (value.hi2 << 64 - off);
      let lo2 = (value.lo2 >> off) | (value.hi1 << 64 - off);
      let lo1 = (value.lo1 >> off) | (value.lo2 << 64 - off);
      return new u256(lo1, lo2, hi1, hi2);
    } else if (shift > 64 && shift <= 128) {
      let hi1 = value.hi2 >> 128 - off;
      return new u256(value.lo2, value.hi1, hi1);
    } else if (shift > 128 && shift <= 192) {
      let lo2 = value.hi2 >> 192 - off;
      return new u256(value.hi1, lo2);
    } else {
      return new u256(value.hi2 >> 256 - off);
    }
  }

  @inline @operator('>>>')
  static shr_u(value: u256, shift: i32): u256 {
    return u256.shr(value, shift);
  }

  @inline @operator('==')
  static eq(a: u256, b: u256): bool {
    return (
      a.lo1 == b.lo1 && a.lo2 == b.lo2 &&
      a.hi1 == b.hi1 && a.hi2 == b.hi2
    );
  }

  @inline @operator('!=')
  static ne(a: u256, b: u256): bool {
    return !u256.eq(a, b);
  }

  @operator('<')
  static lt(a: u256, b: u256): bool {
    var ah2 = a.hi2, ah1 = a.hi1,
        bh2 = b.hi2, bh1 = b.hi1,
        al2 = a.lo2, bl2 = b.lo2;
    if (ah2 == bh2) {
      if (ah1 == bh1) {
        return al2 == bl2 ? a.lo1 < b.lo1 : al2 < bl2
      } else {
        return ah1 < bh1;
      }
    } else {
      return ah2 < bh2;
    }
  }

  @inline @operator('>')
  static gt(a: u256, b: u256): bool {
    return b < a;
  }

  @inline @operator('<=')
  static le(a: u256, b: u256): bool {
    return !u256.gt(a, b);
  }

  @inline @operator('>=')
  static ge(a: u256, b: u256): bool {
    return !u256.lt(a, b);
  }

  // mul: u256 x u256 = u256
  @inline @operator('*')
  static mul(a: u256, b: u256): u256 {
    return __mul256(a.lo1, a.lo2, a.hi1, a.hi2, b.lo1, b.lo2, b.hi1, b.hi2)
  }

  @inline
  static popcnt(value: u256): i32 {
    var count = popcnt(value.lo1);
    if (value.lo2) count += popcnt(value.lo2);
    if (value.hi1) count += popcnt(value.hi1);
    if (value.hi2) count += popcnt(value.hi2);
    return <i32>count;
  }

  @inline
  static clz(value: u256): i32 {
         if (value.hi2) return <i32>(clz(value.hi2) + 0);
    else if (value.hi1) return <i32>(clz(value.hi1) + 64);
    else if (value.lo2) return <i32>(clz(value.lo2) + 128);
    else                return <i32>(clz(value.lo1) + 192);
  }

  @inline
  static ctz(value: u256): i32 {
         if (value.lo1) return <i32>(ctz(value.lo1) + 0);
    else if (value.lo2) return <i32>(ctz(value.lo2) + 64);
    else if (value.hi1) return <i32>(ctz(value.hi1) + 128);
    else                return <i32>(ctz(value.hi2) + 192);
  }

  /**
   * Convert to 128-bit signed integer
   * @return 256-bit signed integer
   */
  @inline
  toI128(): i128 {
    return new i128(
      this.lo1,
      (this.lo2 & 0x7FFFFFFFFFFFFFFF) |
      (this.hi2 & 0x8000000000000000)
    );
  }

  /**
   * Convert to 128-bit unsigned integer
   * @return 128-bit unsigned integer
   */
  @inline
  toU128(): u128 {
    return new u128(this.lo1, this.lo2);
  }

  /**
  * Convert to 256-bit unsigned integer
  * @returns 256-bit unsigned integer
  */
  @inline
  toU256(): this {
    return this;
  }

  /**
   * Convert to 64-bit signed integer
   * @return 64-bit signed integer
   */
  @inline
  toI64(): i64 {
    return <i64>(
      (this.lo1 & 0x7FFFFFFFFFFFFFFF) |
      (this.hi2 & 0x8000000000000000)
    );
  }

  /**
   * Convert to 64-bit unsigned integer
   * @return 64-bit unsigned integer
   */
  @inline
  toU64(): u64 {
    return this.lo1;
  }

  /**
   * Convert to 32-bit signed integer
   * @return 32-bit signed integer
   */
  @inline
  toI32(): i32 {
    return <i32>this.toI64();
  }

  /**
   * Convert to 32-bit unsigned integer
   * @return 32-bit unsigned integer
   */
  @inline
  toU32(): u32 {
    return <u32>this.lo1;
  }

  /**
   * Convert to 1-bit boolean
   * @return 1-bit boolean
   */
  @inline
  toBool(): bool {
    return <bool>(this.lo1 | this.lo2 | this.hi1 | this.hi2);
  }

  @inline
  private toArrayBufferLE(buffer: usize): void {
    store<u64>(buffer, this.lo1, 0 * sizeof<u64>());
    store<u64>(buffer, this.lo2, 1 * sizeof<u64>());
    store<u64>(buffer, this.hi1, 2 * sizeof<u64>());
    store<u64>(buffer, this.hi2, 3 * sizeof<u64>());
  }

  @inline
  private toArrayBufferBE(buffer: usize): void {
    store<u64>(buffer, bswap(this.hi2), 0 * sizeof<u64>());
    store<u64>(buffer, bswap(this.hi1), 1 * sizeof<u64>());
    store<u64>(buffer, bswap(this.lo2), 2 * sizeof<u64>());
    store<u64>(buffer, bswap(this.lo1), 3 * sizeof<u64>());
  }

  @inline
  private toArrayBuffer(buffer: usize, bigEndian: bool = false): void {
    if (bigEndian) {
      this.toArrayBufferBE(buffer);
    } else {
      this.toArrayBufferLE(buffer);
    }
  }

  /**
   * Convert to generic type `T`. Useful inside other generics methods
   * @param  T  is <bool | i8 | u8 | i16 | u16 | i32 | u32 | i64 | u64 | f32 | f64 | i128 | u128 | u256 | u8[] | Uint8Array | `StaticArray<u8>` | string>
   * @returns   type of `T`
   */
  @inline
  as<T>(): T {
    var dummy!: T;
         if (dummy instanceof bool)       return <T>this.toBool();
    else if (dummy instanceof i8)         return <T>this.toI64();
    else if (dummy instanceof u8)         return <T>this.toU64();
    else if (dummy instanceof i16)        return <T>this.toI64();
    else if (dummy instanceof u16)        return <T>this.toU64();
    else if (dummy instanceof i32)        return <T>this.toI64();
    else if (dummy instanceof i64)        return <T>this.toI64();
    else if (dummy instanceof u32)        return <T>this.toU64();
    else if (dummy instanceof u64)        return <T>this.toU64();
    // else if (dummy instanceof f32)        return <T>this.toF64();
    // else if (dummy instanceof f64)        return <T>this.toF64();
    else if (dummy instanceof i128)       return <T>this.toI128();
    else if (dummy instanceof u128)       return <T>this.toU128();
    else if (dummy instanceof u256)       return <T>this.toU256();
    else if (dummy instanceof u8[])       return <T>this.toBytes();
    else if (dummy instanceof Uint8Array) return <T>this.toUint8Array();
    else if (dummy instanceof StaticArray<u8>) return <T>this.toStaticBytes();
    else if (dummy instanceof String)     return <T>this.toString();
    else throw new TypeError('Unsupported generic type');
  }

  /**
   * Convert to byte array
   * @param bigEndian Little or Big Endian? Default: false
   * @returns  Array of bytes
   */
  @inline
  toBytes(bigEndian: bool = false): u8[] {
    var result = new Array<u8>(32);
    this.toArrayBuffer(result.dataStart, bigEndian);
    return result;
  }

  /**
   * Convert to byte static array
   * @param bigEndian Little or Big Endian? Default: false
   * @returns  StaticArray of bytes
   */
   @inline
   toStaticBytes(bigEndian: bool = false): StaticArray<u8> {
     var result = new StaticArray<u8>(32);
     this.toArrayBuffer(changetype<usize>(result), bigEndian);
     return result;
   }

  /**
   * Convert to Uint8Array
   * @param bigEndian Little or Big Endian? Default: false
   * @returns  Uint8Array
   */
  @inline
  toUint8Array(bigEndian: bool = false): Uint8Array {
    var result = new Uint8Array(32);
    this.toArrayBuffer(result.dataStart, bigEndian);
    return result;
  }

  clone(): u256 {
    return new u256(this.lo1, this.lo2, this.hi1, this.hi2);
  }

  toString(radix: i32 = 10): string {
    assert(radix == 10 || radix == 16, 'radix argument must be between 10 or 16');
    if (this.isZero()) return '0';

    var result = '';
    if (radix == 16) {
      let shift: i32 = 252 - (u256.clz(this) & ~3);
      while (shift >= 0) {
        // @ts-ignore
        result += HEX_CHARS.charAt(<i32>((this >> shift).lo1 & 15));
        shift -= 4;
      }
      return result;
    }
    return u256toDecimalString(this);
  }
}


class i256 {

  @inline static get Zero(): i256 { return new i256(); }
  @inline static get One():  i256 { return new i256(1); }
  @inline static get Min():  i256 { return new i256(0, 0, 0, 0x8000000000000000); }
  @inline static get Max():  i256 { return new i256(u64.MAX_VALUE, u64.MAX_VALUE, u64.MAX_VALUE, 0x7FFFFFFFFFFFFFFF); }

  constructor(
    public lo1: i64 = 0,
    public lo2: i64 = 0,
    public hi1: i64 = 0,
    public hi2: i64 = 0,
  ) {}

  @inline
  isNeg(): bool {
    return <bool>(this.hi2 >>> 63);
  }

  @inline
  isZero(): bool {
    return !(this.lo1 | this.lo2 | this.hi1 | this.hi2);
  }

  @inline @operator.prefix('!')
  static isEmpty(value: i256): bool {
    return !value.isZero();
  }

  /*
  @inline
  static abs(value: i128): i128 {
    return value < 0 ? value.neg() : value;
  }
  */

  // TODO
}


class u128 {

  @inline static get Zero(): u128 { return new u128(); }
  @inline static get One():  u128 { return new u128(1); }
  @inline static get Min():  u128 { return new u128(); }
  @inline static get Max():  u128 { return new u128(-1, -1); }

  @inline
  static fromString(value: string, radix: i32 = 10): u128 {
    return atou128(value, radix);
  }

  @inline
  static fromI256(value: i256): u128 {
    return new u128(value.lo1, value.lo2);
  }

  @inline
  static fromU256(value: u256): u128 {
    return new u128(value.lo1, value.lo2);
  }

  @inline
  static fromI128(value: i128): u128 {
    return new u128(value.lo, value.hi);
  }

  @inline
  static fromU128(value: u128): u128 {
    return new u128(value.lo, value.hi);
  }

  @inline
  static fromI64(value: i64): u128 {
    return new u128(value, value >> 63);
  }

  @inline
  static fromU64(value: u64): u128 {
    return new u128(value);
  }

  // TODO need improvement
  // max safe uint for f64 actually 53-bits
  @inline
  static fromF64(value: f64): u128 {
    return new u128(<u64>value, reinterpret<i64>(value) >> 63);
  }

  // TODO need improvement
  // max safe int for f32 actually 23-bits
  @inline
  static fromF32(value: f32): u128 {
    return new u128(<u64>value, <u64>(reinterpret<i32>(value) >> 31));
  }

  @inline
  static fromI32(value: i32): u128 {
    return new u128(value, value >> 31);
  }

  @inline
  static fromU32(value: u32): u128 {
    return new u128(value);
  }

  @inline
  static fromBool(value: bool): u128 {
    return new u128(<u64>value);
  }

  @inline
  static fromBits(lo1: u32, lo2: u32, hi1: u32, hi2: u32): u128 {
    return new u128(
      <u64>lo1 | ((<u64>lo2) << 32),
      <u64>hi1 | ((<u64>hi2) << 32),
    );
  }

  @inline
  static fromBytes<T>(array: T, bigEndian: bool = false): u128 {
    if (array instanceof u8[]) {
      return bigEndian
        ? u128.fromBytesBE(<u8[]>array)
        : u128.fromBytesLE(<u8[]>array);
    } else if (array instanceof Uint8Array) {
      return bigEndian
        ? u128.fromUint8ArrayBE(<Uint8Array>array)
        : u128.fromUint8ArrayLE(<Uint8Array>array);
    } else {
      throw new TypeError("Unsupported generic type");
    }
  }

  @inline
  static fromBytesLE(array: u8[]): u128 {
    return u128.fromUint8ArrayLE(changetype<Uint8Array>(array));
  }

  @inline
  static fromBytesBE(array: u8[]): u128 {
    return u128.fromUint8ArrayBE(changetype<Uint8Array>(array));
  }

  @inline
  static fromUint8ArrayLE(array: Uint8Array): u128 {
    assert(array.length && (array.length & 15) == 0);
    // @ts-ignore
    var buffer = array.dataStart;
    return new u128(
      load<u64>(buffer, 0 * sizeof<u64>()),
      load<u64>(buffer, 1 * sizeof<u64>())
    );
  }

  @inline
  static fromUint8ArrayBE(array: Uint8Array): u128 {
    assert(array.length && (array.length & 15) == 0);
    // @ts-ignore
    var buffer = array.dataStart;
    return new u128(
      bswap<u64>(load<u64>(buffer, 1 * sizeof<u64>())),
      bswap<u64>(load<u64>(buffer, 0 * sizeof<u64>()))
    );
  }

  /**
   * Create 128-bit unsigned integer from generic type T
   * @param  value
   * @returns 128-bit unsigned integer
   */
  @inline
  static from<T>(value: T): u128 {
         if (value instanceof bool)   return u128.fromU64(<u64>value);
    else if (value instanceof i8)     return u128.fromI64(<i64>value);
    else if (value instanceof u8)     return u128.fromU64(<u64>value);
    else if (value instanceof i16)    return u128.fromI64(<i64>value);
    else if (value instanceof u16)    return u128.fromU64(<u64>value);
    else if (value instanceof i32)    return u128.fromI64(<i64>value);
    else if (value instanceof u32)    return u128.fromU64(<u64>value);
    else if (value instanceof i64)    return u128.fromI64(<i64>value);
    else if (value instanceof u64)    return u128.fromU64(<u64>value);
    else if (value instanceof f32)    return u128.fromF64(<f64>value);
    else if (value instanceof f64)    return u128.fromF64(<f64>value);
    else if (value instanceof i128)   return u128.fromI128(<i128>value);
    else if (value instanceof u128)   return u128.fromU128(<u128>value);
    else if (value instanceof i256)   return u128.fromI256(<i256>value);
    else if (value instanceof u256)   return u128.fromU256(<u256>value);
    else if (value instanceof u8[])   return u128.fromBytes(<u8[]>value);
    else if (value instanceof Uint8Array) return u128.fromBytes(<Uint8Array>value);
    else if (value instanceof String) return u128.fromString(<string>value);
    else throw new TypeError("Unsupported generic type");
  }

  /**
   * Create 128-bit unsigned integer from 64-bit parts
   * @param lo low  64-bit part of 128-bit unsigned integer
   * @param hi high 64-bit part of 128-bit unsigned integer
   */
  constructor(
    public lo: u64 = 0,
    public hi: u64 = 0,
  ) {}

  @inline
  set(value: u128): this {
    this.lo = value.lo;
    this.hi = value.hi;
    return this;
  }

  @inline
  setI64(value: i64): this {
    this.lo = value;
    this.hi = value >> 63;
    return this;
  }

  @inline
  setU64(value: u64): this {
    this.lo = value;
    this.hi = 0;
    return this;
  }

  @inline
  setI32(value: i32): this {
    this.lo = value;
    this.hi = value >> 63;
    return this;
  }

  @inline
  setU32(value: u32): this {
    this.lo = value;
    this.hi = 0;
    return this;
  }

  @inline
  isZero(): bool {
    return !(this.lo | this.hi);
  }

  @inline @operator.prefix('~')
  not(): u128 {
    return new u128(~this.lo, ~this.hi);
  }

  @inline @operator.prefix('+')
  pos(): u128 {
    return this;
  }

  @inline @operator.prefix('-')
  neg(): u128 {
    var lo = ~this.lo;
    var hi = ~this.hi;
    var lo1 = lo + 1;
    return new u128(lo1, hi + u64(lo1 < lo));
  }

  @operator.prefix('++')
  preInc(): this {
    var lo = this.lo;
    var lo1 = lo + 1;
    this.hi += u64(lo1 < lo);
    this.lo = lo1;
    return this;
  }

  @operator.prefix('--')
  preDec(): this {
    var lo = this.lo;
    var lo1 = lo - 1;
    this.hi -= u64(lo1 > lo);
    this.lo = lo1;
    return this;
  }

  @operator.postfix('++')
  postInc(): u128 {
    return this.clone().preInc();
  }

  @operator.postfix('--')
  postDec(): u128 {
    return this.clone().preDec();
  }

  @inline @operator.prefix('!')
  static isEmpty(value: u128): bool {
    return !(value.lo | value.hi);
  }

  @inline @operator('|')
  static or(a: u128, b: u128): u128 {
    return new u128(a.lo | b.lo, a.hi | b.hi);
  }

  @inline @operator('^')
  static xor(a: u128, b: u128): u128 {
    return new u128(a.lo ^ b.lo, a.hi ^ b.hi);
  }

  @inline @operator('&')
  static and(a: u128, b: u128): u128 {
    return new u128(a.lo & b.lo, a.hi & b.hi);
  }

  @inline @operator('<<')
  static shl(value: u128, shift: i32): u128 {
    shift &= 127;

    // need for preventing redundant i32 -> u64 extends
    var shift64 = shift as u64;

    var mod1 = ((((shift64 + 127) | shift64) & 64) >> 6) - 1;
    var mod2 = (shift64 >> 6) - 1;

    shift64 &= 63;

    var vl = value.lo;
    var lo = vl << shift64;
    var hi = lo & ~mod2;

    hi |= ((value.hi << shift64) | ((vl >> (64 - shift64)) & mod1)) & mod2;

    return new u128(lo & mod2, hi);
  }

  @inline @operator('>>')
  static shr(value: u128, shift: i32): u128 {
    shift &= 127;

    // need for preventing redundant i32 -> u64 extends
    var shift64 = shift as u64;

    var mod1 = ((((shift64 + 127) | shift64) & 64) >> 6) - 1;
    var mod2 = (shift64 >> 6) - 1;

    shift64 &= 63;

    var vh = value.hi;
    var hi = vh >> shift64;
    var lo = hi & ~mod2;

    lo |= ((value.lo >> shift64) | ((vh << (64 - shift64)) & mod1)) & mod2;

    return new u128(lo, hi & mod2);
  }

  @inline @operator('>>>')
  static shr_u(value: u128, shift: i32): u128 {
    return u128.shr(value, shift);
  }

  @inline
  static rotl(value: u128, shift: i32): u128 {
    let n = shift & 127;
    if (n == 0) return value.clone();

    let lo = value.lo;
    let hi = value.hi;
    if (n == 64) {
      return new u128(hi, lo);
    }
    if (n & 64) {
      let t = lo; lo = hi; hi = t;
    }
    let slo = lo << n;
    let shi = hi << n;
    let rlo = lo >> (64 - n);
    let rhi = hi >> (64 - n);
    return new u128(slo | rhi, shi | rlo);
  }

  @inline
  static rotr(value: u128, shift: i32): u128 {
    let n = shift & 127;
    if (n == 0) return value.clone();

    let lo = value.lo;
    let hi = value.hi;
    if (n == 64) {
      return new u128(hi, lo);
    }
    if (n & 64) {
      let t = lo; lo = hi; hi = t;
    }
    let slo = lo >> n;
    let shi = hi >> n;
    let rlo = lo << (64 - n);
    let rhi = hi << (64 - n);
    return new u128(slo | rhi, shi | rlo);
  }

  @inline @operator('+')
  static add(a: u128, b: u128): u128 {
    var alo = a.lo;
    var lo = alo + b.lo;
    var hi = a.hi + b.hi + u64(lo < alo);
    return new u128(lo, hi);
  }

  @inline @operator('-')
  static sub(a: u128, b: u128): u128 {
    var alo = a.lo;
    var lo = alo - b.lo;
    var hi = a.hi - b.hi - u64(lo > alo);
    return new u128(lo, hi);
  }

  // mul: u128 x u128 = u128
  @inline @operator('*')
  static mul(a: u128, b: u128): u128 {
    return new u128(
      __multi3(a.lo, a.hi, b.lo, b.hi),
      __res128_hi
    );
  }

  @inline @operator('/')
  static div(a: u128, b: u128): u128 {
    return new u128(
      __udivmod128(a.lo, a.hi, b.lo, b.hi),
      __divmod_quot_hi
    );
  }

  @inline @operator('%')
  static rem(a: u128, b: u128): u128 {
    __udivmod128(a.lo, a.hi, b.lo, b.hi);
    return new u128(__divmod_rem_lo, __divmod_rem_hi);
  }

  @inline
  static div10(value: u128): u128 {
    return new u128(
      __udivmod128_10(value.lo, value.hi),
      __divmod_quot_hi
    );
  }

  @inline
  static rem10(value: u128): u128 {
    __udivmod128_10(value.lo, value.hi);
    return new u128(__divmod_rem_lo, __divmod_rem_hi);
  }

  /**
   * Calculate power of base with exponent
   * @param  base     128-bit unsigned integer
   * @param  exponent 32-bit signed integer
   * @returns         128-bit unsigned integer
   */
  @operator('**')
  static pow(base: u128, exponent: i32): u128 {
    // any negative exponent produce zero

    var result = u128.One;

    if (base == result) return result;
    var tmp = base.clone();
    if (exponent <= 1) {
      if (exponent < 0) return u128.Zero;
      return exponent == 0 ? result : tmp;
    }

    if (ASC_SHRINK_LEVEL < 1) {
      var lo = base.lo;
      var hi = base.hi;
      // if base > u64::max and exp > 1 always return "0"
      if (!lo) return u128.Zero;
      if (!hi) {
        let lo1 = lo - 1;
        // "1 ^ exponent" always return "1"
        if (!lo1) return result;

        // if base is power of two do "1 << log2(base) * exp"
        if (!(lo & lo1)) {
          let shift = <i32>(64 - clz(lo1)) * exponent;
          // @ts-ignore
          return shift < 128 ? result << shift : u128.Zero;
        }
      }

      if (exponent <= 4) {
        let baseSq = tmp.sqr();
        switch (exponent) {
          case 2: return baseSq;        // base ^ 2
          // @ts-ignore
          case 3: return baseSq * base; // base ^ 2 * base
          case 4: return baseSq.sqr();  // base ^ 2 * base ^ 2
          default: break;
        }
      }

      let log = 32 - clz(exponent);
      if (log <= 7) {
        // 128 = 2 ^ 7, so need usually only seven cases
        switch (log) {
          case 7:
            // @ts-ignore
            if (exponent & 1) result *= tmp;
            exponent >>= 1;
            tmp.sqr();
          case 6:
            // @ts-ignore
            if (exponent & 1) result *= tmp;
            exponent >>= 1;
            tmp.sqr();
          case 5:
            // @ts-ignore
            if (exponent & 1) result *= tmp;
            exponent >>= 1;
            tmp.sqr();
          case 4:
            // @ts-ignore
            if (exponent & 1) result *= tmp;
            exponent >>= 1;
            tmp.sqr();
          case 3:
            // @ts-ignore
            if (exponent & 1) result *= tmp;
            exponent >>= 1;
            tmp.sqr();
          case 2:
            // @ts-ignore
            if (exponent & 1) result *= tmp;
            exponent >>= 1;
            tmp.sqr();
          case 1:
            // @ts-ignore
            if (exponent & 1) result *= tmp;
        }
        return result;
      }
    }

    while (exponent > 0) {
      // @ts-ignore
      if (exponent & 1) result *= tmp;
      exponent >>= 1;
      tmp.sqr();
    }
    return result;
  }

  // compute floor(sqrt(x))
  static sqrt(value: u128): u128 {
    var rem = value.clone();
    if (value < new u128(2)) {
      return rem;
    }
    var res = u128.Zero;
    // @ts-ignore
    var pos = u128.One << (127 - (u128.clz(value) | 1));
    // @ts-ignore
    while (!pos.isZero()) {
      // @ts-ignore
      value = res + pos;
      if (rem >= value) {
        // @ts-ignore
        rem = rem - value;
        // @ts-ignore
        res = pos + value;
      }
      // @ts-ignore
      res >>= 1;
      pos >>= 2;
    }
    return res;
  }

  @inline @operator('==')
  static eq(a: u128, b: u128): bool {
    return a.hi == b.hi && a.lo == b.lo;
  }

  @inline @operator('!=')
  static ne(a: u128, b: u128): bool {
    return !u128.eq(a, b);
  }

  @inline @operator('<')
  static lt(a: u128, b: u128): bool {
    var ah = a.hi, bh = b.hi;
    return ah == bh ? a.lo < b.lo : ah < bh;
  }

  @inline @operator('>')
  static gt(a: u128, b: u128): bool {
    var ah = a.hi, bh = b.hi;
    return ah == bh ? a.lo > b.lo : ah > bh;
  }

  @inline @operator('<=')
  static le(a: u128, b: u128): bool {
    return !u128.gt(a, b);
  }

  @inline @operator('>=')
  static ge(a: u128, b: u128): bool {
    return !u128.lt(a, b);
  }

   /**
   * Get ordering
   * if a > b then result is  1
   * if a < b then result is -1
   * if a = b then result is  0
   * @param  a 128-bit unsigned integer
   * @param  b 128-bit unsigned integer
   * @returns  32-bit signed integer
   */
  @inline
  static ord(a: u128, b: u128): i32 {
    var dlo = a.lo - b.lo;
    var dhi = a.hi - b.hi;
    var cmp = <i32>select<i64>(dhi, dlo, dhi != 0);
    // normalize to [-1, 0, 1]
    return i32(cmp > 0) - i32(cmp < 0);
  }

  /**
   * Compute count of set (populated) bits
   * @param  value 128-bit unsigned integer
   * @returns      32-bit signed integer
   */
  @inline
  static popcnt(value: u128): i32 {
    return <i32>(popcnt(value.lo) + popcnt(value.hi));
  }

  /**
   * Compute bit count of leading zeros
   * @param  value 128-bit unsigned integer
   * @returns      32-bit signed integer
   */
  @inline
  static clz(value: u128): i32 {
    return __clz128(value.lo, value.hi);
  }

  /**
   * Compute bit count of trailing zeros
   * @param  value 128-bit unsigned integer
   * @returns      32-bit signed integer
   */
  @inline
  static ctz(value: u128): i32 {
    return __ctz128(value.lo, value.hi);
  }

  /**
   * Calculate squared value (value ** 2)
   * @param  value 128-bit unsigned integer
   * @returns      128-bit unsigned integer
   */
  @inline
  static sqr(value: u128): u128 {
    return value.clone().sqr();
  }

  /**
   * Calculate inplace squared 128-bit unsigned integer (this ** 2)
   * @returns 128-bit unsigned integer
   */
  sqr(): this {
    var u = this.lo,
        v = this.hi;

    var u1 = u & 0xFFFFFFFF;
    var t  = u1 * u1;
    var w  = t & 0xFFFFFFFF;
    var k  = t >> 32;

    u >>= 32;
    var m = u * u1;
    t = m + k;
    var w1 = t >> 32;

    t = m + (t & 0xFFFFFFFF);

    var lo = (t << 32) + w;
    var hi  = u * u;
        hi += w1 + (t >> 32);
        hi += u * v << 1;

    this.lo = lo;
    this.hi = hi;

    return this;
  }

  /**
   * Calculate multiply and division as `number * numerator / denominator`
   * without overflow in multiplication part.
   *
   * @returns 128-bit unsigned integer
   */
  static muldiv(number: u128, numerator: u128, denominator: u128): u128 {
    let a = number;
    let b = numerator;
    let c = denominator;

    let ql = __udivmod128(b.lo, b.hi, c.lo, c.hi);

    let qn = new u128(ql, __divmod_quot_hi);             // b / c
    let rn = new u128(__divmod_rem_lo, __divmod_rem_hi); // b % c

    let q = u128.Zero;
    let r = u128.Zero;
    let n = a.clone();

    while (!n.isZero()) {
      if (n.lo & 1) {
        // @ts-ignore
        q += qn;
        // @ts-ignore
        r += rn;
        if (r >= c) {
          // @ts-ignore
          ++q;
          // @ts-ignore
          r -= c;
        }
      }
      // @ts-ignore
      n >>= 1;
      // @ts-ignore
      qn <<= 1;
      // @ts-ignore
      rn <<= 1;

      if (rn >= c) {
        // @ts-ignore
        ++qn;
        // @ts-ignore
        rn -= c;
      }
    }
    return q;
  }

  /**
  * Convert to 256-bit signed integer
  * @returns 256-bit signed integer
  */
  @inline
  toI256(): i256 {
    return new i256(this.lo, this.hi);
  }

  /**
  * Convert to 256-bit unsigned integer
  * @returns 256-bit unsigned integer
  */
  @inline
  toU256(): u256 {
    return new u256(this.lo, this.hi);
  }

  /**
  * Convert to 128-bit signed integer
  * @returns 128-bit signed integer
  */
  @inline
  toI128(): i128 {
    return new i128(this.lo, this.hi);
  }

  /**
  * Convert to 128-bit unsigned integer
  * @returns 128-bit unsigned integer
  */
  @inline
  toU128(): this {
    return this;
  }

  /**
  * Convert to 64-bit signed integer
  * @returns 64-bit signed integer
  */
  @inline
  toI64(): i64 {
    return <i64>(
      (this.lo & 0x7FFFFFFFFFFFFFFF) |
      (this.hi & 0x8000000000000000)
    );
  }

  /**
  * Convert to 64-bit unsigned integer
  * @returns 64-bit unsigned integer
  */
  @inline
  toU64(): u64 {
    return this.lo;
  }

  /**
  * Convert to 32-bit signed integer
  * @returns 32-bit signed integer
  */
  @inline
  toI32(): i32 {
    return <i32>this.toI64();
  }

  /**
  * Convert to 32-bit unsigned integer
  * @returns 32-bit unsigned integer
  */
  @inline
  toU32(): u32 {
    return <u32>this.lo;
  }

  /**
  * Convert to 1-bit boolean
  * @returns 1-bit boolean
  */
  @inline
  toBool(): bool {
    return (this.lo | this.hi) != 0;
  }

  /**
  * Convert to 64-bit float number in deteministic way
  * @returns 64-bit float
  */
  @inline
  toF64(): f64 {
    return __floatuntidf(this.lo, this.hi);
  }

  /**
  * Convert to 32-bit float number
  * @returns 32-bit float
  */
  @inline
  toF32(): f32 {
    return <f32>this.toF64();
  }

  /**
   * Convert to generic type `T`. Useful inside other generics methods
   * @param  T  is <bool | i8 | u8 | i16 | u16 | i32 | u32 | i64 | u64 | f32 | f64 | i128 | u128 | u256 | u8[] | Uint8Array | `StaticArray<u8>` | string>
   * @returns   type of `T`
   */
  @inline
  as<T>(): T {
    if (isBoolean<T>()) {
      return <T>this.toBool();
    }
    else if (isInteger<T>()) {
      if (isSigned<T>()) {
        // i8, i16, i32, i64
        return <T>this.toI64();
      } else {
        // u8, u16, u32, u64
        return <T>this.toU64();
      }
    }
    else if (isFloat<T>()) {
      // f32, f64
      return <T>this.toF64();
    }
    else if (isString<T>()) {
      return <T>this.toString();
    }
    else if (isReference<T>()) {
      let dummy = changetype<T>(0);
           if (dummy instanceof u8[]) return <T>this.toBytes();
      else if (dummy instanceof StaticArray<u8>) return <T>this.toStaticBytes();
      else if (dummy instanceof Uint8Array) return <T>this.toUint8Array();
      else if (dummy instanceof i128) return <T>this.toI128();
      else if (dummy instanceof u128) return <T>this;
      else if (dummy instanceof u256) return <T>this.toU256();
      else throw new TypeError('Unsupported generic type');
    }
    else throw new TypeError('Unsupported generic type');
  }

  @inline
  private toArrayBufferLE(buffer: usize): void {
    store<u64>(buffer, this.lo, 0 * sizeof<u64>());
    store<u64>(buffer, this.hi, 1 * sizeof<u64>());
  }

  @inline
  private toArrayBufferBE(buffer: usize): void {
    store<u64>(buffer, bswap(this.hi), 0 * sizeof<u64>());
    store<u64>(buffer, bswap(this.lo), 1 * sizeof<u64>());
  }

  @inline
  private toArrayBuffer(buffer: usize, bigEndian: bool = false): void {
    if (bigEndian) {
      this.toArrayBufferBE(buffer);
    } else {
      this.toArrayBufferLE(buffer);
    }
  }

  /**
   * Convert to byte array
   * @param bigEndian Little or Big Endian? Default: false
   * @returns  Array of bytes
   */
  @inline
  toBytes(bigEndian: bool = false): u8[] {
    var result = new Array<u8>(16);
    this.toArrayBuffer(result.dataStart, bigEndian);
    return result;
  }

    /**
   * Convert to byte static array
   * @param bigEndian Little or Big Endian? Default: false
   * @returns  StaticArray of bytes
   */
    @inline
    toStaticBytes(bigEndian: bool = false): StaticArray<u8> {
      var result = new StaticArray<u8>(16);
      this.toArrayBuffer(changetype<usize>(result), bigEndian);
      return result;
    }

  /**
   * Convert to Uint8Array
   * @param bigEndian Little or Big Endian? Default: false
   * @returns  Uint8Array
   */
  @inline
  toUint8Array(bigEndian: bool = false): Uint8Array {
    var result = new Uint8Array(16);
    this.toArrayBuffer(result.dataStart, bigEndian);
    return result;
  }

  /**
  * Return copy of current 128-bit value
  * @returns 128-bit unsigned integer
  */
  clone(): u128 {
    return new u128(this.lo, this.hi);
  }

  toString(radix: i32 = 10): string {
    assert(radix == 10 || radix == 16, 'radix argument must be between 10 or 16');
    if (this.isZero()) return '0';

    var result = '';
    if (radix == 16) {
      let shift: i32 = 124 - (u128.clz(this) & ~3);
      while (shift >= 0) {
        // @ts-ignore
        result += HEX_CHARS.charAt(<i32>((this >> shift).lo & 15));
        shift  -= 4;
      }
      return result;
    }
    return u128toDecimalString(this);
  }
}


class i128 {

  @inline static get Zero(): i128 { return new i128(); }
  @inline static get One():  i128 { return new i128(1); }
  @inline static get Min():  i128 { return new i128(0, 0x8000000000000000); }
  @inline static get Max():  i128 { return new i128(u64.MAX_VALUE, 0x7FFFFFFFFFFFFFFF); }

  @inline
  static fromString(value: string, radix: i32 = 10): i128 {
    return changetype<i128>(atou128(value, radix));
  }

  @inline
  static fromI256(value: i256): i128 {
    return new i128(value.lo1, value.lo2);
  }

  @inline
  static fromU256(value: u256): i128 {
    return new i128(value.lo1, <i64>value.lo2);
  }

  @inline
  static fromI128(value: i128): i128 {
    return new i128(value.lo, value.hi);
  }

  @inline
  static fromU128(value: u128): i128 {
    return new i128(value.lo, <i64>value.hi);
  }

  @inline
  static fromI64(value: i64): i128 {
    return new i128(<u64>value, value >> 63);
  }

  @inline
  static fromU64(value: u64): i128 {
    return new i128(value);
  }

  // TODO need improvement
  // max safe uint for f64 actually 53-bits
  @inline
  static fromF64(value: f64): i128 {
    return new i128(<u64>value, reinterpret<i64>(value) >> 63);
  }

  // TODO need improvement
  // max safe int for f32 actually 23-bits
  @inline
  static fromF32(value: f32): i128 {
    return new i128(<u64>value, <i64>(reinterpret<i32>(value) >> 31));
  }

  @inline
  static fromI32(value: i32): i128 {
    return new i128(<u64>value, <i64>(value >> 31));
  }

  @inline
  static fromU32(value: u32): i128 {
    return new i128(<u64>value);
  }

  @inline
  static fromBits(lo1: i32, lo2: i32, hi1: i32, hi2: i32): i128 {
    return new i128(
      <u64>lo1 | ((<u64>lo2) << 32),
      <i64>hi1 | ((<i64>hi2) << 32),
    );
  }

  @inline
  static fromBytes<T>(array: T, bigEndian: bool = false): i128 {
    if (array instanceof u8[]) {
      return bigEndian
        // @ts-ignore
        ? i128.fromBytesBE(<u8[]>array)
        // @ts-ignore
        : i128.fromBytesLE(<u8[]>array);
    } else if (array instanceof Uint8Array) {
      return bigEndian
        ? i128.fromUint8ArrayBE(<Uint8Array>array)
        : i128.fromUint8ArrayLE(<Uint8Array>array);
    } else {
      throw new TypeError("Unsupported generic type");
    }
  }

  @inline
  static fromBytesLE(array: u8[]): i128 {
    return i128.fromUint8ArrayLE(changetype<Uint8Array>(array));
  }

  @inline
  static fromBytesBE(array: u8[]): i128 {
    return i128.fromUint8ArrayBE(changetype<Uint8Array>(array));
  }

  @inline
  static fromUint8ArrayLE(array: Uint8Array): i128 {
    assert(array.length && (array.length & 15) == 0);
    var buffer = array.dataStart;
    return new i128(
      load<u64>(buffer, 0 * sizeof<u64>()),
      load<u64>(buffer, 1 * sizeof<u64>())
    );
  }

  static fromUint8ArrayBE(array: Uint8Array): i128 {
    assert(array.length && (array.length & 15) == 0);
    var buffer = array.dataStart;
    return new i128(
      bswap<u64>(load<u64>(buffer, 1 * sizeof<u64>())),
      bswap<u64>(load<u64>(buffer, 0 * sizeof<u64>()))
    );
  }

  /**
   * Create 128-bit signed integer from generic type T
   * @param  value
   * @return 128-bit signed integer
   */
  @inline
  static from<T>(value: T): i128 {
         if (value instanceof bool) { return i128.fromU64(<u64>value); }
    else if (value instanceof i8)   { return i128.fromI64(<i64>value); }
    else if (value instanceof u8)   { return i128.fromU64(<u64>value); }
    else if (value instanceof i16)  { return i128.fromI64(<i64>value); }
    else if (value instanceof u16)  { return i128.fromU64(<u64>value); }
    else if (value instanceof i32)  { return i128.fromI64(<i64>value); }
    else if (value instanceof u32)  { return i128.fromU64(<u64>value); }
    else if (value instanceof i64)  { return i128.fromI64(<i64>value); }
    else if (value instanceof u64)  { return i128.fromU64(<u64>value); }
    else if (value instanceof f32)  { return i128.fromF64(<f64>value); }
    else if (value instanceof f64)  { return i128.fromF64(<f64>value); }
    else if (value instanceof i128) { return i128.fromI128(<i128>value); }
    else if (value instanceof u128) { return i128.fromU128(<u128>value); }
    else if (value instanceof i256) { return i128.fromI256(<i256>value); }
    else if (value instanceof u256) { return i128.fromU256(<u256>value); }
    else if (value instanceof u8[]) { return i128.fromBytes(<u8[]>value); }
    else { throw new TypeError("Unsupported generic type"); }
  }

  constructor(
    public lo: u64 = 0,
    public hi: i64 = 0,
  ) {}

  @inline
  isPos(): bool {
    return this.hi >= 0;
  }

  @inline
  isNeg(): bool {
    return this.hi < 0;
  }

  @inline
  isZero(): bool {
    return !(this.lo | this.hi);
  }

  @inline @operator.prefix('~')
  not(): i128 {
    return new i128(~this.lo, ~this.hi);
  }

  @inline @operator.prefix('+')
  pos(): i128 {
    return this;
  }

  @inline @operator.prefix('-')
  neg(): i128 {
    var lo = ~this.lo;
    var hi = ~this.hi;
    var lo1 = lo + 1;
    return new i128(lo1, hi + i64(lo1 < 0));
  }

  @inline @operator.prefix('!')
  static isEmpty(value: i128): bool {
    return value.isZero();
  }

  @inline @operator('|')
  static or(a: i128, b: i128): i128 {
    return new i128(a.lo | b.lo, a.hi | b.hi);
  }

  @inline @operator('^')
  static xor(a: i128, b: u128): i128 {
    return new i128(a.lo ^ b.lo, a.hi ^ b.hi);
  }

  @inline @operator('&')
  static and(a: i128, b: i128): i128 {
    return new i128(a.lo & b.lo, a.hi & b.hi);
  }

  @inline @operator('<<')
  static shl(value: i128, shift: i32): i128 {
    shift &= 127;

    // need for preventing redundant i32 -> u64 extends
    var shift64: i64 = shift;

    var mod1: i64 = ((((shift64 + 127) | shift64) & 64) >>> 6) - 1;
    var mod2: i64 = (shift64 >>> 6) - 1;

    shift64 &= 63;

    var vl = value.lo;
    var lo = vl << shift64;
    var hi = lo & ~mod2;

    hi |= ((value.hi << shift64) | ((vl >>> (64 - shift64)) & mod1)) & mod2;

    return new i128(lo & mod2, hi);
  }

  @inline @operator('>>>')
  static shr_u(value: i128, shift: i32): i128 {
    shift &= 127;

    // need for preventing redundant i32 -> u64 extends
    var shift64: i64 = shift;

    var mod1: i64 = ((((shift64 + 127) | shift64) & 64) >>> 6) - 1;
    var mod2: i64 = (shift64 >>> 6) - 1;

    shift64 &= 63;

    var vh = value.hi;
    var hi = vh >>> shift64;
    var lo = hi & ~mod2;

    lo |= ((value.lo >>> shift64) | ((vh << (64 - shift64)) & mod1)) & mod2;

    return new i128(lo, hi & mod2);
  }

  @inline @operator('+')
  static add(a: i128, b: i128): i128 {
    var blo = b.lo;
    var bhi = b.hi;
    var lo = a.lo + blo - (bhi >>> 63);
    var hi = a.hi + bhi + i64(lo < blo);
    return new i128(lo, hi);
  }

  @inline @operator('-')
  static sub(a: i128, b: i128): i128 {
    var alo = a.lo;
    var bhi = b.hi;
    var lo = alo  - b.lo + (bhi >>> 63);
    var hi = a.hi - bhi  - i64(lo > alo);
    return new i128(lo, hi);
  }

  @inline @operator('==')
  static eq(a: i128, b: i128): bool {
    return a.hi == b.hi && a.lo == b.lo;
  }

  @inline @operator('!=')
  static ne(a: i128, b: i128): bool {
    return !i128.eq(a, b);
  }

  @inline @operator('<')
  static lt(a: i128, b: i128): bool {
    var ah = a.hi, bh = b.hi;
    return ah == bh ? a.lo < b.lo : ah < bh;
  }

  @inline @operator('>')
  static gt(a: i128, b: i128): bool {
    var ah = a.hi, bh = b.hi;
    return ah == bh ? a.lo > b.lo : ah > bh;
  }

  @inline @operator('<=')
  static le(a: i128, b: i128): bool {
    return !i128.gt(a, b);
  }

  @inline @operator('>=')
  static ge(a: i128, b: i128): bool {
    return !i128.lt(a, b);
  }

  @inline
  static ord(a: i128, b: i128): i32 {
    var dlo = a.lo - b.lo;
    var dhi = a.hi - b.hi;
    var cmp = <i32>select<i64>(dhi, dlo, dhi != 0);
    // normalize to [-1, 0, 1]
    return i32(cmp > 0) - i32(cmp < 0);
  }

  @inline
  static popcnt(value: i128): i32 {
    return <i32>(popcnt(value.lo) + popcnt(value.hi));
  }

  @inline
  static clz(value: i128): i32 {
    return __clz128(value.lo, value.hi);
  }

  @inline
  static ctz(value: i128): i32 {
    return __ctz128(value.lo, value.hi);
  }

  @inline
  static abs(value: i128): i128 {
    var lo = value.lo;
    var hi = value.hi;
    if (hi >>> 63) {
      lo = -lo;
      hi = ~hi + i64(lo == 0);
    }
    return new i128(lo, hi);
  }

  @inline
  private toArrayBufferLE(buffer: usize): void {
    store<u64>(buffer, this.lo, 0 * sizeof<u64>());
    store<u64>(buffer, this.hi, 1 * sizeof<u64>());
  }

  @inline
  private toArrayBufferBE(buffer: usize): void {
    store<u64>(buffer, bswap<u64>(this.hi), 0 * sizeof<u64>());
    store<u64>(buffer, bswap<u64>(this.lo), 1 * sizeof<u64>());
  }

  @inline
  private toArrayBuffer(buffer: usize, bigEndian: bool = false): void {
    if (bigEndian) {
      this.toArrayBufferBE(buffer);
    } else {
      this.toArrayBufferLE(buffer);
    }
  }

  /**
   * Convert to byte array
   * @param bigEndian Little or Big Endian? Default: false
   * @returns  Array of bytes
   */
   @inline
   toBytes(bigEndian: bool = false): u8[] {
     var result = new Array<u8>(16);
     this.toArrayBuffer(result.dataStart, bigEndian);
     return result;
   }


  /**
   * Convert to byte static array
   * @param bigEndian Little or Big Endian? Default: false
   * @returns  StaticArray of bytes
   */
    @inline
    toStaticBytes(bigEndian: bool = false): StaticArray<u8> {
      var result = new StaticArray<u8>(16);
      this.toArrayBuffer(changetype<usize>(result), bigEndian);
      return result;
    }

   /**
    * Convert to Uint8Array
    * @param bigEndian Little or Big Endian? Default: false
    * @returns  Uint8Array
    */
   @inline
   toUint8Array(bigEndian: bool = false): Uint8Array {
     var result = new Uint8Array(16);
     this.toArrayBuffer(result.dataStart, bigEndian);
     return result;
   }

  // TODO
}


export { i128 as i128Safe };


export { i256 as i256Safe };


export { u256 as u256Safe };


export { u128 as u128Safe };




type MemorySlotPointer = u256;
type MemorySlotData<T> = T;


function bytes(number: u256[]): Uint8Array {
    const result = new Uint8Array(32 * number.length);
    for (let i: u8 = 0; i < 32; i++) {
        const num: Uint8Array = number[31 - i].toUint8Array();
        for (let j: u8 = 0; j < u8(number.length); j++) {
            result[i + j * 32] = num[i];
        }
    }

    return result;
}

function bytes4(number: Uint8Array): u32 {
    return (u32(number[0]) << 24) | (u32(number[1]) << 16) | (u32(number[2]) << 8) | u32(number[3]);
}

function bytes8(number: Uint8Array): u64 {
    return (
        (u64(number[0]) << u64(56)) |
        (u64(number[1]) << u64(48)) |
        (u64(number[2]) << u64(40)) |
        (u64(number[3]) << u64(32)) |
        (u64(number[4]) << 24) |
        (u64(number[5]) << 16) |
        (u64(number[6]) << 8) |
        u64(number[7])
    );
}

function bytes32(number: Uint8Array): u256 {
    return u256.fromBytes(number);
}
// @ts-ignore
@external('env', 'load')
declare function loadPointer(data: Uint8Array): Uint8Array;

// @ts-ignore
@external('env', 'store')
declare function storePointer(data: Uint8Array): Uint8Array;

// @ts-ignore
@external('env', 'deploy')
declare function deploy(data: Uint8Array): Uint8Array;

// @ts-ignore
@external('env', 'deployFromAddress')
declare function deployFromAddress(data: Uint8Array): Uint8Array;

// @ts-ignore
@external('env', 'call')
declare function callContract(data: Uint8Array): Uint8Array;

// @ts-ignore
@external('env', 'log')
declare function log(data: Uint8Array): void;

// @ts-ignore
@external('env', 'encodeAddress')
declare function encodeAddress(data: Uint8Array): Uint8Array;


// @ts-ignore
@external('env', 'sha256')
declare function sha256(data: Uint8Array): Uint8Array;


class Sha256 {
    static hash(buffer: Uint8Array): Uint8Array {
        return sha256(buffer);
    }

    static hash256(buffer: Uint8Array): Uint8Array {
        const hash = sha256(buffer);
        return sha256(hash);
    }
}


type Selector = u32;

function encodeSelector(name: string): Selector {
    const typed = Uint8Array.wrap(String.UTF8.encode(name));
    const hash = Sha256.hash(typed);

    return bytes4(hash);
}

function encodePointer(str: string): MemorySlotPointer {
    const typed = Uint8Array.wrap(String.UTF8.encode(str));
    const hash = Sha256.hash(typed);

    return bytes32(hash);
}

function encodePointerHash(pointer: u16, sub: u256): MemorySlotPointer {
    const finalBuffer: Uint8Array = new Uint8Array(34);
    const mergedKey: u8[] = [u8(pointer & u16(0xff)), u8((pointer >> u16(8)) & u16(0xff))];

    for (let i: i32 = 0; i < mergedKey.length; i++) {
        finalBuffer[i] = mergedKey[i];
    }

    const subKey = sub.toUint8Array();
    for (let i: i32 = 0; i < subKey.length; i++) {
        finalBuffer[mergedKey.length + i] = subKey[i];
    }

    return bytes32(Sha256.hash(finalBuffer));
}
class Revert extends Error {
    constructor(msg: string = '') {
        super(`Execution reverted ${msg}`);
    }
}


class Map<K, V> {
    protected _keys: K[] = [];
    protected _values: V[] = [];

    public get size(): i32 {
        return this._keys.length;
    }

    public keys(): K[] {
        return this._keys;
    }

    public values(): V[] {
        return this._values;
    }

    public set(key: K, value: V): void {
        const index: i32 = this.indexOf(key);
        if (index == -1) {
            this._keys.push(key);
            this._values.push(value);
        } else {
            this._values[index] = value;
        }
    }

    public indexOf(key: K): i32 {
        return this._keys.indexOf(key);
    }

    public get(key: K): V {
        const index: i32 = this.indexOf(key);
        if (index == -1) {
            throw new Revert('Key not found in map');
        }
        return this._values[index];
    }

    public has(key: K): bool {
        for (let i: i32 = 0; i < this._keys.length; i++) {
            if (this._keys[i] == key) {
                return true;
            }
        }

        return false;
    }

    public delete(key: K): bool {
        const index: i32 = this.indexOf(key);
        if (index == -1) {
            return false;
        }
        this._keys.splice(index, 1);
        this._values.splice(index, 1);
        return true;
    }

    public clear(): void {
        this._keys = [];
        this._values = [];
    }
}


@final
class BytesReader {
    private readonly buffer: DataView;

    private currentOffset: i32 = 0;

    constructor(bytes: Uint8Array) {
        this.buffer = new DataView(bytes.buffer);
    }

    public readU8(): u8 {
        this.verifyEnd(this.currentOffset + 1);

        return this.buffer.getUint8(this.currentOffset++);
    }

    public readU16(): u16 {
        this.verifyEnd(this.currentOffset + 2);

        const value = this.buffer.getUint16(this.currentOffset, true);
        this.currentOffset += 2;

        return value;
    }

    public readU32(le: boolean = true): u32 {
        this.verifyEnd(this.currentOffset + 4);

        const value = this.buffer.getUint32(this.currentOffset, le);
        this.currentOffset += 4;
        return value;
    }

    public readU64(): u64 {
        this.verifyEnd(this.currentOffset + 8);

        const value = this.buffer.getUint64(this.currentOffset, true);
        this.currentOffset += 8;

        return value;
    }

    public readU256(): u256 {
        const next32Bytes: u8[] = [];
        for (let i = 0; i < 32; i++) {
            next32Bytes[i] = this.readU8();
        }

        return u256.fromBytesBE(next32Bytes);
    }

    public readBytes(length: u32, zeroStop: boolean = false): Uint8Array {
        let bytes: Uint8Array = new Uint8Array(length);
        for (let i: u32 = 0; i < length; i++) {
            const byte: u8 = this.readU8();
            if (zeroStop && byte === 0) {
                bytes = bytes.slice(0, i);
                break;
            }

            bytes[i] = byte;
        }

        return bytes;
    }

    public readMultiBytesAddressMap(): Map<Address, Uint8Array[]> {
        const map: Map<Address, Uint8Array[]> = new Map<Address, Uint8Array[]>();
        const size: u8 = this.readU8();

        if (size > 8) throw new Revert('Too many contract called.');

        for (let i: u8 = 0; i < size; i++) {
            const address: Address = this.readAddress();
            const responseSize: u8 = this.readU8();

            if (responseSize > 10) throw new Revert('Too many calls.');

            const calls: Uint8Array[] = [];
            for (let j: u8 = 0; j < responseSize; j++) {
                const response: Uint8Array = this.readBytesWithLength();
                calls.push(response);
            }

            map.set(address, calls);
        }

        return map;
    }

    public readBytesWithLength(): Uint8Array {
        const length = this.readU32();

        return this.readBytes(length);
    }

    public readString(length: u16): string {
        const bytes = this.readBytes(length, true);

        return String.UTF8.decode(bytes.buffer);
    }

    public readTuple(): u256[] {
        const length = this.readU32();
        const result: u256[] = new Array<u256>(length);

        for (let i: u32 = 0; i < length; i++) {
            result[i] = this.readU256();
        }

        return result;
    }

    public readAddressValueTuple(): Map<Address, u256> {
        const length: u16 = this.readU16();
        const result = new Map<Address, u256>();

        for (let i: u16 = 0; i < length; i++) {
            const address = this.readAddress();
            const value = this.readU256();

            if (result.has(address)) throw new Revert('Duplicate address found in map');

            result.set(address, value);
        }

        return result;
    }

    public readSelector(): Selector {
        return this.readU32(false);
    }

    public readStringWithLength(): string {
        const length = this.readU16();

        return this.readString(length);
    }

    public readBoolean(): boolean {
        return this.readU8() !== 0;
    }

    public readFloat(): f32 {
        const value = this.buffer.getFloat32(this.currentOffset, true);
        this.currentOffset += 4;

        return value;
    }

    public readAddress(): Address {
        return this.readString(ADDRESS_BYTE_LENGTH);
    }

    public getOffset(): i32 {
        return this.currentOffset;
    }

    public setOffset(offset: i32): void {
        this.currentOffset = offset;
    }

    public verifyEnd(size: i32): void {
        if (this.currentOffset > this.buffer.byteLength) {
            throw new Error(`Expected to read ${size} bytes but read ${this.currentOffset} bytes`);
        }
    }

    public readAddressArray(): Address[] {
        const length = this.readU16();
        const result = new Array<Address>(length);

        for (let i: u16 = 0; i < length; i++) {
            result[i] = this.readAddress();
        }

        return result;
    }

    private verifyChecksum(): void {
        const writtenChecksum = this.readU32();

        let checksum: u32 = 0;
        for (let i = 0; i < this.buffer.byteLength; i++) {
            checksum += this.buffer.getUint8(i);
        }

        checksum = checksum % 2 ** 32;

        if (checksum !== writtenChecksum) {
            throw new Error('Invalid checksum for buffer');
        }
    }
}
function cyrb53(str: string, seed: i32 = 0): i64 {
    let h1: i32 = 0xdeadbeef ^ seed;
    let h2: i32 = 0x41c6ce57 ^ seed;
    for (let i: i32 = 0; i < str.length; i++) {
        let ch: i32 = str.charCodeAt(i);
        h1 = (h1 ^ ch) * 2654435761;
        h2 = (h2 ^ ch) * 1597334677;
    }

    h1 = ((h1 ^ (h1 >>> 16)) * 2246822507) ^ ((h2 ^ (h2 >>> 13)) * 3266489909);
    h2 = ((h2 ^ (h2 >>> 16)) * 2246822507) ^ ((h1 ^ (h1 >>> 13)) * 3266489909);

    return 4294967296 * i64((2097151 & h2) >>> 0) + i64(h1 >>> 0);
}

function imul64(a: u64, b: u64): u64 {
    const aLow: u64 = a & 0xffffffff;
    const aHigh: u64 = a >> 32;
    const bLow: u64 = b & 0xffffffff;
    const bHigh: u64 = b >> 32;

    const low: u64 = aLow * bLow;
    const middle1: u64 = (aHigh * bLow) << 32;
    const middle2: u64 = (aLow * bHigh) << 32;
    const high: u64 = (aHigh * bHigh) << 64;

    return low + middle1 + middle2 + high;
}

function cyrb53a(str: u8[], seed: i32 = 0): u64 {
    let h1: u64 = u64(0xdeadbeef ^ seed);
    let h2: u64 = u64(0x41c6ce57 ^ seed);

    for (let i: i32 = 0; i < str.length; i++) {
        let ch: u64 = u64(str[i]);
        h1 = imul64(h1 ^ ch, 0x85ebca77);
        h2 = imul64(h2 ^ ch, 0xc2b2ae3d);
    }

    h1 ^= imul64(h1 ^ (h2 >> 15), 0x735a2d97);
    h2 ^= imul64(h2 ^ (h1 >> 15), 0xcaf649a9);
    h1 ^= h2 >> 16;
    h2 ^= h1 >> 16;

    return (2097152 * (h2 & 0xffffffffffffffff) + (h1 >> 11)) & 0xffffffffffffffff;
}


type PointerStorage = Map<MemorySlotPointer, MemorySlotData<u256>>;
type BlockchainStorage = Map<Address, PointerStorage>;

import { ArrayBuffer } from 'arraybuffer';

export enum BufferDataType {
    U8 = 0,
    U16 = 1,
    U32 = 2,
    U64 = 3,
    U256 = 4,
    ADDRESS = 5,
    STRING = 6,
    BOOLEAN = 7,
}

@final
class BytesWriter {
    private currentOffset: u32 = 0;
    private buffer: DataView;

    private selectorDatatype: u8[] = [];

    constructor(
        length: i32 = 1,
        private readonly trackDataTypes: boolean = false,
    ) {
        const arrayBuffer = new ArrayBuffer(length);

        this.buffer = new DataView(arrayBuffer);
    }

    public bufferLength(): u32 {
        return this.buffer.byteLength;
    }

    public writeU8(value: u8): void {
        if (this.trackDataTypes) this.selectorDatatype.push(u8(BufferDataType.U8));

        this.allocSafe(1);
        this.buffer.setUint8(this.currentOffset++, value);
    }

    public writeU16(value: u16): void {
        if (this.trackDataTypes) this.selectorDatatype.push(u8(BufferDataType.U16));

        this.allocSafe(2);
        this.buffer.setUint16(this.currentOffset, value, true);
        this.currentOffset += 2;
    }

    public writeU32(value: u32, le: boolean = true): void {
        if (this.trackDataTypes) this.selectorDatatype.push(u8(BufferDataType.U32));

        this.allocSafe(4);
        this.buffer.setUint32(this.currentOffset, value, le);
        this.currentOffset += 4;
    }

    public writeU64(value: u64): void {
        if (this.trackDataTypes) this.selectorDatatype.push(u8(BufferDataType.U64));

        this.allocSafe(8);
        this.buffer.setUint64(this.currentOffset, value || 0, true);
        this.currentOffset += 8;
    }

    public writeAddressArray(value: Address[]): void {
        if (value.length > 65535) throw new Revert('Array size is too large');

        this.writeU16(value.length);

        for (let i: i32 = 0; i < value.length; i++) {
            this.writeAddress(value[i]);
        }
    }

    public writeStorage(storage: BlockchainStorage): void {
        this.writeU32(storage.size);

        const keys: Address[] = storage.keys();
        const values: PointerStorage[] = storage.values();

        for (let i: i32 = 0; i < keys.length; i++) {
            const address: Address = keys[i];
            const storage: PointerStorage = values[i];

            this.writeAddress(address);

            const subKeys: MemorySlotPointer[] = storage.keys();
            const subValues: MemorySlotData<u256>[] = storage.values();

            this.writeU32(subKeys.length);

            for (let j: i32 = 0; j < subKeys.length; j++) {
                const pointer: MemorySlotPointer = subKeys[j];
                const value: MemorySlotData<u256> = subValues[j];

                this.writeU256(pointer);
                this.writeU256(value);
            }
        }
    }

    public writeSelector(value: Selector): void {
        this.writeU32(value, false);
    }

    public writeBoolean(value: boolean): void {
        if (this.trackDataTypes) this.selectorDatatype.push(u8(BufferDataType.BOOLEAN));

        this.writeU8(value ? 1 : 0);
    }

    public writeU256(value: u256): void {
        if (this.trackDataTypes) this.selectorDatatype.push(u8(BufferDataType.U256));
        this.allocSafe(32);

        const bytes = value.toUint8Array(true);
        for (let i: i32 = 0; i < 32; i++) {
            this.writeU8(bytes[i] || 0);
        }
    }

    public writeTuple(value: u256[]): void {
        this.allocSafe(4 + value.length * 32);
        this.writeU32(u32(value.length));

        for (let i = 0; i < value.length; i++) {
            this.writeU256(value[i]);
        }
    }

    public writeBytes(value: Uint8Array): void {
        this.allocSafe(value.length);

        for (let i = 0; i < value.length; i++) {
            this.writeU8(value[i]);
        }
    }

    public writeBytesU8Array(value: u8[]): void {
        this.allocSafe(value.length);

        for (let i = 0; i < value.length; i++) {
            this.writeU8(value[i]);
        }
    }

    public writeBytesWithLength(value: Uint8Array): void {
        const length: u32 = u32(value.byteLength);

        this.allocSafe(length + 4);
        this.writeU32(length);

        for (let i: u32 = 0; i < length; i++) {
            this.writeU8(value[i]);
        }
    }

    public writeString(value: string): void {
        if (this.trackDataTypes) this.selectorDatatype.push(u8(BufferDataType.STRING));

        for (let i: i32 = 0; i < value.length; i++) {
            this.writeU8(u8(value.charCodeAt(i)));
        }
    }

    public writeAddress(value: Address): void {
        if (this.trackDataTypes) this.selectorDatatype.push(u8(BufferDataType.ADDRESS));

        const bytes = this.fromAddress(value);
        this.writeBytes(bytes);
    }

    public writeStringWithLength(value: string): void {
        this.writeU16(u16(value.length));

        this.writeString(value);
    }

    public writeViewSelectorMap(map: SelectorsMap): void {
        this.writeU16(u16(map.size));

        const keys = map.keys();
        for (let i = 0; i < keys.length; i++) {
            const key: u32 = keys[i] as u32;
            const value = map.get(key);

            this.writeBytes(value);
        }
    }

    public writeAddressValueTupleMap(map: Map<Address, u256>): void {
        if (map.size > 65535) throw new Revert('Map size is too large');
        this.writeU16(u16(map.size));

        const keys = map.keys();
        for (let i = 0; i < keys.length; i++) {
            const key: Address = keys[i];
            const value: u256 = map.get(key) || u256.Zero;

            this.writeAddress(key);
            this.writeU256(value);
        }
    }

    public writeLimitedAddressBytesMap(map: Map<Address, Uint8Array[]>): void {
        if (map.size > 8) throw new Revert('Too many contract called.'); // no more than 8 different contracts.

        this.writeU8(u8(map.size));

        const keys: Address[] = map.keys();
        for (let i: i32 = 0; i < keys.length; i++) {
            const address: Address = keys[i];
            const calls: Uint8Array[] = map.get(address) || [];

            if (calls.length > 10) throw new Revert('Too many calls.'); // no more than 16 different calls.

            this.writeAddress(address);
            this.writeU8(u8(calls.length));

            for (let j: i32 = 0; j < calls.length; j++) {
                this.writeBytesWithLength(calls[j]);
            }
        }
    }

    public writeMethodSelectorsMap(map: Selector[]): void {
        this.writeU16(u16(map.length));

        for (let i = 0; i < map.length; i++) {
            this.writeSelector(map[i]);
        }
    }

    public getBuffer(clear: boolean = false): Uint8Array {
        const buf = Uint8Array.wrap(
            this.buffer.buffer,
            this.buffer.byteOffset,
            this.buffer.byteLength,
        );

        if (clear) this.clear();

        return buf;
    }

    public toBytesReader(): BytesReader {
        return new BytesReader(this.getBuffer());
    }

    public getOffset(): u32 {
        return this.currentOffset;
    }

    public setOffset(offset: u32): void {
        this.currentOffset = offset;
    }

    public clear(): void {
        this.currentOffset = 0;
        this.buffer = this.getDefaultBuffer();
        this.selectorDatatype = [];
    }

    public allocSafe(size: u32): void {
        if (this.currentOffset + size > u32(this.buffer.byteLength)) {
            const sizeDiff: u32 = size - (u32(this.buffer.byteLength) - this.currentOffset);

            this.resize(sizeDiff);
        }
    }

    public writeABISelector(name: string, selector: Selector): void {
        this.writeStringWithLength(name);
        this.writeSelector(selector);
    }

    public getSelectorDataType(): u64 {
        let hash: u64 = 0;
        if (this.selectorDatatype.length === 0) return hash;

        return cyrb53a(this.selectorDatatype);
    }

    private getChecksum(): u32 {
        let checksum: u32 = 0;
        for (let i = 0; i < this.buffer.byteLength; i++) {
            checksum += this.buffer.getUint8(i);
        }

        return checksum % 2 ** 32;
    }

    private writeMethodSelectorMap(value: Set<Selector>): void {
        this.writeU16(u16(value.size));

        const keys = value.values();
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            this.writeSelector(key);
        }
    }

    private min(value1: i32, value2: i32): i32 {
        return value1 < value2 ? value1 : value2;
    }

    private fromAddress(value: Address): Uint8Array {
        if (value.length > i32(ADDRESS_BYTE_LENGTH)) {
            throw new Revert(`Address is too long ${value.length} > ${ADDRESS_BYTE_LENGTH} bytes`);
        }

        const length: i32 = this.min(value.length + 1, ADDRESS_BYTE_LENGTH);
        const bytes: Uint8Array = new Uint8Array(length);
        for (let i: i32 = 0; i < value.length; i++) {
            bytes[i] = value.charCodeAt(i);
        }

        if (value.length < i32(ADDRESS_BYTE_LENGTH)) {
            bytes[value.length] = 0;
        }

        return bytes;
    }

    private resize(size: u32): void {
        const buf: Uint8Array = new Uint8Array(u32(this.buffer.byteLength) + size);

        for (let i: i32 = 0; i < this.buffer.byteLength; i++) {
            buf[i] = this.buffer.getUint8(i);
        }

        this.buffer = new DataView(buf.buffer);
    }

    private getDefaultBuffer(length: i32 = 1): DataView {
        return new DataView(new ArrayBuffer(length));
    }
}


type Calldata = NonNullable<BytesReader>;
type SelectorsMap = Map<u32, Uint8Array>;

class ABIRegistryBase {
    private methodMap: Selector[] = [];
    private selectors: SelectorsMap = new Map();

    private viewSelectors: Selector[] = [];
    private allowedWriteMethods: Selector[] = [];

    // Register properties with their selectors and handlers
    public defineGetterSelector(name: string, canWrite: boolean): void {
        const selector: Selector = encodeSelector(name);

        const selectorWriter: BytesWriter = new BytesWriter();
        selectorWriter.writeABISelector(name, selector);

        if (!this.selectors.has(selector)) {
            this.selectors.set(selector, selectorWriter.getBuffer());
        }

        if (canWrite) this.addToWriteMethods(selector);

        if (!this.viewSelectors.includes(selector)) {
            this.viewSelectors.push(selector);
        }
    }

    public getViewSelectors(): Uint8Array {
        const writer: BytesWriter = new BytesWriter();
        writer.writeViewSelectorMap(this.selectors);

        return writer.getBuffer();
    }

    public getMethodSelectors(): Uint8Array {
        const writer: BytesWriter = new BytesWriter();
        writer.writeMethodSelectorsMap(this.methodMap);

        return writer.getBuffer();
    }

    public getWriteMethods(): Uint8Array {
        const writer: BytesWriter = new BytesWriter();
        writer.writeMethodSelectorsMap(this.allowedWriteMethods);

        return writer.getBuffer();
    }

    // Register methods with their selectors and handlers
    public defineMethodSelector(name: string, canWrite: boolean): void {
        const selector: u32 = encodeSelector(name);
        if (canWrite) this.addToWriteMethods(selector);

        if (!this.methodMap.includes(selector)) {
            this.methodMap.push(selector);
        }
    }

    private addToWriteMethods(selector: Selector): void {
        if (!this.allowedWriteMethods.includes(selector)) {
            this.allowedWriteMethods.push(selector);
        }
    }
}

const ABIRegistry = new ABIRegistryBase();


const MAX_EVENT_DATA_SIZE: u32 = 352; // 352 bytes max per event.
const MAX_EVENTS: u16 = 1000; // 1000 events max per transactions.

abstract class NetEvent {
    protected constructor(
        public readonly eventType: string,
        protected data: BytesWriter,
    ) {}

    public get length(): u32 {
        return this.data.bufferLength();
    }

    public getEventDataSelector(): u64 {
        return this.data.getSelectorDataType();
    }

    public getEventData(): Uint8Array {
        if (this.data.bufferLength() > MAX_EVENT_DATA_SIZE) {
            throw new Error('Event data length exceeds maximum length.');
        }

        return this.data.getBuffer();
    }
}


interface IBTC {
    readonly owner: Address;
    readonly address: Address;
}


@final
class StoredBoolean {
    constructor(
        public pointer: u16,
        private defaultValue: bool,
    ) {}

    private _value: u256 = u256.Zero;

    @inline
    public get value(): bool {
        this.ensureValue();

        return this._value.toBool();
    }

    @inline
    public set value(value: bool) {
        this._value = value ? u256.One : u256.Zero;

        Blockchain.setStorageAt(this.pointer, u256.Zero, this._value);
    }

    @inline
    public set(value: u256): this {
        this._value = value;

        Blockchain.setStorageAt(this.pointer, u256.Zero, this._value);

        return this;
    }

    @inline
    public toUint8Array(): Uint8Array {
        return this._value.toUint8Array(true);
    }

    private ensureValue(): void {
        this._value = Blockchain.getStorageAt(
            this.pointer,
            u256.Zero,
            this.defaultValue ? u256.One : u256.Zero,
        );
    }
}


class OP_NET implements IBTC {
    protected readonly instantiated: StoredBoolean = new StoredBoolean(
        Blockchain.nextPointer,
        false,
    );

    constructor() {}

    public get address(): string {
        return Blockchain.contractAddress;
    }

    public get owner(): string {
        return Blockchain.owner;
    }

    public get isInstantiated(): bool {
        return this.instantiated.value;
    }

    public onInstantiated(): void {
        if (!this.isInstantiated) {
            this.instantiated.value = true;
        }
    }

    public callMethod(method: Selector, _calldata: Calldata): BytesWriter {
        switch (method) {
            default:
                throw new Revert('Method not found');
        }
    }

    public callView(method: Selector): BytesWriter {
        const response = new BytesWriter();

        switch (method) {
            case encodeSelector('address'):
                response.writeAddress(this.address);
                break;
            case encodeSelector('owner'):
                response.writeAddress(this.owner);
                break;
            default:
                throw new Revert('Method not found');
        }

        return response;
    }

    protected emitEvent(event: NetEvent): void {
        if (event.length > MAX_EVENT_DATA_SIZE) {
            throw new Error('Event data length exceeds maximum length.');
        }

        Blockchain.addEvent(event);
    }

    protected isSelf(address: Address): boolean {
        return this.address === address;
    }

    protected onlyOwner(caller: Address): void {
        if (this.owner !== caller) {
            throw new Revert('Only owner can call this method');
        }
    }
}


class DeployContractResponse {
    readonly virtualAddress: u256;
    readonly contractAddress: Address;

    constructor(virtualAddress: u256, contractAddress: Address) {
        this.virtualAddress = virtualAddress;
        this.contractAddress = contractAddress;
    }
}


class MapU256 extends Map<u256, u256> {
    public set(key: u256, value: u256): void {
        const index: i32 = this._keys.indexOf(key);
        if (index == -1) {
            this._keys.push(key);
            this._values.push(value);
        } else {
            this._values[index] = value;
        }
    }

    public indexOf(pointerHash: u256): i32 {
        for (let i: i32 = 0; i < this._keys.length; i++) {
            const key = this._keys[i];

            if (u256.eq(key, pointerHash)) {
                return i;
            }
        }

        return -1;
    }

    public has(key: u256): bool {
        for (let i: i32 = 0; i < this._keys.length; i++) {
            if (u256.eq(this._keys[i], key)) {
                return true;
            }
        }

        return false;
    }

    public get(key: u256): u256 {
        const index: i32 = this.indexOf(key);
        if (index == -1) {
            throw new Revert('Key not found in map');
        }
        return this._values[index];
    }

    public delete(key: u256): bool {
        const index: i32 = this.indexOf(key);
        if (index == -1) {
            return false;
        }

        this._keys.splice(index, 1);
        this._values.splice(index, 1);

        return true;
    }
}


@final
class BlockchainEnvironment {
    private static readonly MAX_U16: u16 = 65535;
    private static readonly runtimeException: string = 'RuntimeException';
    public readonly DEAD_ADDRESS: Address = 'bc1dead';
    private storage: PointerStorage = new MapU256();
    private events: NetEvent[] = [];
    private currentBlock: u256 = u256.Zero;

    private _selfContract: Potential<OP_NET> = null;

    constructor() {}

    private _txOrigin: PotentialAddress = null;

    public get txOrigin(): Address {
        if (!this._txOrigin) {
            throw this.error('Callee is required');
        }

        return this._txOrigin as Address;
    }

    private _msgSender: PotentialAddress = null;

    public get msgSender(): Address {
        if (!this._msgSender) {
            throw this.error('Caller is required');
        }

        return this._msgSender as Address;
    }

    private _timestamp: u64 = 0;

    public get timestamp(): u64 {
        return this._timestamp;
    }

    private _contract: Potential<() => OP_NET> = null;

    public get contract(): OP_NET {
        if (!this._contract) {
            throw this.error('Contract is required');
        }

        if (!this._selfContract) {
            this._selfContract = this._contract();
        }

        return this._selfContract as OP_NET;
    }

    public set contract(contract: () => OP_NET) {
        this._contract = contract;
    }

    private _nextPointer: u16 = 0;

    public get nextPointer(): u16 {
        if (this._nextPointer === BlockchainEnvironment.MAX_U16) {
            throw this.error(`Out of storage pointer.`);
        }

        this._nextPointer += 1;

        return this._nextPointer;
    }

    public _owner: Potential<Address> = null;

    public get owner(): Address {
        if (!this._owner) {
            throw this.error('Owner is required');
        }

        return this._owner as Address;
    }

    public _contractAddress: Potential<Address> = null;

    public get contractAddress(): Address {
        if (!this._contractAddress) {
            throw this.error('Contract address is required');
        }

        return this._contractAddress as Address;
    }

    public get blockNumber(): u256 {
        return this.currentBlock;
    }

    public get blockNumberU64(): u64 {
        return this.currentBlock.toU64();
    }

    public setEnvironment(data: Uint8Array): void {
        const reader: BytesReader = new BytesReader(data);

        this._msgSender = reader.readAddress();
        this._txOrigin = reader.readAddress(); // "leftmost thing in the call chain"
        this.currentBlock = reader.readU256();

        this._owner = reader.readAddress();
        this._contractAddress = reader.readAddress();

        this._timestamp = reader.readU64();

        this.contract;
    }

    public call(destinationContract: Address, calldata: BytesWriter): BytesReader {
        if (destinationContract === this._contractAddress) {
            throw this.error('Cannot call self');
        }

        if (!destinationContract) {
            throw this.error('Destination contract is required');
        }

        const call = new BytesWriter();
        call.writeAddress(destinationContract);
        call.writeBytesWithLength(calldata.getBuffer());

        const response: Uint8Array = callContract(call.getBuffer());

        return new BytesReader(response);
    }

    public log(data: string): void {
        const writer = new BytesWriter();
        writer.writeStringWithLength(data);

        const buffer = writer.getBuffer();
        log(buffer);
    }

    public addEvent(event: NetEvent): void {
        if (this.events.length >= i32(MAX_EVENTS)) {
            throw this.error(`Too many events in the same transaction.`);
        }

        this.events.push(event);
    }

    public getEvents(): Uint8Array {
        const eventLength: u16 = u16(this.events.length);
        if (eventLength > MAX_EVENTS) {
            throw this.error('Too many events');
        }

        const buffer: BytesWriter = new BytesWriter();
        buffer.writeU16(eventLength);

        for (let i: u8 = 0; i < eventLength; i++) {
            const event: NetEvent = this.events[i];

            buffer.writeStringWithLength(event.eventType);
            buffer.writeU64(event.getEventDataSelector());
            buffer.writeBytesWithLength(event.getEventData());
        }

        return buffer.getBuffer();
    }

    public encodeVirtualAddress(virtualAddress: Uint8Array): Address {
        const writer: BytesWriter = new BytesWriter();
        writer.writeBytesWithLength(virtualAddress);

        const buffer: Uint8Array = writer.getBuffer();
        const cb: Potential<Uint8Array> = encodeAddress(buffer);
        if (!cb) throw this.error('Failed to encode virtual address');

        const reader: BytesReader = new BytesReader(cb as Uint8Array);
        return reader.readAddress();
    }

    public deployContract(hash: u256, bytecode: Uint8Array): DeployContractResponse {
        const writer = new BytesWriter();
        writer.writeU256(hash);
        writer.writeBytes(bytecode);

        const cb: Potential<Uint8Array> = deploy(writer.getBuffer());
        if (!cb) throw this.error('Failed to deploy contract');

        const reader: BytesReader = new BytesReader(cb as Uint8Array);
        const virtualAddress: u256 = reader.readU256();
        const contractAddress: Address = reader.readAddress();

        return new DeployContractResponse(virtualAddress, contractAddress);
    }

    public deployContractFromExisting(
        existingAddress: Address,
        salt: u256,
    ): DeployContractResponse {
        const writer = new BytesWriter();
        writer.writeAddress(existingAddress);
        writer.writeU256(salt);

        const buffer: Uint8Array = writer.getBuffer();
        const cb: Potential<Uint8Array> = deployFromAddress(buffer);
        if (!cb) throw this.error('Failed to deploy contract');

        const reader: BytesReader = new BytesReader(cb as Uint8Array);
        const virtualAddress: u256 = reader.readU256();
        const contractAddress: Address = reader.readAddress();

        return new DeployContractResponse(virtualAddress, contractAddress);
    }

    public getStorageAt(
        pointer: u16,
        subPointer: MemorySlotPointer,
        defaultValue: MemorySlotData<u256>,
    ): MemorySlotData<u256> {
        const pointerHash: MemorySlotPointer = encodePointerHash(pointer, subPointer);
        this.ensureStorageAtPointer(pointerHash, defaultValue);

        if (this.storage.has(pointerHash)) {
            return this.storage.get(pointerHash);
        }

        return defaultValue;
    }

    public hasStorageAt(pointer: u16, subPointer: MemorySlotPointer): bool {
        // We mark zero as the default value for the storage, if something is 0, the storage slot get deleted or is non-existent
        const val: u256 = this.getStorageAt(pointer, subPointer, u256.Zero);

        return u256.ne(val, u256.Zero);
    }

    public setStorageAt(
        pointer: u16,
        keyPointer: MemorySlotPointer,
        value: MemorySlotData<u256>,
    ): void {
        const pointerHash: u256 = encodePointerHash(pointer, keyPointer);

        this._internalSetStorageAt(pointerHash, value);
    }

    public getViewSelectors(): Uint8Array {
        return ABIRegistry.getViewSelectors();
    }

    public getMethodSelectors(): Uint8Array {
        return ABIRegistry.getMethodSelectors();
    }

    public getWriteMethods(): Uint8Array {
        return ABIRegistry.getWriteMethods();
    }

    private error(msg: string): Error {
        return new Error(`${BlockchainEnvironment.runtimeException}: ${msg}`);
    }

    private _internalSetStorageAt(pointerHash: u256, value: MemorySlotData<u256>): void {
        this.storage.set(pointerHash, value);

        const writer: BytesWriter = new BytesWriter();
        writer.writeU256(pointerHash);
        writer.writeU256(value);

        const buffer: Uint8Array = writer.getBuffer();
        storePointer(buffer);
    }

    private hasPointerStorageHash(pointer: MemorySlotPointer): bool {
        if (this.storage.has(pointer)) {
            return true;
        }

        // we attempt to load the requested pointer.
        const writer = new BytesWriter();
        writer.writeU256(pointer);

        const result: Uint8Array = loadPointer(writer.getBuffer());
        const reader: BytesReader = new BytesReader(result);

        const value: u256 = reader.readU256();
        this.storage.set(pointer, value); // cache the value

        return !u256.eq(value, u256.Zero);
    }

    private ensureStorageAtPointer(
        pointerHash: MemorySlotPointer,
        defaultValue: MemorySlotData<u256>,
    ): void {
        if (!this.hasPointerStorageHash(pointerHash)) {
            if (u256.eq(defaultValue, u256.Zero)) {
                return;
            }

            this._internalSetStorageAt(pointerHash, defaultValue);
        }
    }
}


const Blockchain: BlockchainEnvironment = new BlockchainEnvironment();


class SafeMath {
    public static ZERO: u256 = u256.fromU32(0);

    public static add(a: u256, b: u256): u256 {
        const c: u256 = u256.add(a, b);
        if (c < a) {
            throw new Error('SafeMath: addition overflow');
        }
        return c;
    }

    public static sub(a: u256, b: u256): u256 {
        if (a < b) {
            throw new Error('SafeMath: subtraction overflow');
        }

        return u256.sub(a, b);
    }

    // Computes (a * b) % modulus with full precision
    public static mulmod(a: u256, b: u256, modulus: u256): u256 {
        if (u256.eq(modulus, u256.Zero)) throw new Error('SafeMath: modulo by zero');

        const mul = SafeMath.mul(a, b);
        return SafeMath.mod(mul, modulus);
    }

    @inline
    @unsafe
    @operator('%')
    public static mod(a: u256, b: u256): u256 {
        if (u256.eq(b, u256.Zero)) {
            throw new Error('SafeMath: modulo by zero');
        }

        let result = a.clone();
        while (u256.ge(result, b)) {
            result = u256.sub(result, b);
        }

        return result;
    }

    public static mul(a: u256, b: u256): u256 {
        if (a === SafeMath.ZERO || b === SafeMath.ZERO) {
            return SafeMath.ZERO;
        }

        const c: u256 = u256.mul(a, b);
        const d: u256 = SafeMath.div(c, a);

        if (u256.ne(d, b)) {
            throw new Error('SafeMath: multiplication overflow');
        }

        return c;
    }

    @inline
    @unsafe
    @operator('/')
    public static div(a: u256, b: u256): u256 {
        if (b.isZero()) {
            throw new Error('Division by zero');
        }

        if (a.isZero()) {
            return new u256();
        }

        if (u256.lt(a, b)) {
            return new u256(); // Return 0 if a < b
        }

        if (u256.eq(a, b)) {
            return new u256(1); // Return 1 if a == b
        }

        let n = a.clone();
        let d = b.clone();
        let result = new u256();

        let shift = u256.clz(d) - u256.clz(n);
        d = SafeMath.shl(d, shift); // align d with n by shifting left

        for (let i = shift; i >= 0; i--) {
            if (u256.ge(n, d)) {
                n = u256.sub(n, d);
                result = u256.or(result, SafeMath.shl(u256.One, i));
            }
            d = u256.shr(d, 1); // restore d to original by shifting right
        }

        return result;
    }

    public static min(a: u256, b: u256): u256 {
        return u256.lt(a, b) ? a : b;
    }

    public static max(a: u256, b: u256): u256 {
        return u256.gt(a, b) ? a : b;
    }

    @inline
    @unsafe
    public static sqrt(y: u256): u256 {
        if (u256.gt(y, u256.fromU32(3))) {
            let z = y;

            let u246_2 = u256.fromU32(2);

            let d = SafeMath.div(y, u246_2);
            let x = SafeMath.add(d, u256.One);

            while (u256.lt(x, z)) {
                z = x;

                let u = SafeMath.div(y, x);
                let y2 = u256.add(u, x);

                x = SafeMath.div(y2, u246_2);
            }

            return z;
        } else if (!u256.eq(y, u256.Zero)) {
            return u256.One;
        } else {
            return u256.Zero;
        }
    }

    @inline
    @unsafe
    public static shl(value: u256, shift: i32): u256 {
        if (shift == 0) {
            return value.clone();
        }

        let totalBits = 256;
        let bitsPerSegment = 64;

        // Normalize shift to be within 0-255 range
        shift &= 255;

        if (shift >= totalBits) {
            return new u256(); // Shift size larger than width results in zero
        }

        // Determine how many full 64-bit segments we are shifting
        let segmentShift = (shift / bitsPerSegment) | 0;
        let bitShift = shift % bitsPerSegment;

        let segments = [value.lo1, value.lo2, value.hi1, value.hi2];

        let result = new Array<u64>(4).fill(0);

        for (let i = 0; i < segments.length; i++) {
            if (i + segmentShift < segments.length) {
                result[i + segmentShift] |= segments[i] << bitShift;
            }
            if (bitShift != 0 && i + segmentShift + 1 < segments.length) {
                result[i + segmentShift + 1] |= segments[i] >>> (bitsPerSegment - bitShift);
            }
        }

        return new u256(result[0], result[1], result[2], result[3]);
    }

    public static and(a: u256, b: u256): u256 {
        return u256.and(a, b);
    }

    public static or(a: u256, b: u256): u256 {
        return u256.or(a, b);
    }

    public static xor(a: u256, b: u256): u256 {
        return u256.xor(a, b);
    }

    public static shr(a: u256, b: u32): u256 {
        return u256.shr(a, b);
    }

    /**
     * Increment a u256 value by 1
     * @param value The value to increment
     * @returns The incremented value
     */
    @inline
    static inc(value: u256): u256 {
        return value.preInc();
    }
}


@final
class StoredU256 {
    constructor(
        public pointer: u16,
        public subPointer: MemorySlotPointer,
        private defaultValue: u256,
    ) {}

    private _value: u256 = u256.Zero;

    @inline
    public get value(): u256 {
        this.ensureValue();

        return this._value;
    }

    @inline
    public set value(value: u256) {
        if (u256.eq(value, this._value)) {
            return;
        }

        this._value = value;

        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);
    }

    @inline
    public get toBytes(): Uint8Array {
        return this._value.toUint8Array(false);
    }

    @inline
    @operator('+')
    public add(value: u256): this {
        this.ensureValue();

        this._value = SafeMath.add(this._value, value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('-')
    public sub(value: u256): this {
        this.ensureValue();

        this._value = SafeMath.sub(this._value, value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('*')
    public mul(value: u256): this {
        this.ensureValue();

        this._value = SafeMath.mul(this._value, value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('==')
    public eq(value: u256): boolean {
        this.ensureValue();

        return this._value === value;
    }

    @inline
    @operator('!=')
    public ne(value: u256): boolean {
        this.ensureValue();

        return this._value !== value;
    }

    @inline
    @operator('<')
    public lt(value: u256): boolean {
        this.ensureValue();

        return this._value < value;
    }

    @inline
    @operator('>')
    public gt(value: u256): boolean {
        this.ensureValue();

        return this._value > value;
    }

    @inline
    @operator('<=')
    public le(value: u256): boolean {
        this.ensureValue();

        return this._value <= value;
    }

    @inline
    @operator('>=')
    public ge(value: u256): boolean {
        this.ensureValue();

        return this._value >= value;
    }

    @inline
    @operator('>>')
    public shr(value: i32): this {
        this.ensureValue();

        this._value = u256.shr(this._value, value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('&')
    public and(value: u256): this {
        this.ensureValue();

        this._value = u256.and(this._value, value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('|')
    public or(value: u256): this {
        this.ensureValue();

        this._value = u256.or(this._value, value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('^')
    public xor(value: u256): this {
        this.ensureValue();

        this._value = u256.xor(this._value, value);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('**')
    public pow(value: u256): this {
        this.ensureValue();

        // code pow from scratch
        let result: u256 = u256.One;

        while (value > u256.Zero) {
            if (u256.and(value, u256.One)) {
                result = SafeMath.mul(result, this._value);
            }

            this._value = SafeMath.mul(this._value, this._value);
            value = u256.shr(value, 1);
        }

        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator('%')
    public mod(value: u256): this {
        this.ensureValue();

        // code mod from scratch
        let result: u256 = u256.Zero;
        let base: u256 = this._value;
        let exp: u256 = value;

        while (exp > u256.Zero) {
            if (u256.and(exp, u256.One)) {
                result = SafeMath.add(result, base);
            }

            base = SafeMath.add(base, base);
            exp = u256.shr(exp, 1);
        }

        this._value = result;
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator.postfix('++')
    public inc(): this {
        this.ensureValue();

        this._value = SafeMath.add(this._value, u256.One);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    @operator.postfix('--')
    public dec(): this {
        this.ensureValue();

        this._value = SafeMath.sub(this._value, u256.One);
        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    public set(value: u256): this {
        this._value = value;

        Blockchain.setStorageAt(this.pointer, this.subPointer, this._value);

        return this;
    }

    @inline
    public toUint8Array(): Uint8Array {
        return this._value.toUint8Array(true);
    }

    private ensureValue(): void {
        this._value = Blockchain.getStorageAt(this.pointer, this.subPointer, this.defaultValue);
    }
}


interface IOP_20 {
    readonly _totalSupply: StoredU256;

    balanceOf(callData: Calldata): BytesWriter;

    transfer(callData: Calldata): BytesWriter;

    transferFrom(callData: Calldata): BytesWriter;

    approve(callData: Calldata): BytesWriter;

    allowance(callData: Calldata): BytesWriter;

    burn(callData: Calldata): BytesWriter;

    mint(callData: Calldata): BytesWriter;
}


@final
class AddressMemoryMap<K extends string, V extends MemorySlotData<u256>> {
    public pointer: u16;

    constructor(
        pointer: u16,
        private readonly defaultValue: V,
    ) {
        this.pointer = pointer;
    }

    public set(key: K, value: V): this {
        const keyHash: MemorySlotPointer = encodePointer(key);
        Blockchain.setStorageAt(this.pointer, keyHash, value);

        return this;
    }

    public get(key: K): MemorySlotData<u256> {
        return Blockchain.getStorageAt(this.pointer, encodePointer(key), this.defaultValue);
    }

    public has(key: K): bool {
        return Blockchain.hasStorageAt(this.pointer, encodePointer(key));
    }

    @unsafe
    public delete(key: K): bool {
        this.set(key, this.defaultValue);

        return true;
    }

    @unsafe
    public clear(): void {
        throw new Error('Method not implemented.');
    }
}


@final
class KeyMerger<K extends string, K2 extends string, V extends MemorySlotData<u256>> {
    public parentKey: K;

    public pointer: u16;

    constructor(
        parent: K,
        pointer: u16,
        private readonly defaultValue: V,
    ) {
        this.pointer = pointer;

        this.parentKey = parent;
    }

    public set(key2: K2, value: V): this {
        const mergedKey: string = `${this.parentKey}${key2}`;
        const keyHash: MemorySlotPointer = encodePointer(mergedKey);

        Blockchain.setStorageAt(this.pointer, keyHash, value);

        return this;
    }

    public get(key: K): MemorySlotData<u256> {
        const mergedKey: string = `${this.parentKey}${key}`;

        return Blockchain.getStorageAt(this.pointer, encodePointer(mergedKey), this.defaultValue);
    }

    public has(key: K): bool {
        const mergedKey: string = `${this.parentKey}${key}`;

        return Blockchain.hasStorageAt(this.pointer, encodePointer(mergedKey));
    }

    @unsafe
    public delete(_key: K): bool {
        throw new Error('Method not implemented.');
    }

    @unsafe
    public clear(): void {
        throw new Error('Clear method not implemented.');
    }
}


@final
class MultiAddressMemoryMap<
    K extends string,
    K2 extends string,
    V extends MemorySlotData<u256>,
> extends Map<K, KeyMerger<K, K2, V>> {
    public pointer: u16;

    constructor(
        pointer: u16,
        private readonly defaultValue: V,
    ) {
        super();

        this.pointer = pointer;
    }

    public get(key: K): KeyMerger<K, K2, V> {
        this.createKeyMerger(key);

        return super.get(key);
    }

    public setUpperKey(key: K, key2: K2, value: V): this {
        this.createKeyMerger(key);

        const subMap = super.get(key);
        if (subMap) {
            subMap.set(key2, value);
        }

        return this;
    }

    public set(key: K, value: KeyMerger<K, K2, V>): this {
        this.createKeyMerger(key);

        return <this>super.set(key, value);
    }

    public has(key: K): bool {
        return super.has(key);
    }

    public delete(key: K): bool {
        return super.delete(key);
    }

    public clear(): void {
        super.clear();
    }

    private createKeyMerger(key: K): void {
        if (!super.has(key)) {
            super.set(key, new KeyMerger<K, K2, V>(key, this.pointer, this.defaultValue));
        }
    }
}


@final
class ApproveEvent extends NetEvent {
    constructor(owner: Address, spender: Address, value: u256) {
        const data: BytesWriter = new BytesWriter(1, true);
        data.writeAddress(owner);
        data.writeAddress(spender);
        data.writeU256(value);

        super('Approve', data);
    }
}


@final
class BurnEvent extends NetEvent {
    constructor(amount: u256) {
        const data: BytesWriter = new BytesWriter(1, true);
        data.writeU256(amount);

        super('Burn', data);
    }
}


@final
class MintEvent extends NetEvent {
    constructor(address: Address, amount: u256) {
        const data: BytesWriter = new BytesWriter(1, true);
        data.writeAddress(address);
        data.writeU256(amount);

        super('Mint', data);
    }
}


@final
class TransferEvent extends NetEvent {
    constructor(from: Address, to: Address, amount: u256) {
        const data: BytesWriter = new BytesWriter(1, true);
        data.writeAddress(from);
        data.writeAddress(to);
        data.writeU256(amount);

        super('Transfer', data);
    }
}


@final
class ClaimEvent extends NetEvent {
    constructor(amount: u256) {
        const data: BytesWriter = new BytesWriter(1, true);
        data.writeU256(amount);

        super('Claim', data);
    }
}


@final
class StakeEvent extends NetEvent {
    constructor(amount: u256) {
        const data: BytesWriter = new BytesWriter(1, true);
        data.writeU256(amount);

        super('Stake', data);
    }
}


@final
class UnstakeEvent extends NetEvent {
    constructor(amount: u256) {
        const data: BytesWriter = new BytesWriter(1, true);
        data.writeU256(amount);

        super('Unstake', data);
    }
}



@final
class StoredString {
    constructor(
        public pointer: u16,
        private defaultValue?: string,
    ) {}

    private _value: string = '';

    @inline
    public get value(): string {
        if (!this._value) {
            this.load();
        }

        return this._value;
    }

    @inline
    public set value(value: string) {
        this._value = value;
        this.save();
    }

    private min(a: u32, b: u32): u32 {
        return a < b ? a : b;
    }

    private max(a: u32, b: u32): u32 {
        return a > b ? a : b;
    }

    private save(): void {
        const length: u32 = this._value.length;
        if (length == 0) {
            return;
        }

        if (length > 2048) {
            throw new Error('StoredString: value is too long');
        }

        // Prepare the header with the length of the string in the first 4 bytes
        let header: u256 = u256.fromU32(length);
        header = SafeMath.shl(header, 224);

        let currentPointer: u256 = u256.Zero;
        let remainingLength: u32 = length;
        let offset: u32 = 0;

        // Save the initial chunk (first 28 bytes) in the header
        let bytesToWrite: u32 = this.min(remainingLength, 28);
        header = this.saveChunk(header, this._value, offset, bytesToWrite, 4);
        Blockchain.setStorageAt(this.pointer, currentPointer, header);

        remainingLength -= bytesToWrite;
        offset += bytesToWrite;

        // Save the remaining chunks in subsequent storage slots
        while (remainingLength > 0) {
            bytesToWrite = this.min(remainingLength, 32);
            let storageValue: u256 = this.saveChunk(
                u256.Zero,
                this._value,
                offset,
                bytesToWrite,
                0,
            );
            currentPointer = u256.add(currentPointer, u256.One);
            Blockchain.setStorageAt(this.pointer, currentPointer, storageValue);

            remainingLength -= bytesToWrite;
            offset += bytesToWrite;
        }
    }

    // Helper method to save a chunk of the string into the storage slot
    private saveChunk(
        storage: u256,
        value: string,
        offset: u32,
        length: u32,
        storageOffset: u32,
    ): u256 {
        let bytes = storage.toBytes(true);
        for (let i: u32 = 0; i < length; i++) {
            let index: i32 = i32(offset + i);
            bytes[i + storageOffset] = u8(value.charCodeAt(index));
        }
        return u256.fromBytes(bytes, true);
    }

    private load(): void {
        const header: u256 = Blockchain.getStorageAt(this.pointer, u256.Zero, u256.Zero);
        if (u256.eq(header, u256.Zero)) {
            if (this.defaultValue) {
                this.value = this.defaultValue;
            }

            return;
        }

        // the length of the string is stored in the first 4 bytes of the header
        const bits: u256 = u256.shr(header, 224);
        const length: u32 = bits.toU32();

        // the rest contains the string itself
        let currentPointer: u256 = u256.Zero;
        let remainingLength: u32 = length;
        let currentStorage: u256 = header;

        let bytesToRead: u32 = this.min(remainingLength, 28);
        let str: string = this.loadChunk(currentStorage, 4, bytesToRead);
        remainingLength -= bytesToRead;

        while (remainingLength > 0) {
            // Move to the next storage slot
            currentPointer = u256.add(currentPointer, u256.One);
            currentStorage = Blockchain.getStorageAt(this.pointer, currentPointer, u256.Zero);

            // Extract the relevant portion of the string from the current storage slot
            let bytesToRead: u32 = this.min(remainingLength, 32);
            str += this.loadChunk(currentStorage, 0, bytesToRead);

            remainingLength -= bytesToRead;
        }

        this._value = str;
    }

    private loadChunk(value: u256, offset: u32, length: u32): string {
        const bytes = value.toBytes(true);

        let str: string = '';
        for (let i: u32 = 0; i < length; i++) {
            str += String.fromCharCode(bytes[i + offset]);
        }

        return str;
    }
}


class OP20InitParameters {
    readonly maxSupply: u256;
    readonly decimals: u8;
    readonly name: string;
    readonly symbol: string;

    constructor(maxSupply: u256, decimals: u8, name: string, symbol: string) {
        this.maxSupply = maxSupply;
        this.decimals = decimals;
        this.name = name;
        this.symbol = symbol;
    }
}


const maxSupplyPointer: u16 = Blockchain.nextPointer;
const decimalsPointer: u16 = Blockchain.nextPointer;
const namePointer: u16 = Blockchain.nextPointer;
const symbolPointer: u16 = Blockchain.nextPointer;
const totalSupplyPointer: u16 = Blockchain.nextPointer;
const allowanceMapPointer: u16 = Blockchain.nextPointer;
const balanceOfMapPointer: u16 = Blockchain.nextPointer;

abstract class DeployableOP_20 extends OP_NET implements IOP_20 {
    protected readonly allowanceMap: MultiAddressMemoryMap<Address, Address, MemorySlotData<u256>>;
    protected readonly balanceOfMap: AddressMemoryMap<Address, MemorySlotData<u256>>;

    protected readonly _maxSupply: StoredU256;
    protected readonly _decimals: StoredU256;
    protected readonly _name: StoredString;
    protected readonly _symbol: StoredString;

    protected constructor(params: OP20InitParameters | null = null) {
        super();

        this.allowanceMap = new MultiAddressMemoryMap<Address, Address, MemorySlotData<u256>>(
            allowanceMapPointer,
            u256.Zero,
        );

        this.balanceOfMap = new AddressMemoryMap<Address, MemorySlotData<u256>>(
            balanceOfMapPointer,
            u256.Zero,
        );

        this._totalSupply = new StoredU256(totalSupplyPointer, u256.Zero, u256.Zero);

        this._maxSupply = new StoredU256(maxSupplyPointer, u256.Zero, u256.Zero);
        this._decimals = new StoredU256(decimalsPointer, u256.Zero, u256.Zero);

        this._name = new StoredString(namePointer, '');
        this._symbol = new StoredString(symbolPointer, '');

        if (params && this._maxSupply.value.isZero()) {
            this.instantiate(params, true);
        }
    }

    public _totalSupply: StoredU256;

    public get totalSupply(): u256 {
        return this._totalSupply.value;
    }

    public get maxSupply(): u256 {
        if (!this._maxSupply) throw new Revert('Max supply not set');

        return this._maxSupply.value;
    }

    public get decimals(): u8 {
        if (!this._decimals) throw new Revert('Decimals not set');

        return u8(this._decimals.value.toU32());
    }

    public get name(): string {
        if (!this._name) throw new Revert('Name not set');

        return this._name.value;
    }

    public get symbol(): string {
        if (!this._symbol) throw new Revert('Symbol not set');

        return this._symbol.value;
    }

    public instantiate(params: OP20InitParameters, skipOwnerVerification: boolean = false): void {
        if (!this._maxSupply.value.isZero()) {
            throw new Revert('Already initialized');
        }

        if (!skipOwnerVerification) this.onlyOwner(Blockchain.txOrigin);

        if (params.decimals > 32) {
            throw new Revert('Decimals can not be more than 32');
        }

        this._maxSupply.value = params.maxSupply;
        this._decimals.value = u256.fromU32(u32(params.decimals));
        this._name.value = params.name;
        this._symbol.value = params.symbol;
    }

    /** METHODS */
    public allowance(callData: Calldata): BytesWriter {
        const response = new BytesWriter();

        const resp = this._allowance(callData.readAddress(), callData.readAddress());
        response.writeU256(resp);

        return response;
    }

    public approve(callData: Calldata): BytesWriter {
        // Define the owner and spender
        const owner = Blockchain.msgSender;
        const spender: Address = callData.readAddress();
        const value = callData.readU256();

        // Response buffer
        const response = new BytesWriter();

        const resp = this._approve(owner, spender, value);
        response.writeBoolean(resp);

        return response;
    }

    public balanceOf(callData: Calldata): BytesWriter {
        const response = new BytesWriter();
        const address: Address = callData.readAddress();
        const resp = this._balanceOf(address);

        response.writeU256(resp);

        return response;
    }

    public burn(callData: Calldata): BytesWriter {
        const response = new BytesWriter();
        const resp = this._burn(callData.readU256());
        response.writeBoolean(resp);

        return response;
    }

    public mint(callData: Calldata): BytesWriter {
        const response = new BytesWriter();
        const resp = this._mint(callData.readAddress(), callData.readU256());

        response.writeBoolean(resp);

        return response;
    }

    public transfer(callData: Calldata): BytesWriter {
        const response = new BytesWriter();
        const resp = this._transfer(callData.readAddress(), callData.readU256());

        response.writeBoolean(resp);

        return response;
    }

    public transferFrom(callData: Calldata): BytesWriter {
        const response = new BytesWriter();
        const resp = this._transferFrom(
            callData.readAddress(),
            callData.readAddress(),
            callData.readU256(),
        );

        response.writeBoolean(resp);

        return response;
    }

    public callMethod(method: Selector, calldata: Calldata): BytesWriter {
        switch (method) {
            case encodeSelector('allowance'):
                return this.allowance(calldata);
            case encodeSelector('approve'):
                return this.approve(calldata);
            case encodeSelector('balanceOf'):
                return this.balanceOf(calldata);
            case encodeSelector('burn'):
                return this.burn(calldata);
            case encodeSelector('mint'):
                return this.mint(calldata);
            case encodeSelector('transfer'):
                return this.transfer(calldata);
            case encodeSelector('transferFrom'):
                return this.transferFrom(calldata);
            default:
                return super.callMethod(method, calldata);
        }
    }

    public callView(method: Selector): BytesWriter {
        const response = new BytesWriter();

        switch (method) {
            case encodeSelector('decimals'):
                response.writeU8(this.decimals);
                break;
            case encodeSelector('name'):
                response.writeStringWithLength(this.name);
                break;
            case encodeSelector('symbol'):
                response.writeStringWithLength(this.symbol);
                break;
            case encodeSelector('totalSupply'):
                response.writeU256(this.totalSupply);
                break;
            case encodeSelector('maximumSupply'):
                response.writeU256(this.maxSupply);
                break;
            default:
                return super.callView(method);
        }

        return response;
    }

    /** REDEFINED METHODS */
    protected _allowance(owner: Address, spender: Address): u256 {
        const senderMap = this.allowanceMap.get(owner);

        return senderMap.get(spender);
    }

    protected _approve(owner: Address, spender: Address, value: u256): boolean {
        if (owner === Blockchain.DEAD_ADDRESS || spender === Blockchain.DEAD_ADDRESS) {
            throw new Revert('Cannot approve from or to dead address');
        }

        const senderMap = this.allowanceMap.get(owner);
        senderMap.set(spender, value);

        this.createApproveEvent(owner, spender, value);

        return true;
    }

    protected _balanceOf(owner: Address): u256 {
        const hasAddress = this.balanceOfMap.has(owner);
        if (!hasAddress) return u256.Zero;

        return this.balanceOfMap.get(owner);
    }

    protected _burn(value: u256, onlyOwner: boolean = true): boolean {
        if (u256.eq(value, u256.Zero)) {
            throw new Revert(`No tokens`);
        }

        if (onlyOwner) this.onlyOwner(Blockchain.txOrigin); // only indexers can burn tokens

        if (this._totalSupply.value < value) throw new Revert(`Insufficient total supply.`);
        if (!this.balanceOfMap.has(Blockchain.msgSender)) throw new Revert('No balance');

        const balance: u256 = this.balanceOfMap.get(Blockchain.msgSender);
        if (balance < value) throw new Revert(`Insufficient balance`);

        const newBalance: u256 = SafeMath.sub(balance, value);
        this.balanceOfMap.set(Blockchain.msgSender, newBalance);

        // @ts-ignore
        this._totalSupply -= value;

        this.createBurnEvent(value);
        return true;
    }

    protected _mint(to: Address, value: u256, onlyOwner: boolean = true): boolean {
        if (onlyOwner) this.onlyOwner(Blockchain.txOrigin);

        if (!this.balanceOfMap.has(to)) {
            this.balanceOfMap.set(to, value);
        } else {
            const toBalance: u256 = this.balanceOfMap.get(to);
            const newToBalance: u256 = SafeMath.add(toBalance, value);

            this.balanceOfMap.set(to, newToBalance);
        }

        // @ts-ignore
        this._totalSupply += value;

        if (this._totalSupply.value > this.maxSupply) throw new Revert('Max supply reached');

        this.createMintEvent(to, value);
        return true;
    }

    protected _transfer(to: string, value: u256): boolean {
        const sender = Blockchain.msgSender;

        if (!this.balanceOfMap.has(sender)) throw new Revert();
        if (this.isSelf(sender)) throw new Revert('Can not transfer from self account');

        if (u256.eq(value, u256.Zero)) {
            throw new Revert(`Cannot transfer 0 tokens`);
        }

        const balance: u256 = this.balanceOfMap.get(sender);
        if (balance < value) throw new Revert(`Insufficient balance`);

        const newBalance: u256 = SafeMath.sub(balance, value);
        this.balanceOfMap.set(sender, newBalance);

        const toBalance: u256 = this.balanceOfMap.get(to);
        const newToBalance: u256 = SafeMath.add(toBalance, value);

        this.balanceOfMap.set(to, newToBalance);

        this.createTransferEvent(sender, to, value);

        return true;
    }

    @unsafe
    protected _unsafeTransferFrom(from: Address, to: Address, value: u256): boolean {
        const balance: u256 = this.balanceOfMap.get(from);
        if (balance < value)
            throw new Revert(
                `TransferFrom insufficient balance of ${from} is ${balance} and value is ${value}`,
            );

        const newBalance: u256 = SafeMath.sub(balance, value);
        this.balanceOfMap.set(from, newBalance);

        if (!this.balanceOfMap.has(to)) {
            this.balanceOfMap.set(to, value);
        } else {
            const toBalance: u256 = this.balanceOfMap.get(to);
            const newToBalance: u256 = SafeMath.add(toBalance, value);

            this.balanceOfMap.set(to, newToBalance);
        }

        this.createTransferEvent(from, to, value);

        return true;
    }

    protected _transferFrom(from: Address, to: Address, value: u256): boolean {
        if (to === Blockchain.DEAD_ADDRESS || from === Blockchain.DEAD_ADDRESS) {
            throw new Revert('Cannot transfer to or from dead address');
        }

        this._spendAllowance(from, Blockchain.msgSender, value);
        this._unsafeTransferFrom(from, to, value);

        return true;
    }

    protected _spendAllowance(owner: Address, spender: Address, value: u256): void {
        const ownerAllowanceMap = this.allowanceMap.get(owner);
        const allowed: u256 = ownerAllowanceMap.get(spender);

        if (allowed < value) {
            throw new Revert(
                `Insufficient allowance ${allowed} < ${value}. Spender: ${spender} - Owner: ${owner}`,
            );
        }

        const newAllowance: u256 = SafeMath.sub(allowed, value);
        ownerAllowanceMap.set(spender, newAllowance);

        this.allowanceMap.set(owner, ownerAllowanceMap);
    }

    protected createBurnEvent(value: u256): void {
        const burnEvent = new BurnEvent(value);

        this.emitEvent(burnEvent);
    }

    protected createApproveEvent(owner: Address, spender: Address, value: u256): void {
        const approveEvent = new ApproveEvent(owner, spender, value);

        this.emitEvent(approveEvent);
    }

    protected createMintEvent(owner: Address, value: u256): void {
        const mintEvent = new MintEvent(owner, value);

        this.emitEvent(mintEvent);
    }

    protected createTransferEvent(from: Address, to: Address, value: u256): void {
        const transferEvent = new TransferEvent(from, to, value);

        this.emitEvent(transferEvent);
    }
}


abstract class OP_20 extends DeployableOP_20 {
    protected constructor(maxSupply: u256, decimals: u8, name: string, symbol: string) {
        super(new OP20InitParameters(maxSupply, decimals, name, symbol));
    }
}
let random_state0_64: u64;
let random_state1_64: u64;
let random_state0_32: u32;
let random_state1_32: u32;
let random_seeded = false;

function murmurHash3(h: u64): u64 {
    // Force all bits of a hash block to avalanche
    h ^= h >> 33; // see: https://github.com/aappleby/smhasher
    h *= 0xff51afd7ed558ccd;
    h ^= h >> 33;
    h *= 0xc4ceb9fe1a85ec53;
    h ^= h >> 33;
    return h;
}

function splitMix32(h: u32): u32 {
    h += 0x6d2b79f5;
    h = (h ^ (h >> 15)) * (h | 1);
    h ^= h + (h ^ (h >> 7)) * (h | 61);
    return h ^ (h >> 14);
}

function seedRandom(value: i64): void {
    // Instead zero seed use golden ratio:
    // phi = (1 + sqrt(5)) / 2
    // trunc(2^64 / phi) = 0x9e3779b97f4a7c15
    if (value == 0) value = 0x9e3779b97f4a7c15;
    random_state0_64 = murmurHash3(value);
    random_state1_64 = murmurHash3(~random_state0_64);
    random_state0_32 = splitMix32(<u32>value);
    random_state1_32 = splitMix32(random_state0_32);
    random_seeded = true;
}

/**
 * Safe deterministic random number generator
 * @param {u64} seed - The seed to use
 */
function randomU64(seed: i64): u64 {
    if (!random_seeded) seedRandom(seed);
    let s1 = random_state0_64;
    let s0 = random_state1_64;
    random_state0_64 = s0;
    s1 ^= s1 << 23;
    s1 ^= s1 >> 17;
    s1 ^= s0;
    s1 ^= s0 >> 26;
    random_state1_64 = s1;
    return s0;
}


abstract class Serializable {
    protected pointer: u16;
    protected subPointer:MemorySlotPointer;

    protected constructor(pointer: u16,
                          subPointer:MemorySlotPointer) {
        this.pointer = pointer;
        this.subPointer = subPointer;
    }

    public abstract get chunkCount(): i32;
    public abstract writeToBuffer(): BytesWriter;
    public abstract readFromBuffer(reader: BytesReader): void;

    public load() :void {
        const chunks: u256[] = [];

        for(let index:i32 = 0; index < this.chunkCount; index++){
            const chunk: u256 = Blockchain.getStorageAt(this.pointer, u256.add(this.subPointer, u256.fromU32(index)), u256.Zero);
            chunks.push(chunk);
        }

        const reader = this.chunksToBytes(chunks);

        this.readFromBuffer(reader);
    }

    public save(): void {
        const writer: BytesWriter = this.writeToBuffer();

        const buffer = writer.getBuffer();

        const chunks: u256[] = this.bytesToChunks(buffer);

        for (let index: i32 = 0; index < chunks.length; index++) {
            Blockchain.setStorageAt(
                this.pointer,
                u256.add(this.subPointer, u256.fromU32(index)),
                chunks[index],
            );
        }
    }

    protected bytesToChunks(buffer: Uint8Array): u256[] {
        const chunks: u256[] = [];

        for (let index: i32 = 0; index < buffer.byteLength; index += 32) {
            const chunk = buffer.slice(index, index + 32);
            chunks.push(u256.fromBytes(chunk, true));
        }

        return chunks;
    }

    protected chunksToBytes(chunks: u256[]): BytesReader {
        if(this.chunkCount >= 67108863) {
            throw new Revert('Too many chunks received');
        }

        const buffer: Uint8Array = new Uint8Array(this.chunkCount * 32);
        let offset: i32 = 0;

        for (let indexChunk: i32 = 0; indexChunk < chunks.length; indexChunk++) {
            const bytes: u8[] = chunks[indexChunk].toBytes(true);
            for (let indexByte: i32 = 0; indexByte < bytes.length; indexByte++) {
                buffer[offset++] = bytes[indexByte];
            }
        }

        return new BytesReader(buffer);
    }
}


class TransferHelper {
    public static get APPROVE_SELECTOR(): Selector {
        return encodeSelector('approve');
    }

    public static get TRANSFER_SELECTOR(): Selector {
        return encodeSelector('transfer');
    }

    public static get TRANSFER_FROM_SELECTOR(): Selector {
        return encodeSelector('transferFrom');
    }

    public static safeApprove(token: Address, spender: Address, amount: u256): void {
        const calldata = new BytesWriter();
        calldata.writeSelector(this.APPROVE_SELECTOR);
        calldata.writeAddress(spender);
        calldata.writeU256(amount);

        const response = Blockchain.call(token, calldata);
        const isOk = response.readBoolean();

        if (!isOk) {
            throw new Revert(`TransferHelper: APPROVE_FAILED`);
        }
    }

    public static safeTransfer(token: Address, to: Address, amount: u256): void {
        const calldata = new BytesWriter();
        calldata.writeSelector(this.TRANSFER_SELECTOR);
        calldata.writeAddress(to);
        calldata.writeU256(amount);

        const response = Blockchain.call(token, calldata);
        const isOk = response.readBoolean();

        if (!isOk) {
            throw new Revert(`TransferHelper: TRANSFER_FAILED`);
        }
    }

    public static safeTransferFrom(token: Address, from: Address, to: Address, amount: u256): void {
        const calldata = new BytesWriter();
        calldata.writeSelector(this.TRANSFER_FROM_SELECTOR);

        calldata.writeAddress(from);
        calldata.writeAddress(to);
        calldata.writeU256(amount);

        const response = Blockchain.call(token, calldata);
        const isOk = response.readBoolean();

        if (!isOk) {
            throw new Revert(`TransferHelper: TRANSFER_FROM_FAILED`);
        }
    }
}


class OP20Utils {
    public static get BALANCE_OF_SELECTOR(): Selector {
        return encodeSelector('balanceOf');
    }

    public static balanceOf(token: Address, owner: Address): u256 {
        const calldata: BytesWriter = new BytesWriter();
        calldata.writeSelector(OP20Utils.BALANCE_OF_SELECTOR);
        calldata.writeAddress(owner);

        const response = Blockchain.call(token, calldata);

        return response.readU256();
    }
}
