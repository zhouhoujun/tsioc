import { ArgumentError, isFunction, isString, lang } from '@tsdi/ioc';
import { ResponseHeader } from '@tsdi/core';
import { Stream, PassThrough } from 'stream';
import { EventEmitter } from 'events';


export function isBuffer(body: any): body is Buffer {
  return Buffer.isBuffer(body)
}

export function isStream(body: any): body is Stream {
  return body instanceof Stream || (body instanceof EventEmitter && isFunction((body as Stream).pipe))
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


export async function toBuffer(body: PassThrough, limit = 0, url?: string) {
  const data = [];
  let bytes = 0;

  for await (const chunk of body) {
      if (limit > 0 && bytes + chunk.length > limit) {
          const error = new TypeError(`content size at ${url} over limit: ${limit}`);
          body.destroy(error);
          throw error;
      }
      bytes += chunk.length;
      data.push(chunk);
  }

  if (data.every(c => typeof c === 'string')) {
      return Buffer.from(data.join(''));
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

export function vary(res: ResponseHeader, field: string) {
  // get existing header
  let val = res.getHeader('Vary') || '';
  const header = Array.isArray(val)
    ? val.join(', ')
    : String(val);

  // set new header
  if ((val = append(header, field))) {
    res.setHeader('Vary', val)
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
    throw new ArgumentError('header argument is required');
  }

  if (!field) {
    throw new ArgumentError('field argument is required')
  }

  // get fields array
  const fields = !Array.isArray(field)
    ? parseTokenList(String(field))
    : field;

  // assert on invalid field names
  for (let j = 0; j < fields.length; j++) {
    if (!field_name.test(fields[j])) {
      throw new ArgumentError('field argument contains an invalid header name');
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



// default json types
export const jsonTypes = [
  'application/json',
  'application/json-patch+json',
  'application/vnd.api+json',
  'application/csp-report',
];

// default form types
export const formTypes = [
  'application/x-www-form-urlencoded',
];

// default text types
export const textTypes = [
  'text/plain',
];

// default xml types
export const xmlTypes = [
  'text/xml',
  'application/xml',
];