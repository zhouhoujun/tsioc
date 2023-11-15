import { ArgumentExecption } from '@tsdi/ioc';
import { Buffer } from 'buffer';
import { hdr } from './consts';
import { Outgoing } from './socket';

const _tyundef = 'undefined';

/**
 * Safely assert whether the given value is an ArrayBuffer.
 *
 * In some execution environments ArrayBuffer is not defined.
 */
export function isArrayBuffer(value: any): value is ArrayBuffer {
    return typeof ArrayBuffer !== _tyundef && value instanceof ArrayBuffer
}

/**
 * Safely assert whether the given value is a Blob.
 *
 * In some execution environments Blob is not defined.
 */
export function isBlob(value: any): value is Blob {
    return typeof Blob !== _tyundef && value instanceof Blob
}

/**
 * Safely assert whether the given value is a FormData instance.
 *
 * In some execution environments FormData is not defined.
 */
export function isFormData(value: any): value is FormData {
    return typeof FormData !== _tyundef && value instanceof FormData
}

/**
 * Safely assert whether the given value is a URLSearchParams instance.
 *
 * In some execution environments URLSearchParams is not defined.
 */
export function isUrlSearchParams(value: any): value is URLSearchParams {
    return typeof URLSearchParams !== _tyundef && value instanceof URLSearchParams
}

export function isBuffer(body: any): body is Buffer {
    return Buffer.isBuffer(body)
}

const sta$ = /^\s*\//;
const trim$ = /(?:^\s*\/)|(?:\/\s+$)/;
/**
 * join path.
 * @param paths 
 * @returns 
 */
export function joinPath(...paths: (string | undefined)[]) {
    const joined = paths
        .filter(p => p)
        .map((p, idx) => {
            if (!p) return undefined;
            p = p.replace(trim$, '');
            if (idx > 0) {
                while (p.startsWith('../')) {
                    let preIdx = idx - 1;
                    let pre = paths[preIdx];
                    if (!pre && preIdx - 1 > 0) {
                        preIdx = preIdx - 1;
                        pre = paths[preIdx];
                    }
                    if (pre) {
                        const lasspt = pre.lastIndexOf('/');
                        paths[preIdx] = lasspt > 0 ? pre.slice(0, pre.lastIndexOf('/')) : undefined;
                        p = p.slice(3)
                    }
                }
                if (p.startsWith('./')) {
                    p = p.slice(2);
                }
            }
            return p;
        })
        .filter(p => p)
        .join('/');

    return joined
}

/**
 * normalize route path.
 * @param route 
 * @returns 
 */
export function normalize(route: string, prefix?: string, noSearch?: boolean): string {
    if (!route) return '';

    let path = route.replace(trim$, '');
    if (noSearch) {
        const idx = path.indexOf('?');
        if (idx >= 0) {
            path = path.slice(0, idx);
        }
    }
    if (prefix) {
        prefix = prefix.replace(sta$, '');
        if (path.startsWith(prefix)) {
            path = path.substring(prefix.length).replace(sta$, '')
        }

    }
    return path;
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
 * json xss.
 */
export const XSSI_PREFIX = /^\)\]\}',?\n/;

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

export function vary(res: Outgoing, field: string) {
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
