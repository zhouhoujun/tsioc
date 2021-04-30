import { TypeReflect } from '../decor/type';
import { InjectToken } from '../tokens';
import { AbstractType, AnnotationType, ClassType, ObjectMap, Type } from '../types';
import { clsNameExp, reflFiled } from './exps';
import { getClassAnnotation } from './util';


declare let process: any;
const toString = Object.prototype.toString;

const funKey = 'function';
const undefKey = 'undefined';
/**
 * check target is function or not.
 *
 * @export
 * @param {*} target
 * @returns
 */
export function isFunction(target: any): target is Function {
    return typeof target === funKey;
}

/**
 * is run in nodejs or not.
 *
 * @export
 * @returns {boolean}
 */
export function isNodejsEnv(): boolean {
    return (typeof process !== undefKey) && (typeof process.versions.node !== undefKey)
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
    return toString.call(target) === promiseTag || target instanceof Promise || (target && typeof target.then === funKey && typeof target.catch === funKey);
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
    return toString.call(target) === obsTag || (target && typeof target.subscribe === funKey);
}

const strKey = 'string';
/**
 * check target is string or not.
 *
 * @export
 * @param {*} target
 * @returns {target is string}
 */
export function isString(target: any): target is string {
    return typeof target === strKey;
}


const boolKey = 'boolean';
/**
 * check target is boolean or not.
 *
 * @export
 * @param {*} target
 * @returns {target is boolean}
 */
export function isBoolean(target: any): target is boolean {
    return typeof target === boolKey;
}

const numKey = 'number';
/**
 * check target is number or not.
 *
 * @export
 * @param {*} target
 * @returns {target is number}
 */
export function isNumber(target: any): target is number {
    return typeof target === numKey;
}

/**
 * check target is undefined or not.
 *
 * @export
 * @param {*} target
 * @returns {target is undefined}
 */
export function isUndefined(target: any): target is undefined {
    return typeof target === undefKey;
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
export function isNil(target): boolean {
    return isNull(target) || isUndefined(target);
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
    return !isNil(target);
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

const objectKey = 'object';

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
    return (type === objectKey || type === funKey);
}


const objTag = '[object Object]';
const objName = 'Object';
/**
 * is custom class type instance or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isTypeObject(target: any): boolean {
    return toString.call(target) === objTag && target.constructor.name !== objName && !(target instanceof InjectToken);
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
export function isPlainObject<T = ObjectMap>(target: any): target is T {
    return toString.call(target) === objTag && target.constructor.name === objName;
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
            if (props.some(ps => isString(ps) ? ps === n : ps.includes(n))) {
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
const symKey = 'symbol';
/**
 * check target is symbol or not.
 *
 * @export
 * @param {*} target
 * @returns {target is symbol}
 */
export function isSymbol(target: any): target is symbol {
    return typeof target === symKey || toString.call(target) === symbolTag;
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



const native = /\[native code\]/;
/**
 * is native type or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isNative(target: any): boolean {
    return isFunction(target) && native.test(target.toString());
}

/**
 * check target is primitive type or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isPrimitiveType(target): boolean {
    return isFunction(target) && isPrimitive(target);
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
        || target === Promise;
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
    return isClassType(target, true);
}


/**
 * check target is class or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Type}
 */
export function isClass(target: any): target is Type {
    return isClassType(target, false);
}


/**
 * anonyous or array func
 */
const anon = /^function\s+\(|^function\s+anonymous\(|^\(?(\w+,)*\w+\)?\s*\=\>|^\(\s*\)\s*\=\>/;

export function isAnnotation(target: any): target is AnnotationType {
    if (!isFunction(target)) return false;
    if (!target.name || !target.prototype) return false;
    if (target.prototype.constructor !== target) return false;

    return target[reflFiled]?.()?.type === target;
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

    const rf: TypeReflect = target[reflFiled]?.();
    if (rf) return isBoolean(abstract) ? (abstract && rf.type === target ? rf.abstract : !rf.abstract) : true;

    const ann = getClassAnnotation(target);
    if (ann) return isBoolean(abstract) ? (abstract ? ann.abstract : !ann.abstract) : true;

    if (!clsNameExp.test(target.name)) return false;
    if (isPrimitive(target)) return false;
    const pkeys = Object.getOwnPropertyNames(target);
    if (pkeys.includes('caller')) return false;
    if (pkeys.length > 3) return true;
    return !anon.test(target.toString());
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
