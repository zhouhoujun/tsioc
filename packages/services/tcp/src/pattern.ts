import { Pattern, PatternFormatter, patternToPath } from '@tsdi/common';

/**
 * TCP pattern formatter.
 */
export class TcpPatternFormatter extends PatternFormatter {
    /**
     * Transforms the Pattern to Route.
     * @param pattern 
     */
    format(pattern: Pattern): string {
        return patternToPath(pattern);
    }
}