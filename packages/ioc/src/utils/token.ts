import { InjectToken, Token } from '../tokens';
import { isNewable } from '../metadata/type';


/**
 * check target is token or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Token}
 */
export function isToken(target: any): target is Token {
    if (!target) return false
    switch (typeof target) {
        case 'function':
            return isNewable(target);
        case 'string':
            return true;
        // case 'symbol':
        //     return true
        case 'object':
            return target instanceof InjectToken;
        default:
            return false;
    }
}
