import { isNumber, isPlainObject, isPromise, isString } from '@tsdi/ioc';
import { isObservable, lastValueFrom, Observable } from 'rxjs';


/**
 * pattern type.
 */
export type Pattern = string | number | Record<string, string | number | Record<string, string | number>>;

/**
 * stringify pattern.
 * @param pattern 
 * @returns 
 */
export function stringify(pattern: Pattern): string {
    if (isString(pattern) || isNumber(pattern)) {
        return `${pattern}`;
    }

    if (!isPlainObject(pattern)) return pattern;

    const sortedKeys = Object.keys(pattern).sort((a, b) =>
        ('' + a).localeCompare(b),
    );

    const sortedPatternParams = sortedKeys.map(key => {
        let partialRoute = `"${key}":`;
        partialRoute += isString(pattern[key])
            ? `"${stringify(pattern[key])}"`
            : stringify(pattern[key]);
        return partialRoute;
    });

    const route = sortedPatternParams.join(',');
    return `{${route}}`;
}

/**
 * to promise.
 * @param target 
 * @returns 
 */
export function promisify<T>(target: T | Observable<T> | Promise<T>): Promise<T> {
    if (isObservable(target)) {
        return lastValueFrom(target);
    } else if (isPromise(target)) {
        return target;
    }
    return Promise.resolve(target);
}