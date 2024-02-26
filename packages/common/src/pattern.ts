import { Abstract, isNumber, isPlainObject, isString } from '@tsdi/ioc';



/**
 * Object pattern.
 */
export interface ObjectPattern {
    [key: string]: undefined | string | number | ObjectPattern;
}

/**
 * Command pattern.
 */
export interface CommandPattern {
    [key: string]: undefined | string | number | ObjectPattern;
    cmd: string;
}

export interface TopicPattern {
    [key: string]: undefined | string | number | ObjectPattern;
    topic: string;
    replyTo?: string;
}


/**
 * Request pattern.
 */
export type Pattern = string | number | CommandPattern | TopicPattern | ObjectPattern;

/**
 * pattern formatter.
 */
@Abstract()
export abstract class PatternFormatter {
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
}

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
export function patternToPath(pattern: Pattern | undefined, joinby = '/', keyValueJoin = ':'): string {
    if (pattern == undefined) return '';

    if (isString(pattern)) {
        return pattern;
    }
    if (isNumber(pattern)) {
        return `${pattern}`;
    }
    if (!isPlainObject(pattern)) {
        return pattern;
    }

    const sortedKeys = Object.keys(pattern).sort((a, b) => a.localeCompare(b));

    // Creates the array of Pattern params from sorted keys and their corresponding values
    return sortedKeys.map(key => {
        let value = pattern[key];
        value = isString(value)
            ? `${patternToPath(value)}`
            : patternToPath(value);

        return `${key}${keyValueJoin}${value}`;
    }).join(joinby);

}
