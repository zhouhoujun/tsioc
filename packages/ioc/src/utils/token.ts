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
        case _tyfunc:
            return true;
        case _tystr:
            return true
        case _tysymbol:
            return true
    }

    return isInjectToken(target)
}

const _tysymbol = 'symbol';
const _tyfunc = 'function';
const _tystr = 'string';