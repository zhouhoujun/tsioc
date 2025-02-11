import { isInjectToken, Token } from '../tokens';


/**
 * check target is token or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Token}
 */
export function isToken(target: any): target is Token {
    if (!target) {
        return false
    }
    const type = typeof target;
    switch (type) {
        case 'function':
            return target.prototype && target.prototype.constructor === target && isClass(target);
        case 'string':
            return true
        case 'symbol':
            return true
    }

    return isInjectToken(target)
}

/**
 * this fn is class or not.
 * @param fn 
 * @returns 
 */
export function isClass(fn: Function) {
    try {
        fn();
        return false;
    } catch (err: any) {
        if (err.toString().indexOf(`cannot be invoked without 'new'`) > 0) return true;
        return false;
    }
}