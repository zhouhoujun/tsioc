// use core-js in browser.
import { ObjectMap, Type, Modules, ClassType } from '../types';
import { getClass, isArray, isClass, isClassType, isFunction, isNil, isObject, isPlainObject } from './chk';
import { clsUglifyExp } from './exps';
import { getClassAnnotation } from './util';

export { getClass } from './chk';
export { getClassAnnotation, hasClassAnnotation } from './util';

/**
 * create an new object from target object omit some field.
 *
 * @export
 * @param {ObjectMap} target
 * @param {...string[]} fields
 * @returns {*}
 */
export function omit(target: ObjectMap, ...fields: string[]): any {
    if (isObject(target)) {
        let result: any = {};
        for (let key in target) {
            if (fields.indexOf(key) < 0) {
                result[key] = target[key];
            }
        }
        return result;
    } else {
        return target;
    }
}

/**
 * for in opter for object or array.
 *
 * @export
 * @template T
 * @param {(ObjectMap<T> | T[])} target
 * @param {(item: T, idx?: number|string) => void|boolean} iterator
 */
export function forIn<T = any>(target: ObjectMap<T>, iterator: (item: T, idx?: string) => void | boolean)
export function forIn<T = any>(target: T[], iterator: (item: T, idx?: number) => void | boolean);
export function forIn(target: any, iterator: (item: any, idx?: any) => void | boolean) {
    if (isArray(target)) {
        for (let i = 0, len = target.length; i < len; i++) {
            if (iterator(it, i) === false) {
                break;
            }
        }
    } else if (target) {
        for (let key in target) {
            if (iterator(target[key], key) === false) {
                break;
            }
        }
    }
}

export function mapEach<TKey, TVal, TC = any>(map: Map<TKey, TVal>, callbackfn: (fac: TVal, key: TKey, resolvor?: TC) => void | boolean, resolvor?: TC) {
    const keys = Array.from(map.keys());
    const values = Array.from(map.values());
    if (Array.from(keys).some((tk, idx) => callbackfn(values[idx], tk, resolvor) === false)) {
        return false;
    }
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
 * remove element.
 * @param list list
 * @param el remove item.
 */
export function remove<T>(list: T[], el: T) {
    if (!isArray(list) || !list.length || isNil(el)) {
        return null;
    }
    const idx = list.indexOf(el);
    return idx >= 0 ? list.splice(idx, 1) : null;
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
 * get class name.
 *
 * @export
 * @param {AbstractType} target
 * @returns {string}
 */
export function getClassName(target: any): string {
    let classType = getClass(target);
    if (!classType) {
        return '';
    }
    if (clsUglifyExp.test(classType.name)) {
        return getClassAnnotation(classType)?.name ?? classType.name;
    }
    return classType.name;
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
    return ty === Object ? null : ty;
}

/**
 * get all parent class in chain.
 *
 * @export
 * @param {ClassType} target
 * @returns {ClassType[]}
 */
export function getClassChain(target: ClassType): ClassType[] {
    let types: ClassType[] = [];
    forInClassChain(target, type => {
        types.push(type);
    });
    return types;
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
            break;
        }
        target = getParentClass(target);
    }
}

/**
 * is base class type of.
 * @param target target type
 * @param baseType base class type.
 */
export function isBaseOf<T>(target: any, baseType: ClassType<T>): target is Type<T> {
    return isFunction(target) && (Object.getPrototypeOf(target.prototype) instanceof baseType || Object.getPrototypeOf(target) === baseType);
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
                isExtnds = t === baseClass;
            } else {
                isExtnds = (<Function>baseClass)(t);
            }
            return !isExtnds;
        });
    }
    return isExtnds;
}

/**
 * get all class type in modules.
 *
 * @param {Modules[]} mds
 * @param {...Express<Type, boolean>[]} filters
 * @returns {Type[]}
 */
export function getTypes(mds: Modules | Modules[]): Type[] {
    if (!mds) return [];
    return isArray(mds) ? mds.reduce((typs, curr) => typs.concat(getContentTypes(curr)), []) : getContentTypes(mds);
}

const exportKey = 'exports';
const esModuleKey = '__esModule';

function getContentTypes(regModule: Modules): Type[] {
    let regModules: Type[] = [];
    if (isClass(regModule)) {
        regModules.push(regModule);
    } else if (isPlainObject(regModule)) {
        let rmodules = regModule[exportKey] ? regModule[exportKey] : regModule;
        if (isPlainObject(rmodules)) {
            if (rmodules[esModuleKey]) {
                for (let p in rmodules) {
                    let type = rmodules[p];
                    regModules.push(...getContentTypes(type));
                }
            }
        } else if (isClass(rmodules)) {
            regModules.push(rmodules);
        }
    }
    return regModules;
}

/**
 * clean object.
 * @param obj.
 */
export function cleanObj(obj: Object) {
    if (!obj) return;
    for (let k in obj) {
        obj[k] = null;
    }
}



/**
 * defer
 *
 * @export
 * @class Defer
 * @template T
 */
export class Defer<T> {
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
            return df;
        } else {
            return df;
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
    resolve: (value?: T | PromiseLike<T>) => void;
    /**
     * reject.
     */
    reject: (reason?: any) => void;

    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
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
export function defer<T>(then?: (val: T) => T | PromiseLike<T>): Defer<T> {
    return Defer.create(then);
}

/**
 * run promise step by step.
 *
 * @export
 * @template T
 * @param {((T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>))[])} promises
 * @returns
 */
export function step<T>(promises: (T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>))[]) {
    let result = Promise.resolve<T>(null);
    promises.forEach(p => {
        result = result.then(v => isFunction(p) ? p(v) : p);
    });
    return result;
}

