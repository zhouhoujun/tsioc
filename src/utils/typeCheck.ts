import { Type } from '../Type';
import { Token } from '../types';
import { isString } from 'util';
import { isSymbol } from 'lodash';
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


function isRightObject(target, props: string[], extendsProps?: string[]): boolean {
    if (!target) {
        return false;
    }
    if (isToken(target)) {
        return false;
    }

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
    return isRightObject(target, ['singleton', 'provide', 'alias', 'type'], extendsProps);
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
    return isRightObject(target, ['type', 'provider', 'index'], extendsProps);
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
    return isRightObject(target, ['type', 'provider', 'index'], extendsProps);
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
    return isRightObject(target, ['type', 'provider'], extendsProps);
}




// use util

// /**
//  * check target is function or not.
//  *
//  * @export
//  * @param {*} target
//  * @returns
//  */
// export function isString(target: any): target is string {
//     return typeof target === 'string';
// }


// /**
//  * check target is undefined or not.
//  *
//  * @export
//  * @param {*} target
//  * @returns {target is undefined}
//  */
// export function isUndefined(target: any): target is undefined {
//     return typeof target === 'undefined';
// }

// /**
//  * check target is symbol or not.
//  *
//  * @export
//  * @param {*} target
//  * @returns {target is Symbol}
//  */
// export function isSymbol(target: any): target is Symbol {
//     return typeof target === 'symbol';
// }
