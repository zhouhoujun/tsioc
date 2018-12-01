import { ObjectMap, Type } from '../types';
import { isNullOrUndefined, isArray, isObject, isFunction, isClass } from './typeCheck';
// use core-js in browser.

export namespace lang {

    /**
     * get object keys.
     *
     * @param {*} target
     * @returns {string[]}
     */
    export function keys(target: any): string[] {
        if (isObject(target)) {
            if (isFunction(Object.keys)) {
                return Object.keys(target);
            }
        }
        return [];
    }

    /**
     * values of target object.
     *
     * @export
     * @param {*} target
     * @returns {any[]}
     */
    export function values(target: any): any[] {
        if (isObject(target)) {
            if (isFunction(Object.values)) {
                return Object.values(target);
            } else {
                return keys(target).map(n => target[n]);
            }
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
            keys(target).forEach(key => {
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
        return keys(target).length > 0;
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
            keys(target).forEach((key, idx) => {
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
     * get target type parent class.
     *
     * @export
     * @param {Type<any>} target
     * @returns {Type<any>}
     */
    export function getParentClass(target: Type<any>): Type<any> {
        let p = Reflect.getPrototypeOf(target.prototype);
        return isClass(p) ? p : p.constructor as Type<any>;
    }

    /**
     * get all parent class in chain.
     *
     * @export
     * @param {Type<any>} target
     * @returns {Type<any>[]}
     */
    export function getBaseClasses(target: Type<any>): Type<any>[] {
        let types: Type<any>[] = [];
        while (isClass(target) && target !== Object) {
            types.push(target);
            target = lang.getParentClass(target);
        }
        return types;
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

    /**
     * get calss of object.
     *
     * @export
     * @param {*} target
     * @returns {Type<any>}
     */
    export function getClass(target: any): Type<any> {
        if (isNullOrUndefined(target)) {
            return null;
        }
        if (isClass(target)) {
            return target;
        }
        return target.constructor || target.prototype.constructor;
    }
}
