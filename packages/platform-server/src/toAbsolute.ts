import * as path from 'node:path';
import { existsSync } from 'node:fs';

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
        return pathstr
    }
    return path.join(root, pathstr)
}

const jsTsChkExp = /(\w+\.ts|\.js)$/;
/**
 * get run main path.
 *
 * @export
 * @returns {string}
 */
export function runMainPath(): string {
    let cwd = process.cwd();
    let pr: any = process;
    if (pr.mainModule && pr.mainModule.filename && pr.mainModule.filename.startsWith(cwd)) {
        return path.dirname(pr.mainModule.filename)
    }
    if (process.argv.length > 2) {
        let mainfile = process.argv.slice(2).find(arg => jsTsChkExp.test(arg) && existsSync(path.join(cwd, arg)));
        if (mainfile) {
            return path.dirname(path.join(cwd, mainfile))
        }
    }
    return cwd
}
