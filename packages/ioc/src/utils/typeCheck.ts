import { Type, AbstractType, Token, ClassType, ProvideToken } from '../types';
import { Registration } from '../Registration';
import { lang } from './lang';

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
            if (lang.hasClassAnnations(type)) {
                return true;
            } else {
                return false;
            }
        } else {
            if (lang.hasClassAnnations(type)) {
                return true;
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
    if (classCheck(target)) {
        return true;
    }
    return isProvideToken(target);
}

/**
 * check target is provide token or not.
 *
 * @export
 * @param {*} target
 * @returns {target is ProvideToken<any>}
 */
export function isProvideToken(target: any): target is ProvideToken<any> {
    if (!target) {
        return false;
    }
    if (isString(target) || isSymbol(target) || (target instanceof Registration)) {
        return true
    }
    return false
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
 * check object is class metadata or not.
 *
 * @export
 * @param {*} target
 * @param {...(string | string[])[]} extendsProps
 * @returns {boolean}
 */
export function isClassMetadata(target, ...extendsProps: (string | string[])[]): boolean {
    return isMetadataObject(target, ...extendsProps.concat(['singleton', 'provide', 'alias', 'type']));
}

/**
 * check object is property metadata or not.
 *
 * @export
 * @param {*} target
 * @param {...(string | string[])[]} extendsProps
 * @returns {boolean}
 */
export function isProvideMetadata(target, ...extendsProps: (string | string[])[]): boolean {
    return isMetadataObject(target, ...extendsProps.concat(['type', 'provider']));
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
    let type = lang.getClass(target);
    if (isBaseType(type)) {
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
    if (!isFunction(target)) {
        return false;
    }
    return target === Object
        || target === Boolean
        || target === String
        || target === Number
        || target === Date;
}
