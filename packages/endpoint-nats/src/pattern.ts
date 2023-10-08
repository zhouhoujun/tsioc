import { Pattern, PatternFormatter, normalize, patternToPath } from '@tsdi/common';
import { Injectable } from '@tsdi/ioc';

@Injectable()
export class NatsPatternFormatter extends PatternFormatter {
    format(pattern: Pattern): string {
        return normalize(patternToPath(pattern, '/', ':')).replace(/\//g, '.')
    }
}