import { isInjectToken, Token } from '../tokens';
import { _tyfunc, _tystr, _tysymbol } from './chk';


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
        case _tyfunc:
            return true;
        case _tystr:
            return true
        case _tysymbol:
            return true
    }

    return isInjectToken(target)
}

