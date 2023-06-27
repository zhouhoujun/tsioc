import { Pattern, PatternFormatter, normalize, patternToPath } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';

@Injectable()
export class RedisPatternFormatter extends PatternFormatter {
    format(pattern: Pattern): string {
        return normalize(patternToPath(pattern, '/', '='))
    }
}