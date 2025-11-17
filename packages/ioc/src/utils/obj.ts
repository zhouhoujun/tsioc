
import { InjectToken } from '../tokens';
import { isArray } from './chk';


const objTag = '[object Object]';
const objName = 'Object';
/**
 * is custom class type instance or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isTypeObject(target: any): boolean {
    return toString.call(target) === objTag && target.constructor.name !== objName && !(target instanceof InjectToken)
}


const moduleTag = '[object Module]';
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
    return (ty === objTag || ty === moduleTag) && target.constructor.name === objName;
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
export function isMetadataObject(target: any, props: string[]): boolean;

/**
 * is metadata object or not.
 *
 * @export
 * @param {*} target
 * @param {...(string|string[])[]} props
 * @returns {boolean}
 */
export function isMetadataObject(target: any, ...props: string[]): boolean
/**
 * is metadata object or not.
 *
 * @export
 * @param {*} target
 * @param {...(string|string[])[]} props
 * @returns {boolean}
 */
export function isMetadataObject(target: any, ...args: (string | string[])[]): boolean {
    if (!isPlainObject(target)) return false;
    if (args.length) {
        const props = isArray(args[0]) ? args[0] : args as string[];
        const keys = Object.keys(target);
        for (const p of props) {
            if (keys.includes(p)) return true;
        }
        return false
    }

    return true
}

