"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNewable = isNewable;
exports.isType = isType;
exports.isPrimitiveType = isPrimitiveType;
exports.isIterableType = isIterableType;
exports.isPrimitive = isPrimitive;
exports.isBasic = isBasic;
exports.isBasicType = isBasicType;
exports.getType = getType;
exports.getTypeName = getTypeName;
const rxjs_1 = require("rxjs");
const type_def_1 = require("./type.def");
const fnc$ = /^function\s*\(|^function\s+anonymous\(/;
const class$ = /^[\s\S]*class\s+/;
const hasInst = Symbol('hasInst');
/**
 * this fn can use new or not.
 * @param fn
 * @returns
 */
function isNewable(fn) {
    if (!fn.prototype || fn.prototype.constructor !== fn)
        return false;
    if (typeof Symbol.hasInstance !== 'undefined') {
        return fn[Symbol.hasInstance] ? true : false;
    }
    const has = fn[hasInst];
    if (typeof has === 'boolean')
        return has;
    const str = String(fn);
    if (class$.test(str)) {
        return setResult(fn, true);
    }
    if (fnc$.test(str)) {
        return setResult(fn, false);
    }
    // complier min js, get anncation.
    const def = (0, type_def_1.getDef)(fn);
    if (def) {
        return setResult(fn, true);
    }
    else {
        return setResult(fn, false);
    }
}
function setResult(fn, result) {
    fn[hasInst] = result;
    return result;
}
/**
 * is type or not.
 * @param t
 * @returns
 */
function isType(t) {
    return typeof t === 'function' && !isPrimitive(t) && isNewable(t);
}
/**
 * check target is primitive type or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
function isPrimitiveType(target) {
    return typeof target === 'function' && isPrimitive(target);
}
function isIterableType(target) {
    return target === Array
        || target === Set
        || target === Map;
    // || target === WeakMap
    // || target === WeakSet
}
function isPrimitive(target) {
    return isBasicType(target)
        || isIterableType(target)
        || target === Object
        || target === Promise
        || target === rxjs_1.Observable;
}
/**
 * is target basic type, value or not.
 * @param target
 * @returns
 */
function isBasic(target) {
    return isBasicType(getType(target));
}
function isBasicType(target) {
    return target === Function
        || target === String
        || target === Number
        || target === BigInt
        || target === Boolean
        || target === Date
        || target === Symbol;
}
/**
 * get type of object.
 *
 * @export
 * @param {*} target
 * @returns {Type}
 */
function getType(target) {
    if (isType(target)) {
        return target;
    }
    return target.constructor || target.prototype.constructor;
}
/**
 * get type name.
 *
 * @export
 * @param {} target
 * @returns {string}
 */
function getTypeName(target) {
    const classType = getType(target);
    if (!classType) {
        return '';
    }
    return classType.ƿAnn?.()?.name ?? classType.name;
}
//# sourceMappingURL=type.js.map