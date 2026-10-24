import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { renderAgentConsoleMessageItem, renderAgentConsoleMessageItems } from '../src';

/**
 * Real session finding: while a turn was still running (`Working (2m 29s)`),
 * the preamble reply rendered `Worked for 29s · done 16:24`, which reads as
 * "the task finished". Only the final reply of a turn may carry that footer.
 */
@Suite('preamble replies do not claim the turn is done')
export class PreambleDoneFooterTest {
    protected textOf(item: { lines: Array<{ content?: string; meta?: string }> }): string {
        return item.lines.map(line => `${line.meta || ''}${line.content || ''}`).join('\n');
    }

    protected message(metadata: Record<string, any>, id = 'a1'): any {
        return {
            id,
            role: 'assistant',
            content: 'Checking the timer tests now.',
            createdAt: 1_000,
            metadata: { durationMs: 29_000, completedAt: 30_000, ...metadata }
        };
    }

    @Test('a preamble reply renders no worked/done footer')
    async preambleHasNoFooter() {
        const preamble = renderAgentConsoleMessageItem(this.message({ preamble: true }), {});
        expect(this.textOf(preamble)).not.toContain('Worked for');
        const phased = renderAgentConsoleMessageItem(this.message({ conversationPhase: 'preamble' }, 'a2'), {});
        expect(this.textOf(phased)).not.toContain('Worked for');
        // Real run finding: narration attached to a tool call carries no
        // `preamble` flag, only `toolCalls`. It must still stay footer-free while
        // the turn is running.
        const narration = renderAgentConsoleMessageItem(this.message({
            toolCalls: [{ id: 'call-1', name: 'read_file', input: { path: 'README.md' } }]
        }, 'a4'), {});
        expect(this.textOf(narration)).not.toContain('Worked for');
        // Real run finding: on reload the runtime has stripped `toolCalls` but
        // keeps `finishReason: tool_calls` on the interim step message. Without
        // that signal the fabricated duration rendered `Worked for 1s · done`
        // while the turn was still running.
        const step = renderAgentConsoleMessageItem(this.message({ finishReason: 'tool_calls' }, 'a5'), {});
        expect(this.textOf(step)).not.toContain('Worked for');
        const finished = renderAgentConsoleMessageItem(this.message({ finishReason: 'stop' }, 'a6'), {});
        expect(this.textOf(finished)).toContain('Worked for');
    }

    @Test('the final reply keeps the worked/done footer')
    async finalReplyKeepsFooter() {
        const finalReply = renderAgentConsoleMessageItem(this.message({}, 'a3'), {});
        expect(this.textOf(finalReply)).toContain('Worked for');
        expect(this.textOf(finalReply)).toContain('done');
    }

    @Test('the renderer suppresses the footer for preambles inside a transcript')
    async transcriptSkipsPreambleFooter() {
        const items = renderAgentConsoleMessageItems([
            { id: 'u1', role: 'user', content: 'run the tests', createdAt: 1 } as any,
            this.message({ preamble: true }, 'a1'),
            this.message({}, 'a2')
        ], {});
        const texts = items.map(item => this.textOf(item));
        expect(texts[1]).not.toContain('Worked for');
        expect(texts[2]).toContain('Worked for');
    }
}
