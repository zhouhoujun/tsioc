import { InMemoryCommandExecutionControl } from "@tsdi/agent";
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';

function eventMsg(id: string, topOverrides: Record<string, any> = {}, metaOverrides: Record<string, any> = {}): any {
    return {
        id,
        role: 'assistant',
        content: 'event content',
        createdAt: Date.now(),
        metadata: {
            uiKind: 'event',
            uiEventType: 'tool_invoked',
            uiEventLabel: 'tool',
            uiEventKey: `scope:tool:${id}`,
            status: 'success',
            durationMs: 100,
            timeline: {
                source: 'local',
                sequence: 1,
                toolCallId: `tc-${id}`,
                receiptId: `rc-${id}`,
                attempt: 1
            },
            ...metaOverrides
        },
        ...topOverrides
    };
}

function errorMsg(id: string): any {
    return eventMsg(id, {}, {
        status: 'error',
        uiEventType: 'tool_failed',
        uiEventKey: `scope:read:${id}`
    });
}

function userMsg(id: string): any {
    return { id, role: 'user', content: 'hello', createdAt: 1 };
}

const CJK_TEXT = '这是一段包含中文字符的测试内容用于验证窄终端下的显示效果';
const LONG_CONTENT = 'A'.repeat(2000);

@Suite('timeline readability acceptance (P224)')
export class TimelineReadabilityAcceptanceTest {

    @Test('compact mode: active scope + errors are present')
    testCompactShowsActiveAndErrors() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setConsoleOptions({ messagesVisibleItems: 5 });
        state.setTimelineMode('compact');
        state.setMessages([
            userMsg('u1'),
            eventMsg('e1', {}, { uiEventKey: 'scope:old_tool:e1' }),
            eventMsg('e2', {}, { uiEventKey: 'scope:old_tool:e2' }),
            errorMsg('e3'),
            eventMsg('e4', {}, { uiEventKey: 'scope:active_tool:e4' })
        ]);
        const visible = state.displayMessages;
        const eventIds = visible.filter(m => String(m.id).startsWith('e')).map(m => m.id);
        expect(eventIds).toContain('e4');
        expect(eventIds).toContain('e3');
    }

    @Test('compact mode: error events always visible')
    testCompactErrorAlwaysVisible() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setConsoleOptions({ messagesVisibleItems: 3 });
        state.setTimelineMode('compact');
        state.setMessages([
            userMsg('u1'),
            errorMsg('err-1'),
            eventMsg('e2', {}, { uiEventKey: 'scope:other_tool:e2' }),
            eventMsg('e3', {}, { uiEventKey: 'scope:other_tool:e3' })
        ]);
        const visible = state.displayMessages;
        expect(visible.some(m => m.id === 'err-1')).toBe(true);
    }

    @Test('steps mode: all events present in displayMessages')
    testStepsDisplayMessages() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setConsoleOptions({ messagesVisibleItems: 3 });
        state.setTimelineMode('steps');
        const events = Array.from({ length: 10 }, (_, i) =>
            eventMsg(`e-${i + 1}`, {}, { uiEventKey: `scope:t:e-${i + 1}` })
        );
        state.setMessages([userMsg('u1'), ...events]);
        const visible = state.displayMessages;
        const eventCount = visible.filter(m => String(m.id).startsWith('e-')).length;
        expect(eventCount).toBe(10);
    }

    @Test('verbose mode: all events returned without filtering')
    testVerboseAllEvents() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setConsoleOptions({ messagesVisibleItems: 3 });
        state.setTimelineMode('verbose');
        const events = Array.from({ length: 10 }, (_, i) =>
            eventMsg(`v-${i + 1}`, {}, { uiEventKey: `scope:t:v-${i + 1}` })
        );
        state.setMessages([userMsg('u1'), ...events]);
        const visible = state.displayMessages;
        const eventCount = visible.filter(m => String(m.id).startsWith('v-')).length;
        expect(eventCount).toBe(10);
    }

    @Test('multi-step parallel: concurrent tool calls in same scope are all present')
    testMultiStepParallel() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setConsoleOptions({ messagesVisibleItems: 20 });
        state.setTimelineMode('compact');
        state.beginTurnEventScope('scope');
        state.setMessages([
            userMsg('u1'),
            eventMsg('p1', {}, { uiEventKey: 'scope:tool_a:p1' }),
            eventMsg('p2', {}, { uiEventKey: 'scope:tool_b:p2' }),
            eventMsg('p3', {}, { uiEventKey: 'scope:tool_a:p3' }),
            eventMsg('p4', {}, { uiEventKey: 'scope:tool_b:p4' })
        ]);
        const visible = state.displayMessages;
        const eventIds = visible.filter(m => String(m.id).startsWith('p')).map(m => m.id);
        expect(eventIds).toContain('p1');
        expect(eventIds).toContain('p2');
        expect(eventIds).toContain('p3');
        expect(eventIds).toContain('p4');
    }

    @Test('retry failure: failed + retry both visible in compact')
    testRetryFailureVisible() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setConsoleOptions({ messagesVisibleItems: 5 });
        state.setTimelineMode('compact');
        state.setMessages([
            userMsg('u1'),
            eventMsg('r1', {}, {
                uiEventKey: 'scope:read:r1',
                status: 'error',
                uiEventType: 'tool_failed',
                timeline: { source: 'local', sequence: 1, toolCallId: 'tc-r1', receiptId: 'rc-r1', attempt: 1 }
            }),
            eventMsg('r2', {}, {
                uiEventKey: 'scope:read:r2',
                status: 'success',
                timeline: { source: 'local', sequence: 2, toolCallId: 'tc-r1', receiptId: 'rc-r2', attempt: 2 }
            })
        ]);
        const visible = state.displayMessages;
        expect(visible.some(m => m.id === 'r1')).toBe(true);
        expect(visible.some(m => m.id === 'r2')).toBe(true);
    }

    @Test('long tool output: content is preserved in message list')
    testLongToolOutputPreserved() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setConsoleOptions({ messagesVisibleItems: 5 });
        state.setTimelineMode('verbose');
        state.setMessages([
            userMsg('u1'),
            eventMsg('long-1', { content: LONG_CONTENT })
        ]);
        const visible = state.displayMessages;
        const longMsg = visible.find(m => m.id === 'long-1');
        expect(longMsg).toBeDefined();
        expect(longMsg!.content.length).toBe(2000);
    }

    @Test('narrow terminal: CJK content does not crash')
    testCjkContentSafe() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setConsoleOptions({ messagesVisibleItems: 5 });
        state.setTimelineMode('compact');
        state.setMessages([
            userMsg('u1'),
            eventMsg('cjk-1', { content: CJK_TEXT }),
            eventMsg('cjk-2', { content: CJK_TEXT + ' x'.repeat(80) })
        ]);
        const visible = state.displayMessages;
        expect(visible.length).toBeGreaterThan(0);
    }

    @Test('first-screen visibility: active scope events present')
    testCurrentStepVisible() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setConsoleOptions({ messagesVisibleItems: 3 });
        state.setTimelineMode('steps');
        state.beginTurnEventScope('scope');
        const events = Array.from({ length: 20 }, (_, i) =>
            eventMsg(`fs-${i + 1}`, {}, { uiEventKey: `scope:t:fs-${i + 1}` })
        );
        state.setMessages([userMsg('u1'), ...events]);
        const visible = state.displayMessages;
        const activeEvents = visible.filter(m =>
            String(m.metadata?.uiEventKey || '').startsWith('scope:')
        );
        expect(activeEvents.length).toBeGreaterThan(0);
    }

    @Test('80-column: event IDs are short')
    test80ColumnIdsShort() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setConsoleOptions({ messagesVisibleItems: 10 });
        state.setTimelineMode('compact');
        state.setMessages([
            userMsg('u1'),
            eventMsg('short-id'),
            eventMsg('another-short')
        ]);
        const visible = state.displayMessages;
        visible.forEach(m => {
            expect(String(m.id || '').length).toBeLessThanOrEqual(80);
        });
    }

    @Test('disconnected replay: events from different sources coexist')
    testDisconnectedReplay() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setConsoleOptions({ messagesVisibleItems: 10 });
        state.setTimelineMode('steps');
        state.setMessages([
            userMsg('u1'),
            eventMsg('local-1', {}, {
                uiEventKey: 'scope:tool:local-1',
                timeline: { source: 'local', sequence: 1, toolCallId: 'tc-l1', receiptId: 'rc-l1', attempt: 1 }
            }),
            eventMsg('sse-1', {}, {
                uiEventKey: 'scope:tool:sse-1',
                timeline: { source: 'sse', sequence: 2, toolCallId: 'tc-s1', receiptId: 'rc-s1', attempt: 1 }
            }),
            eventMsg('local-2', {}, {
                uiEventKey: 'scope:tool:local-2',
                timeline: { source: 'local', sequence: 3, toolCallId: 'tc-l2', receiptId: 'rc-l2', attempt: 1 }
            })
        ]);
        const visible = state.displayMessages;
        expect(visible.some(m => m.id === 'local-1')).toBe(true);
        expect(visible.some(m => m.id === 'sse-1')).toBe(true);
        expect(visible.some(m => m.id === 'local-2')).toBe(true);
    }

    @Test('timelineViewMode change is synchronous')
    testSyncModeChange() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        expect(state.timelineViewMode).toBe('off');
        state.setTimelineMode('steps');
        expect(state.timelineViewMode).toBe('steps');
    }
}
