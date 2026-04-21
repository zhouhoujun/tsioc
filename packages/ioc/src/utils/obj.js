"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBaseObject = void 0;
exports.isTypeObject = isTypeObject;
exports.isPlainObject = isPlainObject;
exports.isMetadataObject = isMetadataObject;
const tokens_1 = require("../tokens");
const chk_1 = require("./chk");
const objTag = '[object Object]';
const objName = 'Object';
/**
 * is custom class type instance or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
function isTypeObject(target) {
    return toString.call(target) === objTag && target.constructor.name !== objName && !(target instanceof tokens_1.InjectToken);
}
const moduleTag = '[object Module]';
/**
 * is target base object or not.
 * eg. {}, have not self constructor;
 *
 * Checks if `value` is a plain object, that is, an object created by the
 * `Object` constructor or one with a `[[Prototype]]` of `null`.
 * @export
 * @param {*} target
 * @returns {target is Promise<any>}
 */
function isPlainObject(target) {
    const ty = toString.call(target);
    return (ty === objTag || ty === moduleTag) && target.constructor.name === objName;
}
/**
 * is target base object or not.
 * eg. {}, have not self constructor;
 *
 * @deprecated use `isPlainObject` instead.
 */
exports.isBaseObject = isPlainObject;
/**
 * is metadata object or not.
 *
 * @export
 * @param {*} target
 * @param {...(string|string[])[]} props
 * @returns {boolean}
 */
function isMetadataObject(target, ...args) {
    if (!isPlainObject(target))
        return false;
    if (args.length) {
        const props = (0, chk_1.isArray)(args[0]) ? args[0] : args;
        const keys = Object.keys(target);
        for (const p of props) {
            if (keys.includes(p))
                return true;
        }
        return false;
    }
    return true;
}
//# sourceMappingURL=obj.js.map