import { TypeReflect } from '../metadata/type';
import { AbstractType, AnnotationType, ClassType, Type } from '../types';
import { clsNameExp } from './exps';
import { getClassAnnotation } from './util';


declare let process: any;

export const toString = Object.prototype.toString;
export const type_func = 'function';
export const type_undef = 'undefined';
export const type_str = 'string';
export const type_bool = 'boolean';
export const type_num = 'number';
export const type_symbol = 'symbol';
export const type_bigint = 'bigint';
export const type_obj = 'object';

/**
 * check target is function or not.
 *
 * @export
 * @param {*} target
 * @returns
 */
export function isFunction(target: any): target is Function {
    return typeof target === type_func
}



/**
 * is run in nodejs or not.
 *
 * @export
 * @returns {boolean}
 */
export function isNodejsEnv(): boolean {
    return (typeof process !== type_undef) && (typeof process.versions.node !== type_undef)
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
    return toString.call(target) === promiseTag || target instanceof Promise || (target && typeof target.then === type_func && typeof target.catch === type_func)
}

const obsTag = '[object Observable]';
/**
 * is target rxjs observable or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isObservable(target: any): boolean {
    return toString.call(target) === obsTag || (target && typeof target.subscribe === type_func && target.lift === type_func)
}


/**
 * check target is string or not.
 *
 * @export
 * @param {*} target
 * @returns {target is string}
 */
export function isString(target: any): target is string {
    return typeof target === type_str
}


/**
 * check target is boolean or not.
 *
 * @export
 * @param {*} target
 * @returns {target is boolean}
 */
export function isBoolean(target: any): target is boolean {
    return typeof target === type_bool
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
    return type === type_num || type === type_bigint
}

/**
 * check target is undefined or not.
 *
 * @export
 * @param {*} target
 * @returns {target is undefined}
 */
export function isUndefined(target: any): target is undefined {
    return typeof target === type_undef
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
    return (type === type_obj || type === type_func)
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
    return typeof target === type_symbol || toString.call(target) === symbolTag
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
    return isFunction(target) && native.test(target.toString())
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

function isPrimitive(target: Function): boolean {
    return target === Function
        || target === Object
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


/**
 * check abstract class with @Abstract or not
 *
 * @export
 * @param {*} target
 * @returns {target is AbstractType}
 */
export function isAbstractClass(target: any): target is AbstractType {
    return isClassType(target, true)
}


/**
 * check target is class or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Type}
 */
export function isClass(target: any): target is Type {
    return isClassType(target, false)
}

export function isAnnotation(target: any): target is AnnotationType {
    if (!isFunction(target)) return false;
    if (!target.name || !target.prototype) return false;
    if (target.prototype.constructor !== target) return false;

    return (target as AnnotationType).ƿAnn?.()?.type === target
}

/**
 * is annotation class type or not.
 *
 * @export
 * @param {*} target
 * @returns {target is ClassType}
 */
export function isClassType(target: any, abstract?: boolean): target is ClassType {
    if (!isFunction(target)) return false;
    if (!target.name || !target.prototype) return false;
    if (target.prototype.constructor !== target) return false;

    const ann: TypeReflect = getClassAnnotation(target);
    if (ann) {
        if (isBoolean(abstract) && ann.type === target) return abstract ? ann.class.abstract === true : !ann.class.abstract;
        return true
    }

    const pkeys = Object.getOwnPropertyNames(target);
    // anonymous function
    if (pkeys.length < 3) return false;
    // not es5 prototype class define.
    if (pkeys.indexOf('caller') >= 0 && Object.getOwnPropertyNames(target.prototype).length < 2) return false;

    if (!clsNameExp.test(target.name)) return false;
    return !isPrimitive(target)
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
    if (isClassType(target)) {
        return target as Type
    }
    return target.constructor || target.prototype.constructor
}

