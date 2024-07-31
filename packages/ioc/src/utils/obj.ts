
import { InjectToken } from '../tokens';
import { isString } from './chk';


/**
 * is custom class type instance or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isTypeObject(target: any): boolean {
    return toString.call(target) === '[object Object]' && target.constructor.name !== 'Object' && !(target instanceof InjectToken)
}


/**
 * is target base object or not.
 * eg. {}, have not self constructor;
 *
 * Checks if `value` is a plain object, that is, an object created by the
 * `Object` constructor or one with a `[[Prototype]]` of `null`.
 * @export
 * @param {*} target
 * @returns {target is Promise<any>}
 */
export function isPlainObject(target: any): target is Record<string, any> {
    const ty = toString.call(target);
    return (ty === '[object Object]' || ty === '[object Module]') && target.constructor.name === 'Object';
}

/**
 * is target base object or not.
 * eg. {}, have not self constructor;
 *
 * @deprecated use `isPlainObject` instead.
 */
export const isBaseObject = isPlainObject;

/**
 * is metadata object or not.
 *
 * @export
 * @param {*} target
 * @param {...(string|string[])[]} props
 * @returns {boolean}
 */
export function isMetadataObject(target: any, ...props: (string | string[])[]): boolean {
    if (!isPlainObject(target)) return false;
    if (props.length) {
        for (const n in target) {
            if (props.some(ps => isString(ps) ? ps === n : ps.includes(n))) {
                return true
            }
        }
        return false
    }

    return true
}

