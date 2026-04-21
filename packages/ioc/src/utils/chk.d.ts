export { isObservable } from 'rxjs';
/**
 * check target is function or not.
 *
 * @export
 * @param {*} t
 * @returns
 */
export declare function isFunction(t: any): t is Function;
/**
 * is run in nodejs or not.
 *
 * @export
 * @returns {boolean}
 */
export declare function isNodejsEnv(): boolean;
/**
 * is target promise or not. now check is es6 Promise only.
 *
 * @export
 * @param {*} target
 * @returns {target is Promise<any>}
 */
export declare function isPromise(target: any): target is Promise<any>;
/**
 * is promise like or not.
 * @param target
 * @returns
 */
export declare function isPromiseLike(target: any): boolean;
/**
 * check target is string or not.
 *
 * @export
 * @param {*} target
 * @returns {target is string}
 */
export declare function isString(target: any): target is string;
/**
 * check target is boolean or not.
 *
 * @export
 * @param {*} target
 * @returns {target is boolean}
 */
export declare function isBoolean(target: any): target is boolean;
/**
 * check target is number or not.
 *
 * @export
 * @param {*} target
 * @returns {target is number}
 */
export declare function isNumber(target: any): target is number;
/**
 * check target is bigint or not.
 *
 * @export
 * @param {*} target
 * @returns {target is bigint}
 */
export declare function isBigInt(target: any): target is bigint;
/**
 * check target is undefined or not.
 *
 * @export
 * @param {*} target
 * @returns {target is undefined}
 */
export declare function isUndefined(target: any): target is undefined;
/**
 * check target is unll or not.
 *
 * @export
 * @param {*} target
 * @returns {target is null}
 */
export declare function isNull(target: any): target is null;
/**
 * is target null or undefined.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export declare function isNil(target: any): target is (null | undefined);
/**
 * is target null or undefined.
 */
export declare const isNullOrUndefined: typeof isNil;
/**
 * check taget is defined.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export declare function isDefined(target: any): boolean;
/**
 * check target is array or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Array<any>}
 */
export declare function isArray(target: any): target is Array<any>;
/**
 * check target is object or not.
 *
 * @export
 * @param {*} target
 * @returns {target is object}
 */
export declare function isObject(target: any): boolean;
/**
 * has own property or not.
 * @param target
 * @param property
 * @returns
 */
export declare function hasOwn(target: any, property: string | symbol): boolean;
/**
 * has any property or not.
 * @param target
 * @returns
 */
export declare function hasProps(target: any): boolean;
/**
 * check target is date or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Date}
 */
export declare function isDate(target: any): target is Date;
/**
 * check target is symbol or not.
 *
 * @export
 * @param {*} target
 * @returns {target is symbol}
 */
export declare function isSymbol(target: any): target is symbol;
export declare function isProxy(obj: any): boolean;
/**
 * check target is regexp or not.
 *
 * @export
 * @param {*} target
 * @returns {target is RegExp}
 */
export declare function isRegExp(target: any): target is RegExp;
