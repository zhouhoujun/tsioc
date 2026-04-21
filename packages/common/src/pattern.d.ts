/**
 * Object pattern.
 */
export interface ObjectPattern extends Record<string, string | number | ObjectPattern> {
}
/**
 * Command pattern.
 */
export interface CommandPattern {
    [key: string]: undefined | string | number | ObjectPattern;
    cmd: string;
}
/**
 * Topic pattern.
 */
export interface TopicPattern {
    [key: string]: undefined | string | number | ObjectPattern;
    topic: string;
    replyTo?: string;
}
/**
 * Request pattern.
 */
export type Pattern = string | number | CommandPattern | TopicPattern | ObjectPattern | RegExp;
/**
 * pattern formatter.
 */
export declare abstract class PatternFormatter {
    /**
     * Transforms the Pattern to Route.
     * 1. If Pattern is a `string`, it will be returned as it is.
     * 2. If Pattern is a `number`, it will be converted to `string`.
     * 3. If Pattern is a `JSON` object, it will be transformed to Route. For that end,
     * the function will sort properties of `JSON` Object and creates `route` string
     * according to the following template:
     * <key1>:<value1>/<key2>:<value2>/.../<keyN>:<valueN>
     * @param pattern
     */
    abstract format(pattern: Pattern): string;
    isRegExp?(pattern: string): boolean;
    parseRegExp?(pattern: string, params?: Record<string, any>): RegExp | null;
}
export declare const defaultFormatter: PatternFormatter;
/**
 * Transforms the Pattern to Route.
 * 1. If Pattern is a `string`, it will be returned as it is.
 * 2. If Pattern is a `number`, it will be converted to `string`.
 * 3. If Pattern is a `JSON` object, it will be transformed to Route. For that end,
 * the function will sort properties of `JSON` Object and creates `route` string
 * according to the following template:
 * <key1>:<value1>/<key2>:<value2>/.../<keyN>:<valueN>
 *
 * @param  {Pattern} pattern - client pattern
 * @returns string
 */
export declare function patternToPath(pattern: Pattern | undefined, joinby?: string, keyValueJoin?: string): string;
