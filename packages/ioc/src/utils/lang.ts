// use core-js in browser.
import { ObjectMap, Type, AbstractType, Token, ClassType, Modules } from '../types';
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
        const index = list.indexOf(elm);
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
        return isFunction(target.getClassAnnations) ? target.getClassAnnations() : target.classAnnations;
    }

    /**
     * target has class annations or not.
     *
     * @export
     * @param {ClassType} target
     * @returns {boolean}
     */
    export function hasClassAnnations(target: ClassType): boolean {
        if (isFunction(target.getClassAnnations)) {
            return true;
        }
        return target.classAnnations && target.classAnnations.name && isString(target.classAnnations.name);
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
        let classType = isFunction(target) ? target : getClass(target);
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
        let p = Reflect.getPrototypeOf(target.prototype);
        return isClassType(p) ? p : p.constructor as ClassType;
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
        while (isClassType(target)) {
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
    export function isExtendsClass<T extends ClassType>(target: Token, baseClass: T | ((type: T) => boolean)): target is T {
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

    function getContentTypes(regModule: Modules): Type[] {
        let regModules: Type[] = [];
        if (isClass(regModule)) {
            regModules.push(regModule);
        } else if (regModule) {
            let rmodules = regModule['exports'] ? regModule['exports'] : regModule;
            for (let p in rmodules) {
                let type = rmodules[p];
                if (isClass(type)) {
                    regModules.push(type);
                }
            }
        }
        return regModules;
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
 * @param {ActionHandle<T>[]} handlers
 * @param {T} ctx
 * @param {() => void} [next]
 */
export async function chain<T, TR = void>(handlers: Handler<T, TR>[], ctx: T, next?: () => TR) {
    let index = -1;
    async function dispatch(idx: number) {
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
            return await handle(ctx, dispatch.bind(null, idx + 1));
        } catch (err) {
            throw err;
        }
    }
    await dispatch(0);
}

export type ClassTypes = 'injector' | 'component' | 'directive' | 'activity';

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


function classCheck(target: any, exclude?: (target: Function) => boolean): boolean {
    if (!isFunction(target)) {
        return false;
    }

    if (!target.name || !target.prototype) {
        return false;
    }

    if (exclude && exclude(target)) {
        return false;
    }

    if (lang.hasClassAnnations(target)) {
        return true;
    }

    if (Reflect.getOwnMetadataKeys(target).length) {
        return true;
    }

    if (isPrimitiveType(target)) {
        return false;
    }


    if (clsUglifyExp.test(target.name) || !clsStartExp.test(target.name)) {
        return false;
    }

    if (Object.getOwnPropertyNames(target.prototype).length > 1) {
        return true;
    }

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
    return toString.call(target) === '[object Observable]';
}

/**
 * is target base object or not.
 * eg. {}, have not self constructor;
 * @export
 * @param {*} target
 * @returns {target is Promise<any>}
 */
export function isBaseObject(target: any): target is ObjectMap {
    return toString.call(target) === '[object Object]' && target.constructor.name === 'Object';
}

/**
 * is metadata object or not.
 *
 * @export
 * @param {*} target
 * @param {...(string|string[])[]} props
 * @returns {boolean}
 */
export function isMetadataObject(target: any, ...props: (string | string[])[]): boolean {
    if (!isBaseObject(target)) {
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

