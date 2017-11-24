import { Type } from '../Type';
import { Token } from '../types';
import { isString } from 'util';
import { isSymbol } from 'lodash';
import { Registration } from '../Registration';

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
    if (isClass(target) || isString(target) || isSymbol(target) || target instanceof Registration) {
        return true
    }
    return false;
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
