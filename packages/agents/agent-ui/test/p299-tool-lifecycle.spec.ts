import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { AgentConsoleSessionState, shouldApplyTimelineLifecycleUpdate } from '../src';

@Suite('tool lifecycle projection (P299)')
export class ToolLifecycleProjectionTest {
    @Test('merges differing event keys by toolCallId and preserves first identity')
    mergesByToolCallId() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.upsertUiEventMessage('turn-1:tool:receipt-1', 'Running shell', {
            status: 'running', toolCallId: 'call-1', receiptId: 'receipt-1', sequence: 1, attempt: 1
        });
        const first = state.messages[0];
        state.upsertUiEventMessage('turn-1:tool:call-1', 'shell completed', {
            status: 'success', toolCallId: 'call-1', receiptId: 'receipt-2', sequence: 2, attempt: 1, durationMs: 40
        });
        expect(state.messages.length).toEqual(1);
        expect(state.messages[0].id).toEqual(first.id);
        expect(state.messages[0].createdAt).toEqual(first.createdAt);
        expect(state.messages[0].metadata?.status).toEqual('success');
        expect(state.messages[0].metadata?.durationMs).toEqual(40);
    }

    @Test('rejects stale sequence and terminal-to-running regression for the same attempt')
    rejectsStaleUpdates() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.upsertUiEventMessage('tool:call-1', 'completed', {
            status: 'success', toolCallId: 'call-1', sequence: 5, attempt: 2
        });
        state.upsertUiEventMessage('tool:call-1', 'old failure', {
            status: 'error', toolCallId: 'call-1', sequence: 4, attempt: 2
        });
        state.upsertUiEventMessage('tool:call-1', 'running again', {
            status: 'running', toolCallId: 'call-1', sequence: 6, attempt: 2
        });
        expect(state.messages[0].content).toEqual('completed');
        expect(state.messages[0].metadata?.status).toEqual('success');
    }

    @Test('allows a newer retry attempt to replace a terminal result')
    allowsRetryAttempt() {
        const current = {
            id: 'e1', role: 'assistant', content: 'failed', createdAt: 1,
            metadata: { status: 'error', timeline: { attempt: 1, sequence: 3 } }
        } as any;
        expect(shouldApplyTimelineLifecycleUpdate(current, { status: 'running', attempt: 2, sequence: 4 })).toEqual(true);
        expect(shouldApplyTimelineLifecycleUpdate(current, { status: 'running', attempt: 1, sequence: 4 })).toEqual(false);
    }

    @Test('does not merge a reused toolCallId across turn scopes')
    keepsTurnScopesDistinct() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.upsertUiEventMessage('turn-1:tool:call-1', 'first', { status: 'success', toolCallId: 'call-1' });
        state.upsertUiEventMessage('turn-2:tool:call-1', 'second', { status: 'success', toolCallId: 'call-1' });
        expect(state.messages.map(item => item.content)).toEqual(['first', 'second']);
    }
}
