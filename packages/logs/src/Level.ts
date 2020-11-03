
// /**
//  * log level items.
//  *
//  * @export
//  * @enum {number}
//  */
// export enum Level {
//     log = 'log',
//     trace = 'trace',
//     debug = 'debug',
//     info = 'info',
//     warn = 'warn',
//     error = 'error',
//     fatal = 'fatal'
// }

import { isString } from '@tsdi/ioc';

/**
 * log level.
 */
export type Level = 'log' | 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const levels = ['log', 'trace', 'debug', 'info', 'warn', 'error', 'fatal'];
export function isLevel(target: any): target is Level {
    return isString(target) && levels.indexOf(target) >= 0;
}

/**
 * log levels
 *
 * @export
 * @enum {number}
 */
export enum Levels {
    trace = 0,
    debug,
    info,
    warn,
    error,
    fatal
}
