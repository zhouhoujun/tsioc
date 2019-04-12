import { ObjectMap, Type, Token, ClassType } from '../types';
import { isNullOrUndefined, isArray, isObject, isFunction, isClass, isClassType, isString } from './typeCheck';
// use core-js in browser.


/**
 * lang utils
 */
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
    export function forIn<T>(target: ObjectMap<T> | T[], iterator: (item: T, idx?: number | string) => void | boolean) {
        if (isArray(target)) {
            target.some((it, idx) => iterator(it, idx) === false);
        } else if (isObject(target)) {
            Object.keys(target).some((key, idx) => iterator(target[key], key) === false);
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
     * get class annations.
     *
     * @export
     * @param {ClassType<any>} target
     * @returns
     */
    export function getClassAnnations(target: ClassType<any>) {
        return isFunction(target.getClassAnnations) ? target.getClassAnnations() : target.classAnnations;
    }

    /**
     * target has class annations or not.
     *
     * @export
     * @param {ClassType<any>} target
     * @returns {boolean}
     */
    export function hasClassAnnations(target: ClassType<any>): boolean {
        if (isFunction(target.getClassAnnations)) {
            return true;
        }
        return target.classAnnations && isString(target.classAnnations.name) && target.classAnnations.name.length > 0;
    }


    /**
     * get class of object.
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
            let classAnnations = getClassAnnations(classType);
            return classAnnations ? classAnnations.name : classType.name;
        }
        return classType.name;
    }

    /**
     * get target type parent class.
     *
     * @export
     * @param {ClassType<any>} target
     * @returns {ClassType<any>}
     */
    export function getParentClass(target: ClassType<any>): ClassType<any> {
        let p = Reflect.getPrototypeOf(target.prototype);
        return isClass(p) ? p : p.constructor as ClassType<any>;
    }

    /**
     * get all parent class in chain.
     *
     * @export
     * @param {ClassType<any>} target
     * @returns {ClassType<any>[]}
     */
    export function getClassChain(target: ClassType<any>): ClassType<any>[] {
        let types: ClassType<any>[] = [];
        forInClassChain(target, type => {
            types.push(type);
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
    export function forInClassChain(target: ClassType<any>, express: (token: ClassType<any>) => any): void {
        while (isClassType(target) && target !== Object) {
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
     * @param {(ClassType<any> | ((type: ClassType<any>) => boolean))} baseClass
     * @returns {boolean}
     */
    export function isExtendsClass(target: Token<any>, baseClass: ClassType<any> | ((type: ClassType<any>) => boolean)): boolean {
        let isExtnds = false;
        if (isClassType(target)) {
            forInClassChain(target, t => {
                if (isClassType(baseClass)) {
                    isExtnds = t === baseClass;
                } else if (isFunction(baseClass)) {
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
    export type IAction<T> = (ctx: T, next?: () => void) => any;

    /**
     * execute action in chain.
     *
     * @export
     * @template T
     * @param {ActionHandle<T>[]} handles
     * @param {T} ctx
     * @param {() => void} [next]
     */
    export function execAction<T>(handles: IAction<T>[], ctx: T, next?: () => void): void {
        let index = -1;
        function dispatch(idx: number): any {
            if (idx <= index) {
                return Promise.reject('next called mutiple times.');
            }
            index = idx;
            let handle = idx < handles.length ? handles[idx] : null;
            if (idx === handles.length) {
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
        dispatch(0);
    }

}
