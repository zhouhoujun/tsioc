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
            return true;
        case 'string':
            return true
        case 'symbol':
            return true
    }

    return isInjectToken(target)
}
