import { TypeReflect } from '../decor/type';
import { AbstractType, ClassType, ObjectMap, Type } from '../types';
import { reflFiled } from './exps';
import { hasDesignAnno } from './util';


declare let process: any;
const native = /native code/;
const toString = Object.prototype.toString;

/**
 * check target is function or not.
 *
 * @export
 * @param {*} target
 * @returns
 */
export function isFunction(target: any): target is Function {
    return typeof target === 'function';
}

/**
 * check Abstract class with @Abstract or not
 *
 * @export
 * @param {*} target
 * @returns {target is AbstractType}
 */
export function isAbstractClass(target: any): target is AbstractType {
    return classCheck(target, true)
}


/**
 * check target is class or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Type}
 */
export function isClass(target: any): target is Type {
    return classCheck(target, false)
}

/**
 * is class or not.
 *
 * @export
 * @param {*} target
 * @returns {target is ClassType}
 */
export function isClassType(target: any): target is ClassType {
    return classCheck(target);
}

function classCheck(target: any, abstract?: boolean): boolean {
    if (!isFunction(target)) return false;

    if (!target.name || !target.prototype) return false;

    let rf: TypeReflect = target[reflFiled]?.();

    if (rf) {
        if (isBoolean(abstract) && rf.type === target) {
            return abstract ? rf.abstract : !rf.abstract;
        }
        return true;
    }

    if (hasDesignAnno(target)) return true;

    if (isBaseType(target)) return false;

    return Object.getOwnPropertyNames(target).indexOf('caller') < 0;
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

const promiseTag = '[object Promise]';
/**
 * is target promise or not. now check is es6 Promise only.
 *
 * @export
 * @param {*} target
 * @returns {target is Promise<any>}
 */
export function isPromise(target: any): target is Promise<any> {
    return toString.call(target) === promiseTag
        || (target && typeof target.then === 'function' && typeof target.catch === 'function');
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
    return toString.call(target) === obsTag || (target && typeof target.subscribe === 'function');
}

const strTag = '[object String]';
/**
 * check target is string or not.
 *
 * @export
 * @param {*} target
 * @returns {target is string}
 */
export function isString(target: any): target is string {
    return typeof target === 'string' || toString.call(target) === strTag;
}

const boolTag = '[object Boolean]';
/**
 * check target is boolean or not.
 *
 * @export
 * @param {*} target
 * @returns {target is boolean}
 */
export function isBoolean(target: any): target is boolean {
    return typeof target === 'boolean' || toString.call(target) === boolTag;
}


const numbTag = '[object Number]';
/**
 * check target is number or not.
 *
 * @export
 * @param {*} target
 * @returns {target is number}
 */
export function isNumber(target: any): target is number {
    return typeof target === 'number' || toString.call(target) === numbTag;
}

/**
 * check target is undefined or not.
 *
 * @export
 * @param {*} target
 * @returns {target is undefined}
 */
export function isUndefined(target: any): target is undefined {
    return target === undefined;
}

/**
 * check target is unll or not.
 *
 * @export
 * @param {*} target
 * @returns {target is null}
 */
export function isNull(target: any): target is null {
    return target === null;
}

/**
 * is target null or undefined.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isNullOrUndefined(target): boolean {
    return target === null || target === undefined;
}

/**
 * check taget is defined.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isDefined(target: any): boolean {
    return !isNullOrUndefined(target);
}

/**
 * check target is array or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Array<any>}
 */
export function isArray(target: any): target is Array<any> {
    return Array.isArray(target);
}

/**
 * check target is object or not.
 *
 * @export
 * @param {*} target
 * @returns {target is object}
 */
export function isObject(target: any): target is object {
    const type = typeof target;
    return target !== null && (type === 'object' || type === 'function');
}


const objTag = '[object Object]';

/**
 * is custom class type instance or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isTypeObject(target: any): boolean {
    return toString.call(target) === objTag && target.constructor.name !== 'Object';
}


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
export function isPlainObject(target: any): target is ObjectMap {
    return toString.call(target) === objTag && target.constructor.name === 'Object';
}

/**
 * is target base object or not.
 * eg. {}, have not self constructor;
 *
 * @deprecated use `isPlainObject` instead.
 */
export const isBaseObject = isPlainObject;

/**
 * is metadata object or not.
 *
 * @export
 * @param {*} target
 * @param {...(string|string[])[]} props
 * @returns {boolean}
 */
export function isMetadataObject(target: any, ...props: (string | string[])[]): boolean {
    if (!isPlainObject(target)) return false;
    if (props.length) {
        for (let n in target) {
            if (props.some(ps => isString(ps) ? ps === n : ps.indexOf(n) > 0)) {
                return true;
            }
        }
        return false;
    }

    return true;
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
    return toString.call(target) === dateTag;
}

const symbolTag = '[object Symbol]';
/**
 * check target is symbol or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Symbol}
 */
export function isSymbol(target: any): target is Symbol {
    return typeof target === 'symbol' || toString.call(target) === symbolTag;
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
    return toString.call(target) === regTag;
}

/**
 * is base type or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isBaseType(target: any): boolean {
    return typeof target === 'function' && native.test(target.toString());
}

/**
 * target is primitive type or not.
 * @param target
 */
export function isPrimitive(target: any): boolean {
    const type = typeof target;
    return type === 'string'
        || type === 'number'
        || type === 'symbol'
        || type === 'boolean';
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
        return null;
    }
    if (isClassType(target)) {
        return target as Type;
    }
    return target.constructor || target.prototype.constructor;
}
/**
 * check target is base value or not.
 *
 * @exportClassType
 */
export function isBaseValue(target: any): boolean {
    return isBaseType(getClass(target));
}
