import { Observable } from 'rxjs';
import { AnnotationType, ClassType, Type } from '../types';
export { isObservable } from 'rxjs';

declare let process: any;

export const toString = Object.prototype.toString;


/**
 * check target is function or not.
 *
 * @export
 * @param {*} target
 * @returns
 */
export function isFunction(target: any): target is Function {
    return typeof target === 'function'
}

/**
 * is type or not.
 * @param v 
 * @returns 
 */
export function isType(v: any): v is Type<any> {
    return isFunction(v) && !isPrimit(v)
}

/**
 * is class type or not.
 * @param v 
 * @returns 
 */
export function isClassType(v: any): v is ClassType<any> {
    return isType(v)
}


/**
 * is run in nodejs or not.
 *
 * @export
 * @returns {boolean}
 */
export function isNodejsEnv(): boolean {
    return (typeof process !== 'undefined') && (typeof process.versions.node !== 'undefined')
}

/**
 * is target promise or not. now check is es6 Promise only.
 *
 * @export
 * @param {*} target
 * @returns {target is Promise<any>}
 */
export function isPromise(target: any): target is Promise<any> {
    return toString.call(target) === '[object Promise]' || target instanceof Promise || (target && isFunction(target.then) && isFunction(target.catch))
}

/**
 * check target is string or not.
 *
 * @export
 * @param {*} target
 * @returns {target is string}
 */
export function isString(target: any): target is string {
    return typeof target === 'string'
}


/**
 * check target is boolean or not.
 *
 * @export
 * @param {*} target
 * @returns {target is boolean}
 */
export function isBoolean(target: any): target is boolean {
    return typeof target === 'boolean'
}

/**
 * check target is number or not.
 *
 * @export
 * @param {*} target
 * @returns {target is number}
 */
export function isNumber(target: any): target is number {
    return typeof target === 'number'
}

/**
 * check target is bigint or not.
 *
 * @export
 * @param {*} target
 * @returns {target is bigint}
 */
export function isBigInt(target: any): target is bigint {
    return typeof target === 'bigint'
}


/**
 * check target is undefined or not.
 *
 * @export
 * @param {*} target
 * @returns {target is undefined}
 */
export function isUndefined(target: any): target is undefined {
    return typeof target === 'undefined'
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
    return (type === 'object' || type === 'function')
}


const hasOwnProperty = Object.hasOwnProperty;

export function hasOwn(target: any, property: string) {
    return hasOwnProperty.call(target, property)
}

// const dateTag = '[object Date]';
/**
 * check target is date or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Date}
 */
export function isDate(target: any): target is Date {
    return toString.call(target) === '[object Date]'
}

/**
 * check target is symbol or not.
 *
 * @export
 * @param {*} target
 * @returns {target is symbol}
 */
export function isSymbol(target: any): target is symbol {
    return typeof target === 'symbol' || toString.call(target) === '[object Symbol]'
}


/**
 * check target is regexp or not.
 *
 * @export
 * @param {*} target
 * @returns {target is RegExp}
 */
export function isRegExp(target: any): target is RegExp {
    return target && (target instanceof RegExp  || toString.call(target) === '[object RegExp]')
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
    return isBasicType(target)
        || target === Object
        || target === Promise
        || target === Observable
}

/**
 * is target basic type, value or not.
 * @param target 
 * @returns 
 */
export function isBasic(target: any): boolean {
    return isBasicType(getClass(target))
}
function isBasicType(target: Function): boolean {
    return target === Function
        || target === String
        || target === Number
        || target === BigInt
        || target === Boolean
        || target === Array
        || target === Date
        || target === Symbol
}

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
        return target
    }
    return target.constructor || target.prototype.constructor
}

