import { Type, AbstractType, Token, IRefTarget, ClassType } from '../types';
import { Registration } from '../Registration';
import { lang } from './lang';
import { IAnnotationMetadata } from '../core';

declare let process: any;

/**
 * check target is function or not.
 *
 * @export
 * @param {*} target
 * @returns
 */
export function isFunction(target: any): target is Function {
    if (!target) {
        return false;
    }
    return typeof target === 'function';
}

/**
 * check Abstract class with @Abstract or not
 *
 * @export
 * @param {*} target
 * @returns {target is AbstractType<any>}
 */
export function isAbstractClass(target: any): target is AbstractType<any> {
    return classCheck(target) && Reflect.hasOwnMetadata('@Abstract', target);
}


/**
 * check target is class or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Type<any>}
 */
export function isClass(target: any): target is Type<any> {
    return classCheck(target) && (!Reflect.hasOwnMetadata('@Abstract', target))
}

export function isClassType(target: any): target is ClassType<any> {
    return classCheck(target);
}

function classCheck(target: any): boolean {
    if (!isFunction(target)) {
        return false;
    }

    if (target.prototype) {
        if (!target.name || target.name === 'Object') {
            return false;
        }

        let type = target as Type<any>;

        // for uglify
        if (/^[a-z]$/.test(type.name)) {
            if (type.classAnnations && type.classAnnations.name) {
                return true;
            } else {
                return false;
            }
        } else {
            if (type.classAnnations && isString(type.classAnnations.name)) {
                return true
            }

            if (!/^[A-Z@]/.test(target.name)) {
                return false;
            }

        }

        // for IE 8, 9
        if (!isNodejsEnv() && /MSIE [6-9]/.test(navigator.userAgent)) {
            return true;
        }
        try {
            target.arguments && target.caller;
            return false;
        } catch (e) {
            return true;
        }
    }

    return false;
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
 * check target is token or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Token<any>}
 */
export function isToken(target: any): target is Token<any> {
    if (!target) {
        return false;
    }
    if (isString(target) || isSymbol(target) ||  classCheck(target) || (target instanceof Registration)) {
        return true
    }
    return false;
}

/**
 * is target promise or not. now check is es6 Promise only.
 *
 * @export
 * @param {*} target
 * @returns {target is Promise<any>}
 */
export function isPromise(target: any): target is Promise<any> {
    if (!target) {
        return false;
    }
    let type = target.constructor || target.prototype.constructor;
    if (type && type.name === 'Promise') {
        return true;
    }
    return false;
}

/**
 * is target rxjs observable or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isObservable(target: any): boolean {
    if (!target && !isObject(target)) {
        return false;
    }
    let type = target.constructor || target.prototype.constructor;
    if (type && type.name === 'Observable') {
        return true;
    }
    return false;
}

/**
 * is target base object or not.
 * eg. {}, have not self constructor;
 * @export
 * @param {*} target
 * @returns {target is Promise<any>}
 */
export function isBaseObject(target: any): target is object {
    if (!target) {
        return false;
    }
    if (target.constructor && target.constructor.name === 'Object') {
        return true;
    }
    return false;
}

/**
 * is metadata object or not.
 *
 * @export
 * @param {any} target
 * @param {string[]} [props]
 * @param {string[]} [extendsProps]
 * @returns {boolean}
 */
export function isMetadataObject(target: any, props?: string[], extendsProps?: string[]): boolean {
    if (!isBaseObject(target)) {
        return false;
    }
    props = props || [];
    if (extendsProps) {
        props = extendsProps.concat(props);
    }

    if (props.length) {
        return lang.keys(target).some(n => props.indexOf(n) > 0)
    }

    return true;
}

/**
 * is reftarget options or not.
 *
 * @export
 * @param {*} target
 * @returns {target is IRefTarget}
 */
export function isRefTarget(target: any): target is IRefTarget {
    if (isBaseObject(target) !== true) {
        return false
    }
    return isToken(target.target);
}

/**
 * target is annotation metadata.
 *
 * @export
 * @param {*} target
 * @returns {target is IAnnotationMetadata<any>}
 */
export function isAnnotationMetadata(target: any): target is IAnnotationMetadata<any> {
    return isMetadataObject(target, ['type', 'token', 'bootstrap']);
}

/**
 * check object is class metadata or not.
 *
 * @export
 * @param {any} target
 * @param {string[]} [extendsProps]
 * @returns {boolean}
 */
export function isClassMetadata(target, extendsProps?: string[]): boolean {
    return isMetadataObject(target, ['singleton', 'provide', 'alias', 'type'], extendsProps);
}

/**
 * check object is param metadata or not.
 *
 * @export
 * @param {any} target
 * @param {string[]} [extendsProps]
 * @returns {boolean}
 */
export function isParamMetadata(target, extendsProps?: string[]): boolean {
    return isMetadataObject(target, ['type', 'provider', 'index'], extendsProps);
}

/**
 * check object is param prop metadata or not.
 *
 * @export
 * @param {any} target
 * @param {string[]} [extendsProps]
 * @returns {boolean}
 */
export function isParamPropMetadata(target, extendsProps?: string[]): boolean {
    return isMetadataObject(target, ['type', 'provider', 'index'], extendsProps);
}

/**
 * check object is property metadata or not.
 *
 * @export
 * @param {any} target
 * @param {string[]} [extendsProps]
 * @returns {boolean}
 */
export function isPropertyMetadata(target, extendsProps?: string[]): boolean {
    return isMetadataObject(target, ['type', 'provider'], extendsProps);
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
    return typeof target === 'boolean' || (target === true || target === false);
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
    return typeof target === 'undefined' || target === undefined;
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
    if (isNullOrUndefined(target)) {
        return false;
    }
    let type = typeof target;
    return type === 'object' || type === 'function';
}

/**
 * is custom class type instance or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isTypeObject(target: any): boolean {
    if (isNullOrUndefined(target)) {
        return false;
    }
    if (typeof target !== 'object') {
        return false;
    }
    let type = lang.getClassName(target);
    if (type === 'Date' || type === 'Object') {
        return false;
    }
    return true;
}

/**
 * check target is date or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Date}
 */
export function isDate(target: any): target is Date {
    return isObject(target) && target instanceof Date;
}

/**
 * check target is symbol or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Symbol}
 */
export function isSymbol(target: any): target is Symbol {
    return typeof target === 'symbol' || (isObject(target) && /^Symbol\(/.test(target.toString()));
}

/**
 * check target is regexp or not.
 *
 * @export
 * @param {*} target
 * @returns {target is RegExp}
 */
export function isRegExp(target: any): target is RegExp {
    return target && target instanceof RegExp;
}

/**
 * is base type or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isBaseType(target: any): boolean {
    return isBoolean(target) || isString(target) || isNumber(target) || isDate(target) || isSymbol(target);
}
