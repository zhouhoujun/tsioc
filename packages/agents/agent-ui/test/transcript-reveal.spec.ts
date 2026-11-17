import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { revealAgentConsoleMessage } from '../src/AgentConsoleTranscriptLayout';

@Suite('agent console transcript reveal')
export class AgentConsoleTranscriptRevealTest {
    @Test('prefers a DOM message-id reveal when the surface provides one')
    prefersMessageReveal() {
        const revealed: string[] = [];
        let synced = 0;
        const ok = revealAgentConsoleMessage(
            { messageRowOffset: () => 3 },
            {
                revealMessage: (messageId: string) => { revealed.push(messageId); return true; },
                scrollViewportToRow: () => { throw new Error('row scroll must not run'); }
            },
            () => { synced += 1; },
            'a1'
        );
        expect(ok).toEqual(true);
        expect(revealed).toEqual(['a1']);
        expect(synced).toEqual(1);
    }

    @Test('falls back to row scrolling for terminal surfaces')
    fallsBackToRowScroll() {
        const rows: number[] = [];
        const ok = revealAgentConsoleMessage(
            { messageRowOffset: (id: string) => (id === 'a1' ? 5 : undefined) },
            { scrollViewportToRow: (row: number) => { rows.push(row); return true; } },
            () => undefined,
            'a1'
        );
        expect(ok).toEqual(true);
        expect(rows).toEqual([5]);
    }

    @Test('a missing DOM target falls back instead of failing outright')
    domMissFallsBack() {
        const rows: number[] = [];
        const ok = revealAgentConsoleMessage(
            { messageRowOffset: () => 2 },
            {
                revealMessage: () => false,
                scrollViewportToRow: (row: number) => { rows.push(row); return true; }
            },
            () => undefined,
            'a1'
        );
        expect(ok).toEqual(true);
        expect(rows).toEqual([2]);
    }
}
