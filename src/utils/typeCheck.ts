import { Type } from '../Type';
import { Token } from '../types';
import { Registration } from '../Registration';


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
 * check target is class or not.
 *
 * @export
 * @param {*} target
 * @returns
 */
export function isClass(target: any): target is Type<any> {
    if (!isFunction(target)) {
        return false;
    }

    if (target.prototype) {
        if (!target.name) {
            return false;
        }
        if (!/^[A-Z@]/.test(target.name)) {
            return false;
        }
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
    if (isString(target) || isSymbol(target) || isClass(target) || target instanceof Registration) {
        return true
    }
    return false;
}

/**
 * is target promise or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Promise<any>}
 */
export function isPromise(target: any): target is Promise<any> {
    if (!target) {
        return false;
    }
    if (isFunction(target.then) && isFunction(target.catch)) {
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
export function isMetadataObject(target, props?: string[], extendsProps?: string[]): boolean {
    if (!target) {
        return false;
    }
    if (isToken(target)) {
        return false;
    }

    if (target instanceof RegExp || target instanceof Date) {
        return false;
    }

    if (target.constructor && target.constructor.name !== 'Object') {
        return false;
    }

    props = props || ['type'];
    if (extendsProps) {
        props = extendsProps.concat(props);
    }

    return Object.keys(target).some(n => props.indexOf(n) > 0)
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
    return typeof target === null;
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
    var type = typeof target;
    return target != null && (type === 'object' || type === 'function');
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
