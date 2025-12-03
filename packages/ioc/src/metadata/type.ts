import { Observable } from 'rxjs';
import { getDef } from './type.def';
import { AnnotationType, Type } from '../types';


const fnc$ = /^function\s*\(|^function\s+anonymous\(/;
const class$ = /^[\s\S]*class\s+/;


const hasInst = Symbol('hasInst');
interface Newable extends Function {
    [hasInst]?: boolean;
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
    const has = (fn as Newable)[hasInst];
    if (typeof has === 'boolean') return has;

    const str = String(fn);
    if (class$.test(str)) {
        return setResult(fn, true)
    }
    if (fnc$.test(str)) {
        return setResult(fn, false);
    }
    
    // complier min js, get anncation.
    const def = getDef(fn);
    if (def) {
        return setResult(fn, true);
    } else {
        return setResult(fn, false);
    }
}

function setResult(fn: Function, result: boolean): boolean {
    (fn as Newable)[hasInst] = result;
    return result;
}

/**
 * is type or not.
 * @param t 
 * @returns 
 */
export function isType(t: any): t is Type<any> {
    return typeof t === 'function' && !isPrimitive(t) && isNewable(t)
}


/**
 * check target is primitive type or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isPrimitiveType(target: any): boolean {
    return typeof target === 'function' && isPrimitive(target)
}

export function isIterableType(target: Function): boolean {
    return target === Array
        || target === Set
        || target === Map
    // || target === WeakMap
    // || target === WeakSet
}

export function isPrimitive(target: Function): boolean {
    return isBasicType(target)
        || isIterableType(target)
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


/**
 * get type name.
 *
 * @export
 * @param {} target
 * @returns {string}
 */
export function getTypeName(target: any): string {
    const classType = getType(target);
    if (!classType) {
        return ''
    }
    return (classType as AnnotationType).ƿAnn?.()?.name ?? classType.name
}