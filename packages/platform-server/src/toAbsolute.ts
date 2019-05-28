import { isString } from '@tsdi/ioc';
import * as path from 'path';

declare let require: any;

/**
 * sync require.
 *
 * @export
 * @param {string} filename
 * @returns {*}
 */
export function syncRequire(filename: string): any {
    return require(filename);
}

/**
 * convert path to absolute path.
 *
 * @export
 * @param {string} root
 * @param {string} pathstr
 * @returns {string}
 */
export function toAbsolutePath(root: string, pathstr: string): string {
    if (!root || path.isAbsolute(pathstr)) {
        return path.normalize(pathstr);
    }
    return path.join(path.normalize(root), path.normalize(pathstr));
}

/**
 * get run main path.
 *
 * @export
 * @returns {string}
 */
export function runMainPath(): string {
    if (process.mainModule && process.mainModule.filename) {
        return path.dirname(process.mainModule.filename);
    }
    return process.cwd();
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
