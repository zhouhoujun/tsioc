"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNullOrUndefined = exports.isObservable = void 0;
exports.isFunction = isFunction;
exports.isNodejsEnv = isNodejsEnv;
exports.isPromise = isPromise;
exports.isPromiseLike = isPromiseLike;
exports.isString = isString;
exports.isBoolean = isBoolean;
exports.isNumber = isNumber;
exports.isBigInt = isBigInt;
exports.isUndefined = isUndefined;
exports.isNull = isNull;
exports.isNil = isNil;
exports.isDefined = isDefined;
exports.isArray = isArray;
exports.isObject = isObject;
exports.hasOwn = hasOwn;
exports.hasProps = hasProps;
exports.isDate = isDate;
exports.isSymbol = isSymbol;
exports.isProxy = isProxy;
exports.isRegExp = isRegExp;
var rxjs_1 = require("rxjs");
Object.defineProperty(exports, "isObservable", { enumerable: true, get: function () { return rxjs_1.isObservable; } });
/**
 * check target is function or not.
 *
 * @export
 * @param {*} t
 * @returns
 */
function isFunction(t) {
    return typeof t === 'function';
}
/**
 * is run in nodejs or not.
 *
 * @export
 * @returns {boolean}
 */
function isNodejsEnv() {
    return (typeof process !== 'undefined') && (typeof process.versions.node !== 'undefined');
}
/**
 * is target promise or not. now check is es6 Promise only.
 *
 * @export
 * @param {*} target
 * @returns {target is Promise<any>}
 */
function isPromise(target) {
    return !!target && target instanceof Promise; // || (target && isFunction(target.then) && isFunction(target.catch))
}
/**
 * is promise like or not.
 * @param target
 * @returns
 */
function isPromiseLike(target) {
    return toString.call(target) == '[object Promise]' || (target && isFunction(target.then) && isFunction(target.catch));
}
/**
 * check target is string or not.
 *
 * @export
 * @param {*} target
 * @returns {target is string}
 */
function isString(target) {
    return typeof target === 'string';
}
/**
 * check target is boolean or not.
 *
 * @export
 * @param {*} target
 * @returns {target is boolean}
 */
function isBoolean(target) {
    return typeof target === 'boolean';
}
/**
 * check target is number or not.
 *
 * @export
 * @param {*} target
 * @returns {target is number}
 */
function isNumber(target) {
    return typeof target === 'number';
}
/**
 * check target is bigint or not.
 *
 * @export
 * @param {*} target
 * @returns {target is bigint}
 */
function isBigInt(target) {
    return typeof target === 'bigint';
}
/**
 * check target is undefined or not.
 *
 * @export
 * @param {*} target
 * @returns {target is undefined}
 */
function isUndefined(target) {
    return typeof target === 'undefined';
}
/**
 * check target is unll or not.
 *
 * @export
 * @param {*} target
 * @returns {target is null}
 */
function isNull(target) {
    return target === null;
}
/**
 * is target null or undefined.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
function isNil(target) {
    return isNull(target) || isUndefined(target);
}
/**
 * is target null or undefined.
 */
exports.isNullOrUndefined = isNil;
/**
 * check taget is defined.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
function isDefined(target) {
    return !isNil(target);
}
/**
 * check target is array or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Array<any>}
 */
function isArray(target) {
    return Array.isArray(target);
}
/**
 * check target is object or not.
 *
 * @export
 * @param {*} target
 * @returns {target is object}
 */
function isObject(target) {
    return !!target && target instanceof Object;
}
const hasOwnProperty = Object.hasOwnProperty;
/**
 * has own property or not.
 * @param target
 * @param property
 * @returns
 */
function hasOwn(target, property) {
    return hasOwnProperty.call(target, property);
}
/**
 * has any property or not.
 * @param target
 * @returns
 */
function hasProps(target) {
    return isObject(target) && Object.keys(target).length > 0;
}
// const dateTag = '[object Date]';
/**
 * check target is date or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Date}
 */
function isDate(target) {
    return !!target && target instanceof Date; //|| toString.call(target) === '[object Date]'
}
/**
 * check target is symbol or not.
 *
 * @export
 * @param {*} target
 * @returns {target is symbol}
 */
function isSymbol(target) {
    return typeof target === 'symbol'; // || toString.call(target) === '[object Symbol]'
}
function isProxy(obj) {
    return !!obj
        && toString.call(obj) === '[object Object]'
        && obj.__proto__ === Proxy;
}
/**
 * check target is regexp or not.
 *
 * @export
 * @param {*} target
 * @returns {target is RegExp}
 */
function isRegExp(target) {
    return !!target && target instanceof RegExp; // || toString.call(target) === '[object RegExp]'
}
//# sourceMappingURL=chk.js.map