import { ObjectMap, Type, Token, AbstractType } from '../types';
import { isNullOrUndefined, isArray, isObject, isFunction, isClass, isAbstractClass } from './typeCheck';
// use core-js in browser.



/**
 * map set  for tsioc old version.
 *
 * @export
 * @class MapSet
 * @template K
 * @template V
 */
export class MapSet<K, V> {
    protected map: Map<K, V>;

    get size(): number {
        return this.map.size;
    }

    constructor() {
        this.map = new Map();
    }

    clear(): void {
        this.map.clear();
    }
    delete(key: K): boolean {
        return this.map.delete(key);
    }
    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
        this.map.forEach(callbackfn, thisArg);
    }
    get(key: K): V | undefined {
        return this.map.get(key);
    }
    has(key: K): boolean {
        return this.map.has(key);
    }
    set(key: K, value: V): this {
        this.map.set(key, value);
        return this;
    }

    keys(): K[] {
        return Array.from(this.map.keys());
    }

    values(): V[] {
        return Array.from(this.map.values());
    }
}

export namespace lang {
    /**
     * assert param is right or not.
     *
     * @export
     * @param {*} param
     * @param {(string | Function)} msg
     */
    export function assert(param: any, msg: string | Function) {
        if (isNullOrUndefined(param)) {
            throw new Error(isFunction(msg) ? msg(param) : msg);
        }
    }
    /**
     * check assert param invalid by express
     *
     * @export
     * @param {(boolean | (() => boolean))} express
     * @param {(string | Function)} msg
     */
    export function assertExp(express: boolean | (() => boolean), msg: string | Function) {
        if (!(isFunction(express) ? express() : express)) {
            throw new Error(isFunction(msg) ? msg() : msg);
        }
    }
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
            target.some((it, idx) => iterator(it, idx) === false);
        } else if (isObject(target)) {
            keys(target).some((key, idx) => iterator(target[key], key) === false);
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
                return true;
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

    /**
     * get class name.
     *
     * @export
     * @param {AbstractType<any>} target
     * @returns {string}
     */
    export function getClassName(target: any): string {
        let classType = isFunction(target) ? target : getClass(target);
        if (!isFunction(classType)) {
            return '';
        }
        if (/^[a-z]$/.test(classType.name)) {
            return classType.classAnnations ? classType.classAnnations.name : classType.name;
        }
        return classType.name;
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
    export function getClassChain(target: Type<any>): Type<any>[] {
        let types: Type<any>[] = [];
        forInClassChain(target, type => {
            types.push(target);
        });
        return types;
    }

    /**
     * iterate base classes of target in chain. return false will break iterate.
     *
     * @export
     * @param {Type<any>} target
     * @param {(token: Type<any>) => any} express
     */
    export function forInClassChain(target: Type<any>, express: (token: Type<any>) => any): void {
        while (isClass(target) && target !== Object) {
            if (express(target) === false) {
                break;
            }
            target = getParentClass(target);
        }
    }

    /**
     * target is extends class of baseClass or not.
     *
     * @export
     * @param {Token<any>} target
     * @param {(Type<any> | ((type: Type<any>) => boolean))} baseClass
     * @returns {boolean}
     */
    export function isExtendsClass(target: Token<any>, baseClass: Type<any> | AbstractType<any> | ((type: Type<any>) => boolean)): boolean {
        let isExtnds = false;
        if (isClass(target)) {
            forInClassChain(target, t => {
                if (isClass(baseClass) || isAbstractClass(baseClass)) {
                    isExtnds = t === baseClass;
                } else {
                    isExtnds = baseClass(t);
                }
                return !isExtnds;
            });
        }
        return isExtnds;
    }

    /**
     *  action handle.
     */
    export type ActionHandle<T> = (ctx: T, next?: () => Promise<void>) => Promise<void>;

    /**
     * run action in chain.
     *
     * @export
     * @template T
     * @param {ActionHandle<T>[]} handles
     * @param {T} ctx
     * @param {() => Promise<void>} [next]
     * @returns {Promise<void>}
     */
    export function runInChain<T>(handles: ActionHandle<T>[], ctx: T, next?: () => Promise<void>): Promise<void> {
        let index = -1;
        return dispatch(0);
        function dispatch(idx: number): Promise<any> {
            if (idx <= index) {
                return Promise.reject('next called mutiple times');
            }
            index = idx;
            let handle = idx < handles.length ? handles[idx] : null;
            if (idx === handles.length) {
                handle = next;
            }
            if (!handle) {
                return Promise.resolve();
            }
            try {
                return Promise.resolve(handle(ctx, dispatch.bind(null, idx + 1)));
            } catch (err) {
                return Promise.reject(err);
            }
        }
    }
}
