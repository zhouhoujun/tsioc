"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isToken = isToken;
const tokens_1 = require("../tokens");
const type_1 = require("../metadata/type");
/**
 * check target is token or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Token}
 */
function isToken(target) {
    if (!target)
        return false;
    switch (typeof target) {
        case 'function':
            return (0, type_1.isNewable)(target);
        case 'string':
            return true;
        // case 'symbol':
        //     return true
        case 'object':
            return target instanceof tokens_1.InjectToken;
        default:
            return false;
    }
}
//# sourceMappingURL=token.js.map