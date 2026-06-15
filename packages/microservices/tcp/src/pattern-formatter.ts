import { Injectable, isNumber, isPlainObject, isRegExp, isString } from '@tsdi/ioc';
import { Pattern, PatternFormatter } from '@tsdi/common';

function sortValue(value: any): any {
    if (Array.isArray(value)) {
        return value.map(sortValue);
    }
    if (value && isPlainObject(value)) {
        return Object.keys(value).sort((a, b) => a.localeCompare(b)).reduce((acc, key) => {
            acc[key] = sortValue(value[key]);
            return acc;
        }, {} as Record<string, any>);
    }
    return value;
}

/**
 * Canonical formatter for TCP micro object patterns.
 *
 * Unlike the default formatter, it avoids `key:value` output which collides
 * with micro wildcard syntax. Object patterns are emitted as stable JSON keys.
 */
@Injectable({ static: true })
export class TcpMicroPatternFormatter extends PatternFormatter {
    format(pattern: Pattern): string {
        if (pattern == null) return '';
        if (isString(pattern)) return pattern;
        if (isNumber(pattern)) return `${pattern}`;
        if (isRegExp(pattern)) return pattern.source;
        if (!isPlainObject(pattern)) return pattern as any;
        return JSON.stringify(sortValue(pattern));
    }
}
