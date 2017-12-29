
export * from './typeCheck';
export * from './toAbsolute';

import * as allsym from './symbols';

/**
 * symbols of container.
 */
export const symbols = allsym;

/**
 * is run in nodejs or not.
 *
 * @export
 * @returns {boolean}
 */
export function isNodejsEnv(): boolean {
    return (typeof process !== 'undefined') && (typeof process.versions.node !== 'undefined')
}
