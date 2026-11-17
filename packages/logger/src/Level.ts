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
 * Rank of every level name. Plain string keys keep the lookup monomorphic;
 * the generated numeric-enum object also carries reverse mappings, which makes
 * lookups by name noticeably slower on the log hot path.
 *
 * `log` is the most verbose level (below `trace`) so enabling it never filters
 * anything out.
 */
export const levelRanks: Record<string, number> = {
    log: -1,
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    fatal: 5
};

/**
 * Rank of a level name, or `undefined` when the name is not a known level.
 * Callers on the log hot path use the rank directly to avoid repeated
 * name→rank lookups.
 */
export function levelRankOf(level: string | undefined | null): number | undefined {
    return level === undefined || level === null ? undefined : levelRanks[level];
}

/**
 * is level.
 * @param target
 */
export function isLevel(target: any): target is Level {
    return isString(target) && levelRanks[target] !== undefined
}

/**
 * match level.
 * @param level 
 * @param target 
 * @returns 
 */
export function matchLevel(level: Level | { levelStr: string, level: number }, target: Levels | Level) {
    const lvstr = isString(level) ? level : level.levelStr?.toLowerCase();
    const left = levelRankOf(lvstr);
    const right = isString(target) ? levelRankOf(target) : target;
    return left !== undefined && right !== undefined && left <= right;
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
