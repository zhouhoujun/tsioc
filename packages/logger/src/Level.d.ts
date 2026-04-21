/**
 * log level.
 */
export type Level = 'log' | 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
/**
 * levels.
 */
export declare const levels: string[];
/**
 * is level.
 * @param target
 */
export declare function isLevel(target: any): target is Level;
/**
 * match level.
 * @param level
 * @param target
 * @returns
 */
export declare function matchLevel(level: Level | {
    levelStr: string;
    level: number;
}, target: Levels | Level): boolean;
/**
 * log levels
 *
 * @export
 * @enum {number}
 */
export declare enum Levels {
    trace = 0,
    debug = 1,
    info = 2,
    warn = 3,
    error = 4,
    fatal = 5
}
