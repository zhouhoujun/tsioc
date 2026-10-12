import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { EventHandler } from '../src/api/EventHandler';

/**
 * P411 — ask_user questions must reach the console UI with their structured
 * payload so a real question panel (question text + options) can be rendered.
 *
 * Regression: `onToolCompleted` used to run the ask_user output through
 * `summarizeValue`, collapsing it to `{ type: 'object', keys: [...] }`. The
 * remote event bridge guards on `output.kind === 'ask_user'`, so the pending
 * question never surfaced and the user only saw a truncated transcript row.
 */
@Suite('gateway ask_user question surfacing (P411)')
export class AskUserQuestionSurfacingTest {
    @Test('tool_completed preserves the structured ask_user payload')
    async askUserPayloadIsPreserved() {
        const handler = new EventHandler({} as any);
        const records: any[] = [];
        handler.subscribe('s1', record => records.push(record));

        handler.onToolCompleted({
            sessionId: 's1',
            toolName: 'ask_user',
            output: {
                kind: 'ask_user',
                sessionId: 's1',
                questionId: 'q1',
                question: 'Pick?',
                options: ['a', 'b'],
                severity: 'medium'
            },
            receipt: { receiptId: 'r1', toolCallId: 'c1', status: 'success', attemptCount: 1 }
        } as any);

        const completed = records.find(record => record.type === 'tool_completed');
        expect(completed).toBeTruthy();
        expect(completed!.data.output.kind).toEqual('ask_user');
        expect(completed!.data.output.question).toEqual('Pick?');
        expect(Array.isArray(completed!.data.output.options)).toEqual(true);
        // Must NOT be collapsed into the generic object summary.
        expect(completed!.data.output.type).toBeUndefined();
    }

    @Test('tool_completed still summarizes non-ask_user tool output')
    async otherToolOutputIsSummarized() {
        const handler = new EventHandler({} as any);
        const records: any[] = [];
        handler.subscribe('s1', record => records.push(record));

        handler.onToolCompleted({
            sessionId: 's1',
            toolName: 'read_file',
            output: { path: 'a.txt', content: 'hello' },
            receipt: { receiptId: 'r2', toolCallId: 'c2', status: 'success', attemptCount: 1 }
        } as any);

        const completed = records.find(record => record.type === 'tool_completed');
        expect(completed).toBeTruthy();
        expect(completed!.data.output.type).toEqual('object');
        expect(completed!.data.output.keys).toContain('path');
        expect(completed!.data.output.content).toBeUndefined();
    }
}
