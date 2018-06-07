import { ObjectMap } from '../types';
import { isArray, isObject } from './typeCheck';
import * as objPonyfill from 'object.assign';

objPonyfill.shim();

/**
 * get object keys.
 *
 * @param {*} target
 * @returns {string[]}
 */
export function keys(target: any): string[] {
    if (isObject(target)) {
        return Object.keys(target);
    }
    return [];
}

/**
 * assign
 *
 * @export
 * @template T
 * @param {T} target
 * @param {...any[]} source
 * @returns {T}
 */
export function assign<T, U, V>(target: T, source1: U, source2?: V, sources?: any[]): (T & U & V) | (T & U) {
    if (sources && sources.length) {
        sources.unshift(source2 || {});
        sources.unshift(source1 || {});
        return Object.assign(target as any, ...sources);
    } else if (source2) {
        return Object.assign(target, source1 || {} as U, source2);
    } else {
        return Object.assign(target, source1 || {} as U);
    }
}

/**
 * create an new object from target object omit some field.
 *
 * @export
 * @param {ObjectMap<any>} target
 * @param {...string[]} fields
 * @returns {*}
 */
export function omit(target: ObjectMap<any>, ...fields: string[]): any {
    if (isObject(target)) {
        let result: any = {};
        Object.keys(target).forEach(key => {
            if (fields.indexOf(key) < 0) {
                result[key] = target[key];
            }
        });
        return result;
    } else {
        return target;
    }
}

/**
 * object has field or not.
 *
 * @export
 * @param {ObjectMap<any>} target
 * @returns
 */
export function hasField(target: ObjectMap<any>) {
    if (isObject(target)) {
        return Object.keys(target).length > 0;
    }
    return false;
}

/**
 * for in opter for object or array.
 *
 * @export
 * @template T
 * @param {(ObjectMap<T> | T[])} target
 * @param {(item: T, idx?: number|string) => void|boolean} iterator
 */
export function forIn<T>(target: ObjectMap<T> | T[], iterator: (item: T, idx?: number | string) => void | boolean) {
    if (isArray(target)) {
        target.forEach(iterator);
    } else if (isObject(target)) {
        Object.keys(target).forEach((key, idx) => {
            iterator(target[key], key);
        });
    }
}

/**
 * find
 *
 * @template T
 * @param {(ObjectMap<T> | T[])} target
 * @param {((item: T, idx?: number | string) => boolean)} express
 */
export function find<T>(target: ObjectMap<T> | T[], express: (item: T, idx?: number | string) => boolean) {
    let item: T;
    forIn(target, (it, idx) => {
        if (!item) {
            if (express(it, idx)) {
                item = it;
                return false;
            }
            return true;
        } else {
            return false;
        }
    })
}


/**
 * first.
 *
 * @export
 * @template T
 * @param {T[]} list
 * @returns {T}
 */
export function first<T>(list: T[]): T {
    if (isArray(list) && list.length) {
        return list[0];
    }
    return null;
}

/**
 * last.
 *
 * @export
 * @template T
 * @param {T[]} list
 * @returns {T}
 */
export function last<T>(list: T[]): T {
    if (isArray(list) && list.length) {
        return list[list.length - 1];
    }
    return null;
}

