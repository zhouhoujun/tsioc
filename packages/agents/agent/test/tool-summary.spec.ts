import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { summarizeToolDisplayText } from '../src';

@Suite('tool display summary')
export class ToolDisplaySummaryTest {
    @Test('glob_search match counts pluralize correctly')
    globSearchPluralizesMatches() {
        expect(summarizeToolDisplayText('glob_search', { matches: ['a.ts'] })).toContain('1 match');
        expect(summarizeToolDisplayText('glob_search', { matches: ['a.ts', 'b.ts'] })).toContain('2 matches');
        expect(summarizeToolDisplayText('glob_search', { matches: ['a.ts', 'b.ts'] })).not.toContain('matchs');
    }
}
