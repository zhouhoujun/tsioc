import { InjectToken, isInjectToken, Token } from '../tokens';
import { isClassType, isFunction, type_func, type_str, type_symbol } from './chk';


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
        case type_func:
            return isClassType(target)
        case type_str:
            return true
        case type_symbol:
            return true
    }

    return isInjectToken(target)
}

