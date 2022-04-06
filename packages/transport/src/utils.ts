import { isFunction, isString } from '@tsdi/ioc';
import { Stream } from 'stream';
import { EventEmitter } from 'events'


export function isBuffer(body: any): body is Buffer {
    return Buffer.isBuffer(body);
}

export function isStream(body: any): body is Stream {
    return body instanceof Stream || (body instanceof EventEmitter && isFunction((body as Stream).pipe));
}

export function isJson(body: any) {
    if (!body) return false;
    if (isString(body)) return false;
    if (isStream(body)) return false;
    if (isBuffer(body)) return false;
    return true;
}


const htmlRegExp = /["'&<>]/;
 
/**
 * Escape special characters in the given string of html.
 *
 * @param  {string} content The string to escape for inserting into HTML
 * @return {string}
 * @public
 */

 export function escapeHtml(content: string): string {
  var str = '' + content;
  var match = htmlRegExp.exec(str);

  if (!match) {
    return str;
  }

  var escape;
  var html = '';
  var index = 0;
  var lastIndex = 0;

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