// use core-js in browser.
import { isObservable, lastValueFrom, Observable } from 'rxjs';
import { Type, Modules, ClassType } from '../types';
import { getClass, isArray, isClass, isClassType, isFunction, isNil, isPromise } from './chk';
import { isPlainObject } from './obj';
import { getClassAnnotation } from './util';

/**
 * create an new object from target object omit some field.
 *
 * @export
 * @param {any} target
 * @param {...string[]} fields
 * @returns {*}
 */
export function omit(target: any, ...fields: string[]): any {
    if (target) {
        const result: any = {};
        for (const key in target) {
            if (fields.indexOf(key) < 0) {
                result[key] = target[key]
            }
        }
        return result
    } else {
        return target
    }
}

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
 * assign key values to target.
 * @param target target object
 * @param values key values map.
 * @param omits omit fileds.
 * @returns 
 */
export function assign(target: any, values: any, ...omits: string[]): any {
    if (!values) return target;
    for (const key in values) {
        if (omits.indexOf(key) < 0) {
            target[key] = values[key]
        }
    }
    return target
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
    if (isArray(target)) {
        for (let i = 0, len = target.length; i < len; i++) {
            if (iterator(it, i) === false) {
                break
            }
        }
    } else if (target) {
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
    fn: (value: T) => void,
    isRecord?: (value: any) => boolean,
    getRecord?: (value: any) => T[]): void {
    input.forEach(value => {
        if (isArray(value)) {
            deepForEach(value, fn, isRecord, getRecord)
        } else if (value && isRecord && isRecord(value)) {
            deepForEach(getRecord ? getRecord(value) : Object.values(value), fn, isRecord, getRecord)
        } else {
            fn(value as T)
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
export function first<T>(list: T[] | null | undefined): T {
    if (isArray(list) && list.length) {
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
    if (!isArray(list) || !list.length || isNil(el)) {
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
export function last<T>(list: T[]): T {
    if (isArray(list) && list.length) {
        return list[list.length - 1]
    }
    return null!
}



/**
 * get class name.
 *
 * @export
 * @param {AbstractType} target
 * @returns {string}
 */
export function getClassName(target: any): string {
    const classType = getClass(target);
    if (!classType) {
        return ''
    }
    return getClassAnnotation(classType)?.name ?? classType.name
}

/**
 * get target type parent class.
 *
 * @export
 * @param {ClassType} target
 * @returns {ClassType}
 */
export function getParentClass(target: ClassType): ClassType {
    const ty = Object.getPrototypeOf(target.prototype)?.constructor ?? Object.getPrototypeOf(target);
    return ty === Object ? null : ty
}

/**
 * get all parent class in chain.
 *
 * @export
 * @param {ClassType} target
 * @returns {ClassType[]}
 */
export function getClassChain(target: ClassType): ClassType[] {
    const types: ClassType[] = [];
    forInClassChain(target, type => {
        types.push(type)
    });
    return types
}

/**
 * iterate base classes of target in chain. return false will break iterate.
 *
 * @export
 * @param {Type} target
 * @param {(token: Type) => any} express
 */
export function forInClassChain(target: ClassType, express: (token: ClassType) => any): void {
    while (target) {
        if (express(target) === false) {
            break
        }
        target = getParentClass(target)
    }
}

/**
 * is base class type of.
 * @param target target type
 * @param baseType base class type.
 */
export function isBaseOf<T>(target: any, baseType: ClassType<T>): target is Type<T> {
    return isFunction(target) && (Object.getPrototypeOf(target.prototype) instanceof baseType || Object.getPrototypeOf(target) === baseType)
}

/**
 * target is extends class of baseClass or not.
 *
 * @export
 * @param {Token} target
 * @param {(ClassType | ((type: ClassType) => boolean))} baseClass
 * @returns {boolean}
 */
export function isExtendsClass<T extends ClassType>(target: ClassType, baseClass: T | ((type: T) => boolean)): target is T {
    let isExtnds = false;
    if (isClassType(target) && baseClass) {
        const isCls = isClassType(baseClass);
        forInClassChain(target, t => {
            if (isCls) {
                isExtnds = t === baseClass
            } else {
                isExtnds = (<Function>baseClass)(t)
            }
            return !isExtnds
        });
    }
    return isExtnds
}

/**
 * get all class type in modules.
 *
 * @param {Modules[]} mds
 * @param {...Express<Type, boolean>[]} filters
 * @returns {Type[]}
 */
export function getTypes(mds: Modules | Modules[]): Type[] {
    const types: Type[] = [];
    mds && deepForEach(isArray(mds) ? mds : isPlainObject(mds) ? Object.values(mds) : [mds], ty => {
        isClass(ty) && types.push(ty)
    }, v => isPlainObject(v));
    return types
}

/**
 * clean object.
 * @param obj.
 */
export function cleanObj(obj: any) {
    if (!obj) return;
    for (const k in obj) {
        obj[k] = null
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
export function delay(times: number): Promise<void> {
    const defer = Defer.create<void>();
    const timout = setTimeout(() => {
        timout && clearTimeout(timout);
        defer.resolve()
    }, times);
    return defer.promise
}


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
export function step<T>(promises: (T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>))[], initVal?: T, guard?: (val: T) => boolean): Promise<T> {
    function runStep(val: T, idx: number): Promise<T> {
        let handle: T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>);
        if (idx < promises.length) {
            handle = promises[idx]
        } else {
            return Promise.resolve(val);
        }

        return Promise.resolve(isFunction(handle) ? handle(val) : handle)
            .then(v => {
                if (guard && !guard(v)) return v;
                return runStep(v, idx + 1)
            })
    }
    return runStep(initVal ?? null!, 0);

    // let result = Promise.resolve<T>(initVal ?? null!);
    // promises.forEach(p => {
    //     result = result.then(v => guard && !guard(v)? v : (isFunction(p) ? p(v) : p))
    // });
    // return result
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
export function pomiseOf<T>(target: T | Observable<T> | Promise<T>): Promise<T> {
    if (isObservable(target)) {
        return lastValueFrom(target)
    } else if (isPromise(target)) {
        return target
    }
    return Promise.resolve(target)
}

export function promisify(func: (callback: (err?: any) => void) => void, owner?: any): () => Promise<void>;
export function promisify<T>(func: (callback: (err: any, result?: T) => void) => void, owner?: any): () => Promise<T>;
export function promisify<T, A1>(func: (arg1: A1, callback: (err: any, result?: T) => void) => void, owner?: any): (arg1: A1) => Promise<T>;
export function promisify<T, A1, A2>(func: (arg1: A1, arg2: A2, callback: (err: any, result?: T) => void) => void, owner?: any): (arg1: A1, arg2: A2) => Promise<T>;
export function promisify<T, A1, A2, A3>(func: (arg1: A1, arg2: A2, arg3: A3, callback: (err: any, result?: T) => void) => void, owner?: any): (arg1: A1, arg2: A2, arg3: A3) => Promise<T>;
export function promisify<T, A1, A2, A3, A4>(func: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, callback: (err: any, result?: T) => void) => void, owner?: any): (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => Promise<T>;
export function promisify<T, A1, A2, A3, A4, A5>(func: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, callback: (err: any, result?: T) => void) => void, owner?: any): (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => Promise<T>;
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
