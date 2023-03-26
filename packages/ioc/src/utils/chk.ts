import { AnnotationType, ClassType, Type } from '../types';


declare let process: any;

export const toString = Object.prototype.toString;
export const _tyfunc = 'function';
export const _tyundef = 'undefined';
export const _tystr = 'string';
export const _tybool = 'boolean';
export const _tynum = 'number';
export const _tysymbol = 'symbol';
export const _tybigint = 'bigint';
export const _tyobj = 'object';


export { isObservable } from 'rxjs';
/**
 * check target is function or not.
 *
 * @export
 * @param {*} target
 * @returns
 */
export function isFunction(target: any): target is Function {
    return typeof target === _tyfunc
}

/**
 * is type or not.
 * @param v 
 * @returns 
 */
export function isType(v: any): v is Type<any> {
    return typeof v === _tyfunc;
}
/**
 * is class type or not.
 * @param v 
 * @returns 
 */
export function isClassType(v: any): v is ClassType<any> {
    return typeof v === _tyfunc;
}

/**
 * is run in nodejs or not.
 *
 * @export
 * @returns {boolean}
 */
export function isNodejsEnv(): boolean {
    return (typeof process !== _tyundef) && (typeof process.versions.node !== _tyundef)
}

const promiseTag = '[object Promise]';
/**
 * is target promise or not. now check is es6 Promise only.
 *
 * @export
 * @param {*} target
 * @returns {target is Promise<any>}
 */
export function isPromise(target: any): target is Promise<any> {
    return toString.call(target) === promiseTag || target instanceof Promise || (target && typeof target.then === _tyfunc && typeof target.catch === _tyfunc)
}

/**
 * check target is string or not.
 *
 * @export
 * @param {*} target
 * @returns {target is string}
 */
export function isString(target: any): target is string {
    return typeof target === _tystr
}


/**
 * check target is boolean or not.
 *
 * @export
 * @param {*} target
 * @returns {target is boolean}
 */
export function isBoolean(target: any): target is boolean {
    return typeof target === _tybool
}

/**
 * check target is number or not.
 *
 * @export
 * @param {*} target
 * @returns {target is number}
 */
export function isNumber(target: any): target is number {
    const type = typeof target;
    return type === _tynum || type === _tybigint
}

/**
 * check target is undefined or not.
 *
 * @export
 * @param {*} target
 * @returns {target is undefined}
 */
export function isUndefined(target: any): target is undefined {
    return typeof target === _tyundef
}


/**
 * check target is unll or not.
 *
 * @export
 * @param {*} target
 * @returns {target is null}
 */
export function isNull(target: any): target is null {
    return target === null
}

/**
 * is target null or undefined.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isNil(target: any): target is (null | undefined) {
    return isNull(target) || isUndefined(target)
}

/**
 * is target null or undefined.
 */
export const isNullOrUndefined = isNil;

/**
 * check taget is defined.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isDefined(target: any): boolean {
    return !isNil(target)
}

/**
 * check target is array or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Array<any>}
 */
export function isArray(target: any): target is Array<any> {
    return Array.isArray(target)
}

/**
 * check target is object or not.
 *
 * @export
 * @param {*} target
 * @returns {target is object}
 */
export function isObject(target: any): target is object {
    if (isNull(target)) return false;
    const type = typeof target;
    return (type === _tyobj || type === _tyfunc)
}


const hasOwnProperty = Object.hasOwnProperty;

export function hasOwn(target: any, property: string) {
    return hasOwnProperty.call(target, property)
}

const dateTag = '[object Date]';
/**
 * check target is date or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Date}
 */
export function isDate(target: any): target is Date {
    return toString.call(target) === dateTag
}

const symbolTag = '[object Symbol]';
/**
 * check target is symbol or not.
 *
 * @export
 * @param {*} target
 * @returns {target is symbol}
 */
export function isSymbol(target: any): target is symbol {
    return typeof target === _tysymbol || toString.call(target) === symbolTag
}

const regTag = '[object RegExp]';
/**
 * check target is regexp or not.
 *
 * @export
 * @param {*} target
 * @returns {target is RegExp}
 */
export function isRegExp(target: any): target is RegExp {
    return toString.call(target) === regTag
}



const native = /\[native code\]/;
/**
 * is native type or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isNative(target: any): boolean {
    return isFunction(target) ? native.test(target.toString()) : native.test(getClass(target).toString())
}

/**
 * check target is primitive type or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isPrimitiveType(target: any): boolean {
    return isFunction(target) && isPrimit(target)
}

export function isPrimitive(target: any): boolean {
    return isPrimit(getClass(target));
}

function isPrimit(target: Function): boolean {
    return target === Function
        // || target === Object
        || target === String
        || target === Number
        || target === Boolean
        || target === Array
        || target === Date
        || target === Symbol
        || target === Promise
}

/**
 * is base type or not.
 *
 * @deprecated use `isPrimitiveType` instead.
 */
export const isBaseType = isPrimitiveType;

export function isAnnotation(target: any): target is AnnotationType {
    if (!isFunction(target)) return false;
    if (!target.name || !target.prototype) return false;
    if (target.prototype.constructor !== target) return false;

    return (target as AnnotationType).ƿAnn?.()?.type === target
}

/**
 * get class of object.
 *
 * @export
 * @param {*} target
 * @returns {Type}
 */
export function getClass(target: any): Type {
    if (!target) {
        return null!
    }
    if (isType(target)) {
        return target as Type
    }
    return target.constructor || target.prototype.constructor
}

