import { Pattern, PatternFormatter, patternToPath } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';

@Injectable()
export class KafkaPatternFormatter extends PatternFormatter {
    format(pattern: Pattern): string {
        return patternToPath(pattern, '/', '-').replace(/\//g, '.')
    }
}