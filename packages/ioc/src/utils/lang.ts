// use core-js in browser.
import { ObjectMap, Type, AbstractType, Modules, ClassType } from '../types';
import { clsUglifyExp, clsStartExp } from './exps';


declare let process: any;


const toString = Object.prototype.toString;
/**
 * lang utils
 */
export namespace lang {

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
     * @param {ObjectMap} target
     * @returns
     */
    export function hasField(target: ObjectMap) {
        return Object.keys(target).length > 0;
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
            target.some((it, idx) => iterator(it, idx) === false);
        } else if (isObject(target)) {
            Object.keys(target).some((key, idx) => iterator(target[key], key) === false);
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
    export function remove<T>(list: T[], el: T | ((el: T) => boolean)) {
        if (!list.length) {
            return null;
        }
        let elm = isFunction(el) ? list.find(el) : el;
        return del(list, elm);
    }

    /**
     * delete item of list.
     * @param list list
     * @param el element
     */
    export function del<T>(list: T[], el: T) {
        const index = isArray(list) ? list.indexOf(el) : -1;
        if (index > -1) {
            return list.splice(index, 1);
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
     * get class annations.
     *
     * @export
     * @param {ClassType} target
     * @returns
     */
    export function getClassAnnations(target: ClassType) {
        let annf: Function = target.ρAnn || target['d0Ann'] || target['getClassAnnations'];
        return isFunction(annf) ? annf.call(target) : null;
    }

    /**
     * target has class annations or not.
     *
     * @export
     * @param {ClassType} target
     * @returns {boolean}
     */
    export function hasClassAnnations(target: ClassType): boolean {
        return isFunction(target.ρAnn || target['d0Ann'] || target['getClassAnnations']);
    }


    /**
     * get class of object.
     *
     * @export
     * @param {*} target
     * @returns {Type}
     */
    export function getClass(target: any): Type {
        if (isNullOrUndefined(target)) {
            return null;
        }
        if (isFunction(target)) {
            return isClassType(target) ? target as Type : null;
        }
        return target.constructor || target.prototype.constructor;
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
        if (!isFunction(classType)) {
            return '';
        }
        if (clsUglifyExp.test(classType.name)) {
            let classAnnations = getClassAnnations(classType);
            return classAnnations ? classAnnations.name : classType.name;
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
        const p = Object.getPrototypeOf(target.prototype);
        const ty = isFunction(p) ? p : p.constructor;
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
            let isCls = isClassType(baseClass);
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
     * @param {Modules[]} modules
     * @param {...Express<Type, boolean>[]} filters
     * @returns {Type[]}
     * @memberof DefaultModuleLoader
     */
    export function getTypes(...modules: Modules[]): Type[] {
        if (!modules.length) {
            return [];
        } else if (modules.length === 1) {
            return getContentTypes(modules[0])
        }
        let types = [];
        modules.forEach(m => {
            types = types.concat(getContentTypes(m));
        })
        return types;
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
     * async clean object.
     * @param obj.
     */
    export function cleanObj(obj: Object) {
        setTimeout(() => {
            obj && Object.keys(obj).forEach(k => {
                obj[k] = null;
            })
        });
    }
}

/**
*  action handle.
*/
export type Handler<T = any, TR = void> = (ctx: T, next?: () => TR) => TR;

/**
 * async action.
 */
export type AsyncHandler<T = any> = Handler<T, Promise<void>>;

/**
 * execute action in chain.
 *
 * @export
 * @template T
 * @template TR
 * @param {ActionHandle<T>[]} handlers
 * @param {T} ctx
 * @param {() => TR} [next]
 */
export function chain<T, TR = void>(handlers: Handler<T, TR>[], ctx: T, next?: () => TR) {
    let index = -1;
    function dispatch(idx: number): TR {
        if (idx <= index) {
            throw new Error('next called mutiple times.');
        }
        index = idx;
        let handle = idx < handlers.length ? handlers[idx] : null;
        if (idx === handlers.length) {
            handle = next;
        }
        if (!handle) {
            return;
        }
        try {
            return handle(ctx, dispatch.bind(null, idx + 1));
        } catch (err) {
            throw err;
        }
    }
    return dispatch(0);
}


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

const AbstractDecor = '@Abstract';

/**
 * check Abstract class with @Abstract or not
 *
 * @export
 * @param {*} target
 * @returns {target is AbstractType}
 */
export function isAbstractClass(target: any): target is AbstractType {
    return classCheck(target) && Reflect.hasOwnMetadata(AbstractDecor, target);
}


/**
 * check target is class or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Type}
 */
export function isClass(target: any): target is Type {
    return classCheck(target, tg => Reflect.hasOwnMetadata(AbstractDecor, tg))
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

const anon = /^function\s+\(|^function\s+anonymous\(|^\(?(\w+,)*\w+\)?\s*\=\>|^\(\s*\)\s*\=\>/;

function classCheck(target: any, exclude?: (target: Function) => boolean): boolean {
    if (!isFunction(target)) return false;

    if (!target.name || !target.prototype) return false;

    if (target.prototype.constructor !== target) return false;

    if (exclude && exclude(target)) {
        return false;
    }

    if (lang.hasClassAnnations(target)) return true;

    if (Reflect.getOwnMetadataKeys(target).length) return true;

    if (isPrimitiveType(target)) return false;

    if (!clsStartExp.test(target.name)) return false;

    const str = target.toString();
    if (anon.test(str)) return false;

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

/**
 * is target promise or not. now check is es6 Promise only.
 *
 * @export
 * @param {*} target
 * @returns {target is Promise<any>}
 */
export function isPromise(target: any): target is Promise<any> {
    return toString.call(target) === '[object Promise]'
        || (isDefined(target) && isFunction(target.then) && isFunction(target.catch));
}

/**
 * is target rxjs observable or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isObservable(target: any): boolean {
    return toString.call(target) === '[object Observable]' || (isDefined(target) && isFunction(target.subscribe));
}

/**
 * is target base object or not.
 * eg. {}, have not self constructor;
 * @export
 * @param {*} target
 * @returns {target is Promise<any>}
 */
export function isPlainObject(target: any): target is ObjectMap {
    return toString.call(target) === '[object Object]' && target.constructor.name === 'Object';
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
    if (!isPlainObject(target)) {
        return false;
    }
    if (props.length) {
        return Object.keys(target).some(n => props.some(ps => isString(ps) ? ps === n : ps.indexOf(n) > 0));
    }

    return true;
}

/**
 * check target is string or not.
 *
 * @export
 * @param {*} target
 * @returns {target is string}
 */
export function isString(target: any): target is string {
    return typeof target === 'string';
}

/**
 * check target is boolean or not.
 *
 * @export
 * @param {*} target
 * @returns {target is boolean}
 */
export function isBoolean(target: any): target is boolean {
    return typeof target === 'boolean';
}

/**
 * check target is number or not.
 *
 * @export
 * @param {*} target
 * @returns {target is number}
 */
export function isNumber(target: any): target is number {
    return typeof target === 'number';
}

/**
 * check target is undefined or not.
 *
 * @export
 * @param {*} target
 * @returns {target is undefined}
 */
export function isUndefined(target: any): target is undefined {
    return typeof target === 'undefined';
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
    return isNull(target) || isUndefined(target);
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
    return target !== null && typeof target === 'object';
}

/**
 * is custom class type instance or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isTypeObject(target: any): boolean {
    return toString.call(target) === '[object Object]' && target.constructor.name !== 'Object';
}

/**
 * check target is date or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Date}
 */
export function isDate(target: any): target is Date {
    return toString.call(target) === '[object Date]';
}

/**
 * check target is symbol or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Symbol}
 */
export function isSymbol(target: any): target is Symbol {
    return toString.call(target) === '[object Symbol]';
}

/**
 * check target is regexp or not.
 *
 * @export
 * @param {*} target
 * @returns {target is RegExp}
 */
export function isRegExp(target: any): target is RegExp {
    return toString.call(target) === '[object RegExp]';
}

/**
 * is base type or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isBaseType(target: ClassType): boolean {
    return isFunction(target) && (
        isPrimitiveType(target)
        || target === Date
        || target === Array);
}

/**
 * check target is primitive or not.
 *
 * @export
 * @param {*} target
 * @returns
 */
export function isPrimitive(target): boolean {
    let ty = typeof target;
    return ty === 'string'
        || ty === 'number'
        || ty === 'symbol'
        || ty === 'boolean';
}

/**
 * check target is primitive type or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isPrimitiveType(target): boolean {
    return target === Function
        || target === Object
        || target === String
        || target === Number
        || target === Boolean
        || target === Symbol;
}

/**
 * check target is base value or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isBaseValue(target: any): boolean {
    return isBaseType(lang.getClass(target));
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
     * @memberof Defer
     */
    static create<T>(then?: (val: T) => T | PromiseLike<T>): Defer<T> {
        let defer = new Defer<T>();
        if (then) {
            defer.promise = defer.promise.then(then);
            return defer;
        } else {
            return defer;
        }
    }
    /**
     * promise.
     *
     * @type {Promise<T>}
     * @memberof Defer
     */
    promise: Promise<T>;
    /**
     * resolve.
     *
     * @memberof Defer
     */
    resolve: (value?: T | PromiseLike<T>) => void;
    /**
     * reject.
     *
     * @memberof Defer
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
 * promise util.
 */
export namespace PromiseUtil {

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
}
