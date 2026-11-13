import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { mergeAgentConsoleMessages } from '../src/AgentConsoleMessageEquality';

const msg = (id: string, content = id, createdAt = 1): any => ({ id, role: 'assistant', content, createdAt });

@Suite('agent console transcript merge')
export class AgentConsoleTranscriptMergeTest {
    @Test('a refresh updates overlapping rows and appends new rows')
    mergesNewestPageWithoutDroppingHistory() {
        const older = msg('older-1', 'older');
        const cached = [older, msg('n1'), msg('n2')];
        const updated = msg('n2', 'n2-updated');
        const merged = mergeAgentConsoleMessages(cached, [updated, msg('n3')]);
        expect(merged.map(item => item.id)).toEqual(['older-1', 'n1', 'n2', 'n3']);
        expect(merged[2].content).toEqual('n2-updated');
        expect(merged[0]).toBe(older);
    }

    @Test('an identical page keeps the cached array reference')
    keepsIdenticalReference() {
        const cached = [msg('a'), msg('b')];
        expect(mergeAgentConsoleMessages(cached, [msg('a'), msg('b')])).toBe(cached);
    }

    @Test('an empty refresh never clears the loaded transcript')
    keepsTranscriptOnEmptyPage() {
        const cached = [msg('a'), msg('b')];
        expect(mergeAgentConsoleMessages(cached, [])).toBe(cached);
    }

    @Test('a page containing history beyond the cache is merged in order')
    mergesAnOverlappingWindowAfterOlderPages() {
        const cached = [msg('o1'), msg('o2'), msg('n1')];
        const merged = mergeAgentConsoleMessages(cached, [msg('n1'), msg('n2')]);
        expect(merged.map(item => item.id)).toEqual(['o1', 'o2', 'n1', 'n2']);
    }
}
