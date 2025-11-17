// use core-js in browser.
import { isObservable, lastValueFrom, Observable } from 'rxjs';
import { AbstractType, AnnotationType, Modules, Type } from '../types';
import { getType, isArray, isFunction, isNil, isObject, isType, isPromise, isAbstractType, isUndefined } from './chk';
import { isPlainObject } from './obj';

/**
 * assign source object to target object.
 *
 * @export
 * @param {any} target target object
 * @param {any} source source object
 * @param {...string[]} excludes  exclude fields
 * @returns {*}
 */
export function assign(target: any, source: any, ...excludes: string[]): any {
    if (!target || !source) return null;

    for (const key in source) {
        if (!excludes.includes(key)) {
            target[key] = source[key]
        }
    }
    return target
}


/**
 * create an new object from target object omit some field.
 *
 * @export
 * @param {any} target
 * @param {...string[]} excludes  exclude fields
 * @returns {*}
 */
export function omit(target: any, ...excludes: string[]): any {
    if (!target) return null;
    const result: any = {};
    for (const key in target) {
        if (!excludes.includes(key)) {
            result[key] = target[key]
        }
    }
    return result
}

/**
 * create new object with pick fields.
 * @param target 
 * @param fields 
 * @returns 
 */
export function pick(target: any, ...fields: string[]): any {
    const obj: any = {};
    for (const fd in fields) {
        const val = target[fd];
        if (!isNil(val)) {
            obj[fd] = val;
        }
    }
    return obj;
}

/**
 * for in opter for object or array.
 *
 * @export
 * @template T
 * @param {(Record<string, T> | T[])} target
 * @param {(item: T, idx?: number|string) => void|boolean} iterator
 */
export function forIn<T = any>(target: Record<string, T>, iterator: (item: T, idx: string) => void | boolean): void
export function forIn<T = any>(target: T[], iterator: (item: T, idx: number) => void | boolean): void;
export function forIn(target: any, iterator: (item: any, idx?: any) => void | boolean): void {
    if (!target) return;
    if (isArray(target)) {
        for (let i = 0, len = target.length; i < len; i++) {
            if (iterator(it, i) === false) {
                break
            }
        }
    } else {
        for (const key in target) {
            if (iterator(target[key], key) === false) {
                break
            }
        }
    }
}


/**
 * deep for each.
 * @param input 
 * @param fn iterator callback.
 * @param isRecord is item record or not.
 * @param getRecord get record values.
 */
export function deepForEach<T>(
    input: (T | Record<string, T> | any[])[],
    fn: (value: T) => void | Promise<void>,
    isRecord?: (value: any) => boolean,
    getRecord?: (value: any) => T[]): void | Promise<void> {
    const ps: Promise<void>[] = [];
    for (const value of input) {
        if (isArray(value)) {
            const reslut = deepForEach(value, fn, isRecord, getRecord);
            if (reslut) {
                ps.push(reslut);
            }
        } else if (value && isRecord && isRecord(value)) {
            const reslut = deepForEach(getRecord ? getRecord(value) : Object.values(value), fn, isRecord, getRecord);
            if (reslut) {
                ps.push(reslut);
            }
        } else if (value) {
            const reslut = fn(value as T);
            if (reslut && isPromise(reslut)) {
                ps.push(reslut);
            }
        }
    }

    if (ps.length) return Promise.all(ps).then();

}

/**
 * deep clone.
 * @param input 
 * @returns 
 */
export function deepClone<T>(input: T, defaultValue?: any, mergeArray?: (name: string, value: Array<any>, defaultArray: Array<any>) => Array<any>): T {
    if (!isObject(input)) return defaultValue ? deepClone(defaultValue) : null!;
    return Object.entries(input as object).reduce((result, [key, value]) => {
        if (isPlainObject(value)) {
            result[key] = deepClone(value, defaultValue?.[key], mergeArray);
        } else if (!isUndefined(value)) {
            if (mergeArray && Array.isArray(value) && Array.isArray(defaultValue?.[key])) {
                value = mergeArray(key, value, defaultValue[key])
            }
            result[key] = value;
        }
        return result;
    }, { ...defaultValue });

}


/**
 * first.
 *
 * @export
 * @template T
 * @param {T[]} list
 * @returns {T}
 */
export function first<T>(list: T[] | null | undefined): T {
    if (list?.length) {
        return list[0]
    }
    return null!
}

/**
 * remove element.
 * @param list list
 * @param el remove item.
 */
export function remove<T>(list: T[] | null | undefined, el: T) {
    if (!list?.length || isNil(el)) {
        return null
    }
    const idx = list.indexOf(el);
    return idx >= 0 ? list.splice(idx, 1) : null
}

/**
 * last.
 *
 * @export
 * @template T
 * @param {T[]} list
 * @returns {T}
 */
export function last<T>(list?: T[]): T {
    if (list?.length) {
        return list[list.length - 1]
    }
    return null!
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

/**
 * get target type parent type.
 *
 * @export
 * @param {AbstractType} target
 * @returns {AbstractType}
 */
export function getParentType(target: AbstractType): AbstractType {
    const ty = Object.getPrototypeOf(target?.prototype)?.constructor ?? Object.getPrototypeOf(target);
    return ty === Object ? null! : ty
}

/**
 * get all parent type in chain.
 *
 * @export
 * @param {AbstractType} target
 * @returns {AbstractType[]}
 */
export function getTypeChain(target: AbstractType): AbstractType[] {
    const types: AbstractType[] = [];
    while (target) {
        types.push(target);
        target = getParentType(target)
    }
    return types
}

/**
 * iterate base classes of target in chain. return false will break iterate.
 *
 * @export
 * @param {AbstractType} target
 * @param {(token: AbstractType) => any} express
 */
export function deepTypeChain(target: AbstractType, express: (token: AbstractType) => any): void {
    while (target) {
        if (express(target) === false) {
            break
        }
        target = getParentType(target)
    }
}

/**
 * check array has item or not.
 * @param arr 
 * @returns 
 */
export function hasItem(arr: any): boolean {
    return isArray(arr) && arr.length > 0;
}

/**
 * is base class type of.
 * @param target target type
 * @param baseType base class type.
 */
export function isBaseOf<T>(target: any, baseType: AbstractType<T>): target is AbstractType<T> {
    return isFunction(target) && (Object.getPrototypeOf(target.prototype) instanceof baseType || Object.getPrototypeOf(target) === baseType)
}

/**
 * target is extends class of base type or not.
 *
 * @export
 * @param {Token} target
 * @param {(AbstractType | ((type: AbstractType) => boolean))} baseType
 * @returns {boolean}
 */
export function isExtends<T extends AbstractType>(target: AbstractType, baseType: T | ((type: T) => boolean)): target is T {
    let isExtnds = false;
    if (isFunction(target) && baseType) {
        const isCls = isType(baseType);
        deepTypeChain(target, t => {
            if (isCls) {
                isExtnds = t === baseType
            } else {
                isExtnds = (<Function>baseType)(t)
            }
            return !isExtnds
        });
    }
    return isExtnds
}


/**
 * get all class types in modules.
 *
 * @param {Modules[]} mds
 * @param {...Express<Type, boolean>[]} filters
 * @returns {Type[]}
 */
export function getTypes<T extends AbstractType>(mds: Modules | Modules[], typeOnly?: boolean): T[] {
    const types: T[] = [];
    const typFn = typeOnly ? isType : isAbstractType;
    mds && deepForEach(isArray(mds) ? mds : isPlainObject(mds) ? Object.values(mds) : [mds], ty => {
        typFn(ty) && types.push(ty as T)
    }, v => isPlainObject(v));
    return types
}

const cleanKeys = ['injector', 'platform', 'context'];
/**
 * clean object.
 * @param obj.
 */
export function cleanObj(obj: any, keys: string[] = cleanKeys) {
    if (!obj) return;

    for (let i = 0, len = keys.length; i < len; i++) {
        const k = keys[i];
        if (obj[k]) obj[k] = null
    }
}

/**
 * defer
 *
 * @export
 * @class Defer
 * @template T
 */
export class Defer<T = any> {
    /**
     * create defer.
     *
     * @static
     * @template T
     * @param {((val: T) => T | PromiseLike<T>)} [then]
     * @returns {Defer<T>}
     */
    static create<C>(then?: (val: C) => C | PromiseLike<C>): Defer<C> {
        const df = new Defer<C>();
        if (then) {
            df.promise = df.promise.then(then);
            return df
        } else {
            return df
        }
    }
    /**
     * promise.
     *
     * @type {Promise<T>}
     */
    promise: Promise<T>;
    /**
     * resolve.
     */
    resolve!: (value?: T | PromiseLike<T>) => void;
    /**
     * reject.
     */
    reject!: (reason?: any) => void;

    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this.resolve = resolve as (value?: T | PromiseLike<T>) => void;
            this.reject = reject
        })
    }
}

/**
 * create defer.
 *
 * @export
 * @template T
 * @param {((val: T) => T | PromiseLike<T>)} [then]
 * @returns {Defer<T>}
 */
export function defer<T = any>(then?: (val: T) => T | PromiseLike<T>): Defer<T> {
    return Defer.create(then)
}

/**
 * create delay.
 * @param times delay timeout ms.
 */
export function delay(times: number, work?: (...args: any[]) => void, ...args: any[]): Promise<void> {
    const defer = Defer.create<void>();
    const timout = setTimeout(() => {
        timout && clearTimeout(timout);
        defer.resolve()
        work?.(...args);
    }, times);
    return defer.promise
}

export const immediate = typeof setImmediate !== 'undefined' ? setImmediate : (callback: (...args: any[]) => void, ...args: any[]) => delay(0, callback, ...args);

export const nextTick = typeof process !== 'undefined' ? process.nextTick : (callback: (...args: any[]) => void, ...args: any[]) => delay(0, callback, ...args);

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
export async function step<T>(promises: (T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>))[], initVal?: T, guard?: (val: T) => boolean): Promise<T> {
    let val: T|null = initVal ?? null;
    for (let i = 0; i < promises.length; i++) {
        const handle = promises[i];
        val = await (isFunction(handle) ?  handle(val!) : handle) as T;
        if (guard && !guard(val)) {
            break;
        }
    }
    return val as T;
}

/**
 * promise some.
 * @param promises 
 * @param filter 
 * @returns 
 */
export function some<T>(promises: (T | PromiseLike<T> | ((value?: T) => T | PromiseLike<T>))[], filter: (v: T) => boolean): Promise<T> {
    return step(promises, undefined, (v) => !filter(v));
}

/**
 * to promise.
 * @param target promise of the target.
 * @returns 
 */
export function promiseOf<T>(target: T | Observable<T> | Promise<T>): Promise<T> {
    if (isObservable(target)) {
        return lastValueFrom(target)
    } else if (isPromise(target)) {
        return target
    }
    return Promise.resolve(target)
}



export function promisify<TResult>(fn: (callback: (err?: any, result?: TResult) => void) => void, owner?: any): () => Promise<TResult>;
export function promisify(fn: (callback: (err?: any) => void) => void, owner?: any): () => Promise<void>;
export function promisify<T1, TResult>(fn: (arg1: T1, callback: (err: any, result: TResult) => void) => void, owner?: any): (arg1: T1) => Promise<TResult>;
export function promisify<T1>(fn: (arg1: T1, callback: (err?: any) => void) => void, owner?: any): (arg1: T1) => Promise<void>;
export function promisify<T1, T2, TResult>(fn: (arg1: T1, arg2: T2, callback: (err: any, result: TResult) => void) => void, owner?: any): (arg1: T1, arg2: T2) => Promise<TResult>;
export function promisify<T1, T2>(fn: (arg1: T1, arg2: T2, callback: (err?: any) => void) => void, owner?: any): (arg1: T1, arg2: T2) => Promise<void>;
export function promisify<T1, T2, T3, TResult>(fn: (arg1: T1, arg2: T2, arg3: T3, callback: (err: any, result: TResult) => void) => void, owner?: any): (arg1: T1, arg2: T2, arg3: T3) => Promise<TResult>;
export function promisify<T1, T2, T3>(fn: (arg1: T1, arg2: T2, arg3: T3, callback: (err?: any) => void) => void, owner?: any): (arg1: T1, arg2: T2, arg3: T3) => Promise<void>;
export function promisify<T1, T2, T3, T4, TResult>(
    fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, callback: (err: any, result: TResult) => void) => void, owner?: any
): (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => Promise<TResult>;
export function promisify<T1, T2, T3, T4>(fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, callback: (err?: any) => void) => void): (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => Promise<void>;
export function promisify<T1, T2, T3, T4, T5, TResult>(
    fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, callback: (err: any, result: TResult) => void) => void, owner?: any
): (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => Promise<TResult>;
export function promisify<T1, T2, T3, T4, T5>(
    fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, callback: (err?: any) => void) => void, owner?: any
): (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => Promise<void>;
export function promisify(nodeFunction: (...args: any[]) => void, owner?: any): (...args: any[]) => Promise<any> {
    if (owner) {
        nodeFunction = nodeFunction.bind(owner);
    }
    return (...args: any[]) => {
        return new Promise((r, j) => {
            nodeFunction(...args, (err: any, result: any) => {
                if (err) j(err);
                r(result);
            })
        })
    }
}
