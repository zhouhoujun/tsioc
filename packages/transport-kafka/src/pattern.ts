import { Pattern, PatternFormatter, patternToPath, DefaultRouteMatcher } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';

@Injectable()
export class KafkaPatternFormatter extends PatternFormatter {
    format(pattern: Pattern): string {
        return patternToPath(pattern, '/', '-').replace(/\//g, '\\.')
    }
}

@Injectable()
export class KafkaRouteMatcher extends DefaultRouteMatcher {

    protected override registerPattern(route: string, patterns?: string[], regExp?: RegExp | undefined): void {
        if (regExp) {
            this.patterns.set(route, regExp);
        } else {
            patterns ? patterns.forEach(p => this.patterns.set(p, p))
                : this.patterns.set(route, route);
        }
    }
}
