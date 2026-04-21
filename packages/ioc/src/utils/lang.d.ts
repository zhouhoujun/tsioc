import { AbstractType, Modules, Type } from '../types';
/**
 * assign source object to target object.
 *
 * @export
 * @param {any} target target object
 * @param {any} source source object
 * @param {...string[]} excludes  exclude fields
 * @returns {*}
 */
export declare function assign(target: any, source: any, ...excludes: string[]): any;
/**
 * create an new object from target object omit some field.
 *
 * @export
 * @param {any} target
 * @param {...string[]} excludes  exclude fields
 * @returns {*}
 */
export declare function omit(target: any, ...excludes: string[]): any;
/**
 * create new object with pick fields.
 * @param target
 * @param fields
 * @returns
 */
export declare function pick(target: any, ...fields: string[]): any;
/**
 * for in opter for object or array.
 *
 * @export
 * @template T
 * @param {(Record<string, T> | T[])} target
 * @param {(item: T, idx?: number|string) => void|boolean} iterator
 */
export declare function forIn<T = any>(target: Record<string, T>, iterator: (item: T, idx: string) => void | boolean): void;
export declare function forIn<T = any>(target: T[], iterator: (item: T, idx: number) => void | boolean): void;
/**
 * deep for each.
 * @param input
 * @param fn iterator callback.
 * @param isRecord is item record or not.
 * @param getRecord get record values.
 */
export declare function deepForEach<T>(input: (T | Record<string, T> | any[])[], fn: (value: T) => void | Promise<void>, isRecord?: (value: any) => boolean, getRecord?: (value: any) => T[]): void | Promise<void>;
/**
 * deep clone.
 * @param input
 * @returns
 */
export declare function deepClone<T>(input: T, defaultValue?: any, mergeArray?: (name: string, value: Array<any>, defaultArray: Array<any>) => Array<any>): T;
/**
 * first.
 *
 * @export
 * @template T
 * @param {T[]} list
 * @returns {T}
 */
export declare function first<T>(list: T[] | null | undefined): T;
/**
 * remove element.
 * @param list list
 * @param el remove item.
 */
export declare function remove<T>(list: T[] | null | undefined, el: T): T[] | null;
/**
 * last.
 *
 * @export
 * @template T
 * @param {T[]} list
 * @returns {T}
 */
export declare function last<T>(list?: T[]): T;
/**
 * get target type parent type.
 *
 * @export
 * @param {AbstractType} target
 * @returns {AbstractType}
 */
export declare function getParentType(target: AbstractType): AbstractType;
/**
 * get all parent type in chain.
 *
 * @export
 * @param {AbstractType} target
 * @returns {AbstractType[]}
 */
export declare function getTypeChain(target: AbstractType): AbstractType[];
/**
 * iterate base classes of target in chain. return false will break iterate.
 *
 * @export
 * @param {AbstractType} target
 * @param {(token: AbstractType) => any} express
 */
export declare function deepTypeChain(target: AbstractType, express: (token: AbstractType) => any): void;
/**
 * check array has item or not.
 * @param arr
 * @returns
 */
export declare function hasItem(arr: any): boolean;
/**
 * is base class type of.
 * @param target target type
 * @param baseType base class type.
 */
export declare function isBaseOf<T>(target: any, baseType: AbstractType<T>): target is AbstractType<T>;
/**
 * target is extends class of base type or not.
 *
 * @export
 * @param {Token} target
 * @param {(AbstractType | ((type: AbstractType) => boolean))} baseType
 * @returns {boolean}
 */
export declare function isExtends<T extends AbstractType>(target: AbstractType, baseType: T | ((type: T) => boolean)): target is T;
/**
 * get all class types in modules.
 *
 * @param {Modules[]} mds
 * @param {...Express<Type, boolean>[]} filters
 * @returns {Type[]}
 */
export declare function getTypes(mds: Modules | Modules[]): Type[];
/**
 * clean object.
 * @param obj.
 */
export declare function cleanObj(obj: any, keys?: string[]): void;
/**
 * defer
 *
 * @export
 * @class Defer
 * @template T
 */
export declare class Defer<T = any> {
    /**
     * create defer.
     *
     * @static
     * @template T
     * @param {((val: T) => T | PromiseLike<T>)} [then]
     * @returns {Defer<T>}
     */
    static create<C>(then?: (val: C) => C | PromiseLike<C>): Defer<C>;
    /**
     * promise.
     *
     * @type {Promise<T>}
     */
    promise: Promise<T>;
    /**
     * resolve.
     */
    resolve: (value?: T | PromiseLike<T>) => void;
    /**
     * reject.
     */
    reject: (reason?: any) => void;
    constructor();
}
/**
 * create defer.
 *
 * @export
 * @template T
 * @param {((val: T) => T | PromiseLike<T>)} [then]
 * @returns {Defer<T>}
 */
export declare function defer<T = any>(then?: (val: T) => T | PromiseLike<T>): Defer<T>;
/**
 * create delay.
 * @param times delay timeout ms.
 */
export declare function delay(times: number, work?: (...args: any[]) => void, ...args: any[]): Promise<void>;
export declare const immediate: typeof setImmediate | ((callback: (...args: any[]) => void, ...args: any[]) => Promise<void>);
export declare const nextTick: (callback: Function, ...args: any[]) => void;
/**
 * run promise step by step.
 *
 * @export
 * @template T
 * @param {(T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>))[]} promises
 * @param {T} initVal init value.
 * @param {(val: T) => boolean} guard can step next.
 * @returns
 */
export declare function step<T>(promises: (T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>))[], initVal?: T, guard?: (val: T) => boolean): Promise<T>;
/**
 * promise some.
 * @param promises
 * @param filter
 * @returns
 */
export declare function some<T>(promises: (T | PromiseLike<T> | ((value?: T) => T | PromiseLike<T>))[], filter: (v: T) => boolean): Promise<T>;
export declare function promisify<TResult>(fn: (callback: (err?: any, result?: TResult) => void) => void, owner?: any): () => Promise<TResult>;
export declare function promisify(fn: (callback: (err?: any) => void) => void, owner?: any): () => Promise<void>;
export declare function promisify<T1, TResult>(fn: (arg1: T1, callback: (err: any, result: TResult) => void) => void, owner?: any): (arg1: T1) => Promise<TResult>;
export declare function promisify<T1>(fn: (arg1: T1, callback: (err?: any) => void) => void, owner?: any): (arg1: T1) => Promise<void>;
export declare function promisify<T1, T2, TResult>(fn: (arg1: T1, arg2: T2, callback: (err: any, result: TResult) => void) => void, owner?: any): (arg1: T1, arg2: T2) => Promise<TResult>;
export declare function promisify<T1, T2>(fn: (arg1: T1, arg2: T2, callback: (err?: any) => void) => void, owner?: any): (arg1: T1, arg2: T2) => Promise<void>;
export declare function promisify<T1, T2, T3, TResult>(fn: (arg1: T1, arg2: T2, arg3: T3, callback: (err: any, result: TResult) => void) => void, owner?: any): (arg1: T1, arg2: T2, arg3: T3) => Promise<TResult>;
export declare function promisify<T1, T2, T3>(fn: (arg1: T1, arg2: T2, arg3: T3, callback: (err?: any) => void) => void, owner?: any): (arg1: T1, arg2: T2, arg3: T3) => Promise<void>;
export declare function promisify<T1, T2, T3, T4, TResult>(fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, callback: (err: any, result: TResult) => void) => void, owner?: any): (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => Promise<TResult>;
export declare function promisify<T1, T2, T3, T4>(fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, callback: (err?: any) => void) => void): (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => Promise<void>;
export declare function promisify<T1, T2, T3, T4, T5, TResult>(fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, callback: (err: any, result: TResult) => void) => void, owner?: any): (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => Promise<TResult>;
export declare function promisify<T1, T2, T3, T4, T5>(fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, callback: (err?: any) => void) => void, owner?: any): (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => Promise<void>;
