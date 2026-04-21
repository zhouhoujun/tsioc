"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toAbsolutePath = toAbsolutePath;
exports.runMainPath = runMainPath;
const path = require("node:path");
const node_fs_1 = require("node:fs");
/**
 * convert path to absolute path.
 *
 * @export
 * @param {string} root
 * @param {string} pathstr
 * @returns {string}
 */
function toAbsolutePath(root, pathstr) {
    if (!root || path.isAbsolute(pathstr)) {
        return pathstr;
    }
    return path.join(root, pathstr);
}
const jsTsChkExp = /(\w+\.ts|\.js)$/;
/**
 * get run main path.
 *
 * @export
 * @returns {string}
 */
function runMainPath() {
    const cwd = process.cwd();
    const pr = process;
    if (pr.mainModule && pr.mainModule.filename && pr.mainModule.filename.startsWith(cwd)) {
        return path.dirname(pr.mainModule.filename);
    }
    if (process.argv.length > 2) {
        const mainfile = process.argv.slice(2).find(arg => jsTsChkExp.test(arg) && (0, node_fs_1.existsSync)(path.join(cwd, arg)));
        if (mainfile) {
            return path.dirname(path.join(cwd, mainfile));
        }
    }
    return cwd;
}
//# sourceMappingURL=toAbsolute.js.map