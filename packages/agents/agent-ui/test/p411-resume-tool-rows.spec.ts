import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { normalizeLoadedMessages } from '../src/AgentConsoleMessageNormalization';

/**
 * Real TUI finding: after a restart the tool history disappeared — loaded
 * transcripts dropped `role='tool'` messages (raw JSON blobs) and the UI
 * event rows are not persisted. They are now projected into read-only event
 * rows that keep the toolCallId for the on-demand inspector.
 */
@Suite('loaded tool messages project into summary rows')
export class ResumeToolRowsTest {
    protected toolPayload(stdout: string, exitCode = 0): string {
        return JSON.stringify({ stdout, stderr: '', exitCode });
    }

    @Test('a stored tool message becomes a readable event row')
    async projectsToolRow() {
        const stdout = Array.from({ length: 40 }, (_value, index) => `line ${index + 1}`).join('\n');
        const messages: any[] = [
            { id: 'u1', role: 'user', content: 'run it', createdAt: 1 },
            {
                id: 't1', role: 'tool', name: 'terminal', toolCallId: 'call-1', createdAt: 2,
                content: this.toolPayload(stdout),
                metadata: {
                    toolCallInput: { command: 'node -e "for(...)"' },
                    receipt: { toolCallId: 'call-1', receiptId: 'r1', durationMs: 79 }
                }
            },
            { id: 'a1', role: 'assistant', content: 'DONE', createdAt: 3 }
        ];
        const [user, row, answer] = normalizeLoadedMessages(messages);
        expect(user.id).toEqual('u1');
        expect(row.metadata?.uiKind).toEqual('event');
        expect(row.metadata?.uiEventType).toEqual('tool_completed');
        expect(String(row.content)).toContain('exit 0');
        expect(String(row.content)).toContain('node -e');
        expect(String(row.content)).toContain('40 lines');
        expect(String(row.content)).not.toContain('stdout');
        expect(row.metadata?.timeline?.toolCallId).toEqual('call-1');
        expect(row.metadata?.durationMs).toEqual(79);
        expect(answer.id).toEqual('a1');
    }

    @Test('a failing tool message keeps the failure status')
    async projectsFailure() {
        const [row] = normalizeLoadedMessages([{
            id: 't2', role: 'tool', name: 'terminal', toolCallId: 'call-2', createdAt: 2,
            content: this.toolPayload('boom', 1)
        } as any]);
        expect(row.metadata?.uiEventType).toEqual('tool_failed');
        expect(row.metadata?.status).toEqual('failed');
        expect(String(row.content)).toContain('exit 1');
    }

    @Test('messages without a usable summary are still dropped')
    async dropsUselessToolRows() {
        expect(normalizeLoadedMessages([{ id: 't3', role: 'tool', content: '{}', createdAt: 1 } as any])).toEqual([]);
    }
}
