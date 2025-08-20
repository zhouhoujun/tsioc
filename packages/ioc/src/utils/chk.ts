import { Observable } from 'rxjs';
import { Type, AbstractType } from '../types';


export { isObservable } from 'rxjs';

declare let process: any;


/**
 * check target is function or not.
 *
 * @export
 * @param {*} t
 * @returns
 */
export function isFunction(t: any): t is Function {
    return typeof t === 'function'
}

const fnc$ = /^function\s+\(|^function\s+anonymous\(/;
const class$ = /^[\s\S]*class\s+/;
const fncallErr = `cannot be invoked without 'new'`;


const newable = Symbol('newable');
interface Newable extends Function {
    [newable]?: boolean;
}

/**
 * this fn can use new or not.
 * @param fn 
 * @returns 
 */
export function isNewable(fn: Function): boolean {
    if (!fn.prototype || fn.prototype.constructor !== fn) return false;
    if (typeof Symbol.hasInstance !== 'undefined') {
        return fn[Symbol.hasInstance] ? true : false;
    }
    if (isBoolean((fn as Newable)[newable])) return (fn as Newable)[newable] as boolean;

    const str = String(fn);
    if (class$.test(str)) return true;
    if (fnc$.test(str)) return false;

    try {
        fn();
        (fn as Newable)[newable] = false;
        return false;
    } catch (err: any) {
        if (err.toString().indexOf(fncallErr) > 0) {
            (fn as Newable)[newable] = true;
            return true;
        }
        (fn as Newable)[newable] = false;
        return false;
    }
}

/**
 * is abstract type or not.
 * @param t 
 * @returns 
 */
export function isAbstractType(t: any): t is AbstractType<any> {
    return typeof t === 'function' && isNewable(t);
}

/**
 * is type or not.
 * @param t 
 * @returns 
 */
export function isType(t: any): t is Type<any> {
    return isAbstractType(t) && !isPrimitive(t)
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
    return !!target && target instanceof Promise // || (target && isFunction(target.then) && isFunction(target.catch))
}

/**
 * is promise like or not.
 * @param target 
 * @returns 
 */
export function isPromiseLike(target: any): boolean {
    return toString.call(target) == '[object Promise]' || (target && isFunction(target.then) && isFunction(target.catch))
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
export function isObject(target: any): boolean {
    return !!target && target instanceof Object;
}


const hasOwnProperty = Object.hasOwnProperty;
/**
 * has own property or not.
 * @param target 
 * @param property 
 * @returns 
 */
export function hasOwn(target: any, property: string | symbol) {
    return hasOwnProperty.call(target, property)
}

/**
 * has any property or not.
 * @param target 
 * @returns 
 */
export function hasProps(target: any): boolean {
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
export function isDate(target: any): target is Date {
    return !!target && target instanceof Date //|| toString.call(target) === '[object Date]'
}

/**
 * check target is symbol or not.
 *
 * @export
 * @param {*} target
 * @returns {target is symbol}
 */
export function isSymbol(target: any): target is symbol {
    return typeof target === 'symbol' // || toString.call(target) === '[object Symbol]'
}


/**
 * check target is regexp or not.
 *
 * @export
 * @param {*} target
 * @returns {target is RegExp}
 */
export function isRegExp(target: any): target is RegExp {
    return !!target && target instanceof RegExp // || toString.call(target) === '[object RegExp]'
}


/**
 * check target is primitive type or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isPrimitiveType(target: any): boolean {
    return isFunction(target) && isPrimitive(target)
}

export function isIterableType(target: Function): boolean {
    return target === Array
        || target === Set
        || target === Map
        || target === WeakMap
        || target === WeakSet
}

export function isPrimitive(target: Function): boolean {
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
    return isBasicType(getType(target))
}
export function isBasicType(target: Function): boolean {
    return target === Function
        || target === String
        || target === Number
        || target === BigInt
        || target === Boolean
        || target === Date
        || target === Symbol
}


/**
 * get type of object.
 *
 * @export
 * @param {*} target
 * @returns {Type}
 */
export function getType(target: any): Type {
    if (isType(target)) {
        return target
    }
    return target.constructor || target.prototype.constructor
}

