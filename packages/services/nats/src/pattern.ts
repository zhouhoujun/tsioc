import { Injectable } from '@tsdi/ioc';
import { Pattern, PatternFormatter, normalize, patternToPath } from '@tsdi/common';

@Injectable()
export class NatsPatternFormatter extends PatternFormatter {
    format(pattern: Pattern): string {
        return normalize(patternToPath(pattern, '/', ':')).replace(/\//g, '.')
    }
}
