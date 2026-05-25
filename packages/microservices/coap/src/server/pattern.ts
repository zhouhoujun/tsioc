import { Injectable, isString } from '@tsdi/ioc';
import { Pattern, PatternFormatter, normalize, patternToPath } from '@tsdi/common';

@Injectable()
export class CoapPatternFormatter extends PatternFormatter {
    format(pattern: Pattern): string {
        return normalize(patternToPath(pattern));
    }
}

@Injectable()
export class CoapCompatiblePatternFormatter extends PatternFormatter {
    format(pattern: Pattern): string {
        const path = normalize(patternToPath(pattern));
        return isString(pattern) && path.includes('.') && !path.includes('/')
            ? path.replace(/\./g, '/')
            : path;
    }
}
