/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {newArray, utf8Encode} from '../util';

import * as i18n from './i18n_ast';

/**
 * Return the message id or compute it using the XLIFF1 digest.
 */
export function digest(message: i18n.Message): string {
  return message.id || computeDigest(message);
}

/**
 * Compute the message id using the XLIFF1 digest.
 */
export function computeDigest(message: i18n.Message): string {
  return sha1(serializeNodes(message.nodes).join('') + `[${message.meaning}]`);
}

/**
 * Return the message id or compute it using the XLIFF2/XMB/$localize digest.
 */
export function decimalDigest(message: i18n.Message): string {
  return message.id || computeDecimalDigest(message);
}

/**
 * Compute the message id using the XLIFF2/XMB/$localize digest.
 */
export function computeDecimalDigest(message: i18n.Message): string {
  const visitor = new _SerializerIgnoreIcuExpVisitor();
  const parts = message.nodes.map(a => a.visit(visitor, null));
  return computeMsgId(parts.join(''), message.meaning);
}

/**
 * Serialize the i18n ast to something xml-like in order to generate an UID.
 *
 * The visitor is also used in the i18n parser tests
 *
 * @internal
 */
class _SerializerVisitor implements i18n.Visitor {
  visitText(text: i18n.Text, context: any): any { return text.value; }

  visitContainer(container: i18n.Container, context: any): any {
    return `[${container.children.map(child => child.visit(this)).join(', ')}]`;
  }

  visitIcu(icu: i18n.Icu, context: any): any {
    const strCases =
        Object.keys(icu.cases).map((k: string) => `${k} {${icu.cases[k].visit(this)}}`);
    return `{${icu.expression}, ${icu.type}, ${strCases.join(', ')}}`;
  }

  visitTagPlaceholder(ph: i18n.TagPlaceholder, context: any): any {
    return ph.isVoid ?
        `<ph tag name="${ph.startName}"/>` :
        `<ph tag name="${ph.startName}">${ph.children.map(child => child.visit(this)).join(', ')}</ph name="${ph.closeName}">`;
  }

  visitPlaceholder(ph: i18n.Placeholder, context: any): any {
    return ph.value ? `<ph name="${ph.name}">${ph.value}</ph>` : `<ph name="${ph.name}"/>`;
  }

  visitIcuPlaceholder(ph: i18n.IcuPlaceholder, context?: any): any {
    return `<ph icu name="${ph.name}">${ph.value.visit(this)}</ph>`;
  }
}

const serializerVisitor = new _SerializerVisitor();

export function serializeNodes(nodes: i18n.Node[]): string[] {
  return nodes.map(a => a.visit(serializerVisitor, null));
}

/**
 * Serialize the i18n ast to something xml-like in order to generate an UID.
 *
 * Ignore the ICU expressions so that message IDs stays identical if only the expression changes.
 *
 * @internal
 */
class _SerializerIgnoreIcuExpVisitor extends _SerializerVisitor {
  visitIcu(icu: i18n.Icu, context: any): any {
    let strCases = Object.keys(icu.cases).map((k: string) => `${k} {${icu.cases[k].visit(this)}}`);
    // Do not take the expression into account
    return `{${icu.type}, ${strCases.join(', ')}}`;
  }
}

/**
 * Compute the SHA1 of the given string
 *
 * see http://csrc.nist.gov/publications/fips/fips180-4/fips-180-4.pdf
 *
 * WARNING: this function has not been designed not tested with security in mind.
 *          DO NOT USE IT IN A SECURITY SENSITIVE CONTEXT.
 */
export function sha1(str: string): string {
  const utf8 = utf8Encode(str);
  const words32 = stringToWords32(utf8, Endian.Big);
  const len = utf8.length * 8;

  const w = newArray(80);
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476, e = 0xc3d2e1f0;

  words32[len >> 5] |= 0x80 << (24 - len % 32);
  words32[((len + 64 >> 9) << 4) + 15] = len;

  for (let i = 0; i < words32.length; i += 16) {
    const h0 = a, h1 = b, h2 = c, h3 = d, h4 = e;

    for (let j = 0; j < 80; j++) {
      if (j < 16) {
        w[j] = words32[i + j];
      } else {
        w[j] = rol32(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
      }

      const fkVal = fk(j, b, c, d);
      const f = fkVal[0];
      const k = fkVal[1];
      const temp = [rol32(a, 5), f, e, k, w[j]].reduce(add32);
      e = d;
      d = c;
      c = rol32(b, 30);
      b = a;
      a = temp;
    }
    a = add32(a, h0);
    b = add32(b, h1);
    c = add32(c, h2);
    d = add32(d, h3);
    e = add32(e, h4);
  }

  return byteStringToHexString(words32ToByteString([a, b, c, d, e]));
}

function fk(index: number, b: number, c: number, d: number): [number, number] {
  if (index < 20) {
    return [(b & c) | (~b & d), 0x5a827999];
  }

  if (index < 40) {
    return [b ^ c ^ d, 0x6ed9eba1];
  }

  if (index < 60) {
    return [(b & c) | (b & d) | (c & d), 0x8f1bbcdc];
  }

  return [b ^ c ^ d, 0xca62c1d6];
}

/**
 * Compute the fingerprint of the given string
 *
 * The output is 64 bit number encoded as a decimal string
 *
 * based on:
 * https://github.com/google/closure-compiler/blob/master/src/com/google/javascript/jscomp/GoogleJsMessageIdGenerator.java
 */
export function fingerprint(str: string): [number, number] {
  const utf8 = utf8Encode(str);

  let hi = hash32(utf8, 0);
  let lo = hash32(utf8, 102072);

  if (hi == 0 && (lo == 0 || lo == 1)) {
    hi = hi ^ 0x130f9bef;
    lo = lo ^ -0x6b5f56d8;
  }

  return [hi, lo];
}

export function computeMsgId(msg: string, meaning: string = ''): string {
  let msgFingerprint = fingerprint(msg);

  if (meaning) {
    const meaningFingerprint = fingerprint(meaning);
    msgFingerprint = add64(rol64(msgFingerprint, 1), meaningFingerprint);
  }

  const hi = msgFingerprint[0];
  const lo = msgFingerprint[1];

  return byteStringToDecString(words32ToByteString([hi & 0x7fffffff, lo]));
}

function hash32(str: string, c: number): number {
  let a = 0x9e3779b9, b = 0x9e3779b9;
  let i: number;

  const len = str.length;

  for (i = 0; i + 12 <= len; i += 12) {
    a = add32(a, wordAt(str, i, Endian.Little));
    b = add32(b, wordAt(str, i + 4, Endian.Little));
    c = add32(c, wordAt(str, i + 8, Endian.Little));
    const res = mix(a, b, c);
    a = res[0], b = res[1], c = res[2];
  }

  a = add32(a, wordAt(str, i, Endian.Little));
  b = add32(b, wordAt(str, i + 4, Endian.Little));
  // the first byte of c is reserved for the length
  c = add32(c, len);
  c = add32(c, wordAt(str, i + 8, Endian.Little) << 8);

  return mix(a, b, c)[2];
}

// clang-format off
function mix(a: number, b: number, c: number): [number, number, number] {
  a = sub32(a, b); a = sub32(a, c); a ^= c >>> 13;
  b = sub32(b, c); b = sub32(b, a); b ^= a << 8;
  c = sub32(c, a); c = sub32(c, b); c ^= b >>> 13;
  a = sub32(a, b); a = sub32(a, c); a ^= c >>> 12;
  b = sub32(b, c); b = sub32(b, a); b ^= a << 16;
  c = sub32(c, a); c = sub32(c, b); c ^= b >>> 5;
  a = sub32(a, b); a = sub32(a, c); a ^= c >>> 3;
  b = sub32(b, c); b = sub32(b, a); b ^= a << 10;
  c = sub32(c, a); c = sub32(c, b); c ^= b >>> 15;
  return [a, b, c];
}
// clang-format on

// Utils

enum Endian {
  Little,
  Big,
}

function add32(a: number, b: number): number {
  return add32to64(a, b)[1];
}

function add32to64(a: number, b: number): [number, number] {
  const low = (a & 0xffff) + (b & 0xffff);
  const high = (a >>> 16) + (b >>> 16) + (low >>> 16);
  return [high >>> 16, (high << 16) | (low & 0xffff)];
}

function add64(a: [number, number], b: [number, number]): [number, number] {
  const ah = a[0], al = a[1];
  const bh = b[0], bl = b[1];
  const result = add32to64(al, bl);
  const carry = result[0];
  const l = result[1];
  const h = add32(add32(ah, bh), carry);
  return [h, l];
}

function sub32(a: number, b: number): number {
  const low = (a & 0xffff) - (b & 0xffff);
  const high = (a >> 16) - (b >> 16) + (low >> 16);
  return (high << 16) | (low & 0xffff);
}

// Rotate a 32b number left `count` position
function rol32(a: number, count: number): number {
  return (a << count) | (a >>> (32 - count));
}

// Rotate a 64b number left `count` position
function rol64(num: [number, number], count: number): [number, number] {
  const hi = num[0], lo = num[1];
  const h = (hi << count) | (lo >>> (32 - count));
  const l = (lo << count) | (hi >>> (32 - count));
  return [h, l];
}

function stringToWords32(str: string, endian: Endian): number[] {
  const size = (str.length + 3) >>> 2;
  const words32 = [];

  for (let i = 0; i < size; i++) {
    words32[i] = wordAt(str, i * 4, endian);
  }

  return words32;
}

function byteAt(str: string, index: number): number {
  return index >= str.length ? 0 : str.charCodeAt(index) & 0xff;
}

function wordAt(str: string, index: number, endian: Endian): number {
  let word = 0;
  if (endian === Endian.Big) {
    for (let i = 0; i < 4; i++) {
      word += byteAt(str, index + i) << (24 - 8 * i);
    }
  } else {
    for (let i = 0; i < 4; i++) {
      word += byteAt(str, index + i) << 8 * i;
    }
  }
  return word;
}

function words32ToByteString(words32: number[]): string {
  return words32.reduce((str, word) => str + word32ToByteString(word), '');
}

function word32ToByteString(word: number): string {
  let str = '';
  for (let i = 0; i < 4; i++) {
    str += String.fromCharCode((word >>> 8 * (3 - i)) & 0xff);
  }
  return str;
}

function byteStringToHexString(str: string): string {
  let hex: string = '';
  for (let i = 0; i < str.length; i++) {
    const b = byteAt(str, i);
    hex += (b >>> 4).toString(16) + (b & 0x0f).toString(16);
  }
  return hex.toLowerCase();
}

// based on http://www.danvk.org/hex2dec.html (JS can not handle more than 56b)
function byteStringToDecString(str: string): string {
  let decimal = '';
  let toThePower = '1';

  for (let i = str.length - 1; i >= 0; i--) {
    decimal = addBigInt(decimal, numberTimesBigInt(byteAt(str, i), toThePower));
    toThePower = numberTimesBigInt(256, toThePower);
  }

  return decimal.split('').reverse().join('');
}

// x and y decimal, lowest significant digit first
function addBigInt(x: string, y: string): string {
  let sum = '';
  const len = Math.max(x.length, y.length);
  for (let i = 0, carry = 0; i < len || carry; i++) {
    const tmpSum = carry + +(x[i] || 0) + +(y[i] || 0);
    if (tmpSum >= 10) {
      carry = 1;
      sum += tmpSum - 10;
    } else {
      carry = 0;
      sum += tmpSum;
    }
  }

  return sum;
}

function numberTimesBigInt(num: number, b: string): string {
  let product = '';
  let bToThePower = b;
  for (; num !== 0; num = num >>> 1) {
    if (num & 1) product = addBigInt(product, bToThePower);
    bToThePower = addBigInt(bToThePower, bToThePower);
  }
  return product;
}
