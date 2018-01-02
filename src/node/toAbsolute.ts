import { isString } from '../utils/index';

/**
 * convert path to absolute path.
 *
 * @export
 * @param {string} root
 * @param {string} pathstr
 * @returns {string}
 */
export function toAbsolutePath(root: string, pathstr: string): string {
    let path = require('path');
    if (!root || path.isAbsolute(pathstr)) {
        return pathstr;
    }
    return path.join(root, pathstr);
}

/**
 * convert src to absolute path src.
 *
 * @export
 * @param {string} root
 * @param {(string|string[])} src
 * @returns {(string|string[])}
 */
export function toAbsoluteSrc(root: string, src: string | string[]): string | string[] {
    if (isString(src)) {
        return prefixSrc(root, src);
    } else {
        return src.map(p => prefixSrc(root, p));
    }
}

function prefixSrc(root: string, strSrc: string): string {
    let prefix = '';
    if (/^!/.test(strSrc)) {
        prefix = '!';
        strSrc = strSrc.substring(1, strSrc.length);
    }
    return prefix + toAbsolutePath(root, strSrc);
}
