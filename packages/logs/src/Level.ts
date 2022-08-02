import { isString } from '@tsdi/ioc';

/**
 * log level.
 */
export type Level = 'log' | 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * levels.
 */
export const levels = ['log', 'trace', 'debug', 'info', 'warn', 'error', 'fatal'];

/**
 * is level.
 * @param target
 */
export function isLevel(target: any): target is Level {
    return isString(target) && levels.indexOf(target) >= 0
}

/**
 * match level.
 * @param level 
 * @param target 
 * @returns 
 */
export function matchLevel(level: Level | { levelStr: string, level: number }, target: Levels | Level) {
    const lvstr = isString(level) ? level : level.levelStr?.toLowerCase() as Level;
    return (Levels as Record<Level, number>)[lvstr] <= (isString(target) ? (Levels as Record<Level, number>)[target] : target);
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
