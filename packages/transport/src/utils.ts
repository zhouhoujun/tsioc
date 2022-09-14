import { ArgumentExecption, isFunction, isString, TypeExecption } from '@tsdi/ioc';
import { OutgoingMsg, isFormData } from '@tsdi/core';
import { Buffer } from 'buffer';
import { Stream, Readable, Duplex } from 'stream';
import * as Duplexify from 'duplexify';
import * as FormData from 'form-data';
import { EventEmitter } from 'events';
import { hdr } from './consts';

export function isBuffer(body: any): body is Buffer {
  return Buffer.isBuffer(body)
}

export function createFormData(options?: {
  writable?: boolean;
  readable?: boolean;
  dataSize?: number;
  maxDataSize?: number;
  pauseStreams?: boolean;
  highWaterMark?: number;
  encoding?: string;
  objectMode?: boolean;
  read?(this: Readable, size: number): void;
  destroy?(this: Readable, error: Error | null, callback: (error: Error | null) => void): void;
  autoDestroy?: boolean;
}): FormData {
  return new FormData(options);
}

export function isFormDataLike(body: any): boolean {
  return isFormData(body) || body instanceof FormData
}

export function isStream(body: any): body is Stream {
  return body instanceof Stream || (body instanceof EventEmitter && isFunction((body as Stream).pipe))
}


export function isDuplex(target: any): target is Duplex {
  return target instanceof Duplex || target instanceof Duplexify;
}

export function isJson(body: any) {
  if (!body) return false;
  if (isString(body)) return false;
  if (isStream(body)) return false;
  if (isBuffer(body)) return false;
  return true
}

/**
 * xml reg exp check.
 */
export const xmlRegExp = /^\s*</;
/**
 * html RegExp
 */
export const htmlRegExp = /["'&<>]/;

/**
 * Escape special characters in the given string of html.
 *
 * @param  {string} content The string to escape for inserting into HTML
 * @return {string}
 * @public
 */

export function escapeHtml(content: string): string {
  const str = '' + content;
  const match = htmlRegExp.exec(str);

  if (!match) {
    return str
  }

  let escape;
  let html = '';
  let index = 0;
  let lastIndex = 0;

  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34: // "
        escape = '&quot;';
        break;
      case 38: // &
        escape = '&amp;';
        break;
      case 39: // '
        escape = '&#39;';
        break;
      case 60: // <
        escape = '&lt;';
        break;
      case 62: // >
        escape = '&gt;';
        break;
      default:
        continue;
    }

    if (lastIndex !== index) {
      html += str.substring(lastIndex, index);
    }

    lastIndex = index + 1;
    html += escape;
  }

  return lastIndex !== index
    ? html + str.substring(lastIndex, index)
    : html;
}


export async function toBuffer(body: Readable, limit = 0, url?: string) {
  const data = [];
  let bytes = 0;

  for await (const chunk of body) {
    if (limit > 0 && bytes + chunk.length > limit) {
      const error = new TypeExecption(`content size at ${url} over limit: ${limit}`);
      body.destroy(error);
      throw error;
    }
    bytes += chunk.length;
    data.push(chunk);
  }

  return Buffer.concat(data, bytes);
}


export function encodeUrl(url: string) {
  return url
    .replace(UNMATCHED_SURROGATE_PAIR_REGEXP, UNMATCHED_SURROGATE_PAIR_REPLACE)
    .replace(ENCODE_CHARS_REGEXP, encodeURI)
}


/**
 * RegExp to match non-URL code points, *after* encoding (i.e. not including "%")
 * and including invalid escape sequences.
 * @private
 */

const ENCODE_CHARS_REGEXP = /(?:[^\x21\x25\x26-\x3B\x3D\x3F-\x5B\x5D\x5F\x61-\x7A\x7E]|%(?:[^0-9A-Fa-f]|[0-9A-Fa-f][^0-9A-Fa-f]|$))+/g

/**
 * RegExp to match unmatched surrogate pair.
 * @private
 */

const UNMATCHED_SURROGATE_PAIR_REGEXP = /(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]|[\uD800-\uDBFF]([^\uDC00-\uDFFF]|$)/g

/**
 * String to replace unmatched surrogate pair with.
 * @private
 */

const UNMATCHED_SURROGATE_PAIR_REPLACE = '$1\uFFFD$2'



/**
 * Parse a HTTP token list.
 *
 * @param {string} str
 * @private
 */

export function parseTokenList(str: string) {
  let end = 0;
  const list = [];
  let start = 0;

  // gather tokens
  for (let i = 0, len = str.length; i < len; i++) {
    switch (str.charCodeAt(i)) {
      case 0x20: /*   */
        if (start === end) {
          start = end = i + 1
        }
        break;
      case 0x2c: /* , */
        list.push(str.substring(start, end))
        start = end = i + 1
        break;
      default:
        end = i + 1
        break;
    }
  }

  // final token
  list.push(str.substring(start, end));

  return list
}


const field_name = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
/**
* Mark that a request is varied on a header field.
*
* @param {Object} res
* @param {String|Array} field
* @public
*/

export function vary(res: OutgoingMsg, field: string) {
  // get existing header
  let val = res.getHeader(hdr.VARY) || '';
  const header = Array.isArray(val)
    ? val.join(', ')
    : String(val);

  // set new header
  if ((val = append(header, field))) {
    res.setHeader(hdr.VARY, val)
  }
}

/**
* Append a field to a vary header.
*
* @param {String} header
* @param {String|Array} field
* @return {String}
* @public
*/

export function append(header: string, field: string) {
  if (typeof header !== 'string') {
    throw new ArgumentExecption('header argument is required');
  }

  if (!field) {
    throw new ArgumentExecption('field argument is required')
  }

  // get fields array
  const fields = !Array.isArray(field)
    ? parseTokenList(String(field))
    : field;

  // assert on invalid field names
  for (let j = 0; j < fields.length; j++) {
    if (!field_name.test(fields[j])) {
      throw new ArgumentExecption('field argument contains an invalid header name');
    }
  }

  // existing, unspecified vary
  if (header === '*') {
    return header
  }

  // enumerate current values
  let val = header;
  const vals = parseTokenList(header.toLowerCase());

  // unspecified vary
  if (fields.indexOf('*') !== -1 || vals.indexOf('*') !== -1) {
    return '*'
  }

  for (let i = 0; i < fields.length; i++) {
    const fld = fields[i].toLowerCase()

    // append value (case-preserving)
    if (vals.indexOf(fld) === -1) {
      vals.push(fld)
      val = val
        ? val + ', ' + fields[i]
        : fields[i]
    }
  }

  return val
}

