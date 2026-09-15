import { InMemoryCommandExecutionControl } from "@tsdi/agent";
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';

function toolEvent(id: string, overrides: Record<string, any> = {}): any {
    return {
        id,
        role: 'assistant',
        content: 'tool output content',
        createdAt: Date.now(),
        metadata: {
            uiKind: 'event',
            uiEventType: 'tool_invoked',
            uiEventLabel: 'tool',
            uiEventKey: `scope:read:${id}`,
            status: 'success',
            durationMs: 150,
            timeline: {
                source: 'local',
                sequence: 1,
                toolCallId: `tc-${id}`,
                receiptId: `rc-${id}`,
                attempt: 1
            },
            ...overrides
        }
    };
}

function failedToolEvent(id: string): any {
    return toolEvent(id, {
        uiEventType: 'tool_failed',
        status: 'error',
        durationMs: 200,
        timeline: {
            source: 'local',
            sequence: 2,
            toolCallId: `tc-${id}`,
            receiptId: `rc-${id}`,
            attempt: 3
        }
    });
}

function userMsg(id: string): any {
    return { id, role: 'user', content: 'hello', createdAt: 1 };
}

@Suite('timeline event inspector (P222)')
export class TimelineEventInspectorTest {

    @Test('openTimelineEventInspector sets open + selectedTimelineEventId')
    async openSetsState() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const evt = toolEvent('evt-1');
        state.setMessages([userMsg('u1'), evt]);
        state.selectedMessageId = 'evt-1';

        state.openTimelineEventInspector();

        expect(state.timelineEventInspectorOpen).toEqual(true);
        expect(state.selectedTimelineEventId).toEqual('evt-1');
        expect(state.selectedTimelineEvent?.id).toEqual('evt-1');
    }

    @Test('openTimelineEventInspector with explicit event argument')
    async openWithExplicitArg() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const evt1 = toolEvent('evt-1');
        const evt2 = toolEvent('evt-2');
        state.setMessages([userMsg('u1'), evt1, evt2]);
        state.selectedMessageId = 'evt-1';

        state.openTimelineEventInspector(evt2 as any);

        expect(state.selectedTimelineEventId).toEqual('evt-2');
    }

    @Test('openTimelineEventInspector rejects non-event messages')
    async openRejectsNonEvent() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const msg = userMsg('u1');
        state.setMessages([msg]);
        state.selectedMessageId = 'u1';

        state.openTimelineEventInspector();

        expect(state.timelineEventInspectorOpen).toEqual(false);
        expect(state.selectedTimelineEventId).toEqual('');
    }

    @Test('closeTimelineEventInspector resets state')
    async closeResetsState() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const evt = toolEvent('evt-1');
        state.setMessages([userMsg('u1'), evt]);
        state.openTimelineEventInspector();

        state.closeTimelineEventInspector();

        expect(state.timelineEventInspectorOpen).toEqual(false);
        expect(state.selectedTimelineEventId).toEqual('');
        expect(state.selectedTimelineEvent).toBeUndefined();
    }

    @Test('closeTimelineEventInspector is no-op when already closed')
    async closeNoOp() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        state.timelineEventInspectorOpen = false;

        state.closeTimelineEventInspector();

        expect(state.timelineEventInspectorOpen).toEqual(false);
    }

    @Test('timelineEventDetailLines shows content first, human status, and diagnostic ids (P303)')
    async detailLinesContent() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const evt = toolEvent('evt-1');
        state.setMessages([userMsg('u1'), evt]);
        state.openTimelineEventInspector();

        const lines = state.timelineEventDetailLines;
        expect(lines.length).toBeGreaterThan(0);
        expect(lines.some(l => l.includes('Event Inspector'))).toEqual(true);
        // content first (human-readable title/result), then status, then ids
        expect(lines.findIndex(l => l.includes('tool output content')))
            .toBeLessThan(lines.findIndex(l => l.includes('Status:')));
        expect(lines.some(l => l.includes('Status:'))).toEqual(true);
        expect(lines.some(l => l.includes('完成'))).toEqual(true);
        expect(lines.some(l => l.includes('Duration:'))).toEqual(true);
        expect(lines.some(l => l.includes('150ms'))).toEqual(true);
        expect(lines.some(l => l.includes('Diagnostic'))).toEqual(true);
        expect(lines.some(l => l.includes('Type:'))).toEqual(true);
        expect(lines.some(l => l.includes('tool_invoked'))).toEqual(true);
        expect(lines.some(l => l.includes('Sequence:'))).toEqual(true);
        expect(lines.some(l => l.includes('Source:'))).toEqual(true);
        expect(lines.some(l => l.includes('local'))).toEqual(true);
        expect(lines.some(l => l.includes('tc-evt-1'))).toEqual(true);
        expect(lines.some(l => l.includes('rc-evt-1'))).toEqual(true);
        expect(lines.some(l => l.includes('tool output content'))).toEqual(true);
        expect(lines.some(l => l.includes('Key Bindings'))).toEqual(true);
        expect(lines.some(l => l.includes('retry'))).toEqual(true);
    }

    @Test('timelineEventDetailLines empty when no event selected')
    async detailLinesEmpty() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);

        expect(state.timelineEventDetailLines).toEqual([]);
    }

    @Test('hasTimelineEventInspectorFocus mirrors open state')
    async focusMirrorsOpen() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);

        expect(state.hasTimelineEventInspectorFocus).toEqual(false);
        state.openTimelineEventInspector(toolEvent('e1') as any);
        expect(state.hasTimelineEventInspectorFocus).toEqual(true);
        state.closeTimelineEventInspector();
        expect(state.hasTimelineEventInspectorFocus).toEqual(false);
    }

    @Test('isAnyFocusActive includes timelineEventInspector')
    async isAnyFocusIncludesInspector() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const evt = toolEvent('evt-1');
        state.setMessages([userMsg('u1'), evt]);

        expect(state.isAnyFocusActive()).toEqual(false);
        state.openTimelineEventInspector();
        expect(state.isAnyFocusActive()).toEqual(true);
    }

    @Test('scrollTimelineEventDetail clamps within bounds')
    async scrollDetailClamps() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const evt = toolEvent('evt-1');
        state.setMessages([userMsg('u1'), evt]);
        state.openTimelineEventInspector();

        const totalLines = state.timelineEventDetailLines.length;
        state.scrollTimelineEventDetail(totalLines + 10);
        expect(state.timelineEventDetailScroll).toBeLessThanOrEqual(totalLines);

        state.scrollTimelineEventDetail(-(totalLines + 10));
        expect(state.timelineEventDetailScroll).toEqual(0);
    }

    @Test('scrollTimelineEventDetailPage scrolls by visible lines')
    async scrollPage() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const evt = toolEvent('evt-1');
        state.setMessages([userMsg('u1'), evt]);
        state.openTimelineEventInspector();

        const before = state.timelineEventDetailScroll;
        state.scrollTimelineEventDetailPage(1);
        expect(state.timelineEventDetailScroll).toBeGreaterThan(before);
    }

    @Test('scrollTimelineEventDetailToEdge jumps to start/end')
    async scrollToEdge() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const evt = toolEvent('evt-1');
        state.setMessages([userMsg('u1'), evt]);
        state.openTimelineEventInspector();

        state.scrollTimelineEventDetailToEdge('end');
        expect(state.timelineEventDetailScroll).toBeGreaterThan(0);

        state.scrollTimelineEventDetailToEdge('start');
        expect(state.timelineEventDetailScroll).toEqual(0);
    }

    @Test('scrollTimelineEventDetailColumns clamps')
    async scrollColumnsClamps() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const evt = toolEvent('evt-1');
        state.setMessages([userMsg('u1'), evt]);
        state.openTimelineEventInspector();

        const maxCol = state.timelineEventDetailMaxColumn;
        state.scrollTimelineEventDetailColumns(maxCol + 10);
        expect(state.timelineEventDetailColumnScroll).toEqual(Math.max(0, maxCol - 1));

        state.scrollTimelineEventDetailColumnsToEdge('start');
        expect(state.timelineEventDetailColumnScroll).toEqual(0);
    }

    @Test('canRetryTimelineEvent returns true for failed events')
    async retryAllowed() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const evt = failedToolEvent('evt-fail');
        state.setMessages([userMsg('u1'), evt]);
        state.openTimelineEventInspector();

        expect((state as any).canRetryTimelineEvent()).toEqual(true);
    }

    @Test('canRetryTimelineEvent returns false for success events')
    async retryDenied() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const evt = toolEvent('evt-ok');
        state.setMessages([userMsg('u1'), evt]);
        state.openTimelineEventInspector();

        expect((state as any).canRetryTimelineEvent()).toEqual(false);
    }

    @Test('canRetryTimelineEvent returns false when inspector closed')
    async retryDeniedWhenClosed() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const evt = failedToolEvent('evt-fail');
        state.setMessages([userMsg('u1'), evt]);
        state.selectedMessageId = 'evt-fail';
        state.timelineEventInspectorOpen = false;

        expect((state as any).canRetryTimelineEvent()).toEqual(false);
    }

    @Test('buildTimelineEventRetryPayload returns correct payload')
    async retryPayload() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const evt = failedToolEvent('evt-fail');
        state.setMessages([userMsg('u1'), evt]);
        state.openTimelineEventInspector();

        const payload = (state as any).buildTimelineEventRetryPayload();
        expect(payload).toBeTruthy();
        expect(payload.toolCallId).toEqual('tc-evt-fail');
        expect(payload.receiptId).toEqual('rc-evt-fail');
        expect(payload.attempt).toEqual(3);
        expect(payload.uiEventKey).toEqual('scope:read:evt-fail');
    }

    @Test('buildTimelineEventRetryPayload returns null when no event selected')
    async retryPayloadNull() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);

        const payload = (state as any).buildTimelineEventRetryPayload();
        expect(payload).toBeNull();
    }

    @Test('openTimelineEventInspector resets scroll to 0')
    async openResetsScroll() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const evt = toolEvent('evt-1');
        state.setMessages([userMsg('u1'), evt]);
        state.openTimelineEventInspector();
        state.scrollTimelineEventDetail(5);
        expect(state.timelineEventDetailScroll).toBeGreaterThan(0);

        state.openTimelineEventInspector();
        expect(state.timelineEventDetailScroll).toEqual(0);
        expect(state.timelineEventDetailColumnScroll).toEqual(0);
    }

    @Test('closeTimelineEventInspector clears scroll')
    async closeResetsScroll() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const evt = toolEvent('evt-1');
        state.setMessages([userMsg('u1'), evt]);
        state.openTimelineEventInspector();
        state.scrollTimelineEventDetail(5);

        state.closeTimelineEventInspector();
        expect(state.timelineEventDetailScroll).toEqual(0);
        expect(state.timelineEventDetailColumnScroll).toEqual(0);
    }

    @Test('setMessagesFocused(false) closes timeline event inspector')
    async unfocusClosesInspector() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const evt = toolEvent('evt-1');
        state.setMessages([userMsg('u1'), evt]);
        state.openTimelineEventInspector();
        expect(state.timelineEventInspectorOpen).toEqual(true);

        state.setMessagesFocused(false);
        expect(state.timelineEventInspectorOpen).toEqual(false);
    }

    @Test('isTimelineEventMessage identifies tool events')
    async isTimelineEventMessagePositive() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const evt = toolEvent('e1');
        expect((state as any).isTimelineEventMessage(evt)).toEqual(true);
    }

    @Test('isTimelineEventMessage rejects non-event messages')
    async isTimelineEventMessageNegative() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        expect((state as any).isTimelineEventMessage(userMsg('u1'))).toEqual(false);
        expect((state as any).isTimelineEventMessage(null)).toEqual(false);
        expect((state as any).isTimelineEventMessage(undefined)).toEqual(false);
    }

    @Test('isTimelineEventMessage rejects non-tool event types')
    async isTimelineEventMessageRejectsState() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const msg = { id: 'x', role: 'assistant', metadata: { uiKind: 'event', uiEventType: 'state' } } as any;
        expect((state as any).isTimelineEventMessage(msg)).toEqual(false);
    }

    @Test('timelineEventDetailLines shows attempt only when > 1')
    async attemptShownOnlyWhenMultiple() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const evt1 = toolEvent('evt-1');  // attempt: 1
        state.setMessages([userMsg('u1'), evt1]);
        state.openTimelineEventInspector();

        expect(state.timelineEventDetailLines.some(l => l.includes('Attempt:'))).toEqual(false);

        const evt2 = toolEvent('evt-2');
        evt2.metadata!.timeline = { source: 'local', sequence: 1, toolCallId: 'tc', receiptId: 'rc', attempt: 5 };
        state.closeTimelineEventInspector();
        state.setMessages([userMsg('u1'), evt2]);
        state.openTimelineEventInspector(evt2 as any);

        expect(state.timelineEventDetailLines.some(l => l.includes('Attempt:    5'))).toEqual(true);
    }

    @Test('handleFocusKey with enter/esc closes inspector')
    async focusKeyEscape() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const evt = toolEvent('evt-1');
        state.setMessages([userMsg('u1'), evt]);
        state.openTimelineEventInspector();

        state.handleFocusKey('Escape');
        expect(state.timelineEventInspectorOpen).toEqual(false);
    }

    @Test('handleEscapeKey closes timeline event inspector')
    async escapeKeyCloses() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' } as any);
        const evt = toolEvent('evt-1');
        state.setMessages([userMsg('u1'), evt]);
        state.openTimelineEventInspector();

        state.handleEscapeKey();
        expect(state.timelineEventInspectorOpen).toEqual(false);
    }
}
