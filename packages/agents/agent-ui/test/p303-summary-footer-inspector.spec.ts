import { AgentMessage, InMemoryCommandExecutionControl } from "@tsdi/agent";
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import {
    resolveTimelineWindowLedger,
    TimelineWindowMessage,
    EN_TIMELINE_LABELS
} from '../src/AgentConsoleTimelineWindow';

// ── Helpers ──────────────────────────────────────────────────────────────────

function msg(id: string, overrides: Partial<TimelineWindowMessage> = {}): TimelineWindowMessage {
    return {
        id,
        role: 'assistant',
        content: 'content',
        createdAt: Date.now(),
        ...overrides
    };
}

function eventMsg(id: string, scope = 'turn-1', overrides: Record<string, any> = {}): TimelineWindowMessage {
    return msg(id, {
        metadata: {
            uiKind: 'event',
            uiEventType: 'tool_invoked',
            uiEventKey: `${scope}:tool:${id}`,
            status: 'success',
            durationMs: 100,
            ...overrides
        }
    });
}

function foldedContent(messages: TimelineWindowMessage[], summaryLabels?: any): string {
    const result = resolveTimelineWindowLedger({
        messages,
        limit: 10,
        mode: 'steps',
        activeScope: 'turn-2',
        collapsedTurns: { 'turn-1': true },
        summaryLabels
    });
    const folded = result.items.find(i => i.message.id === '__timeline_collapsed_turn-1__')!;
    return folded.message.content;
}

function createState(): AgentConsoleSessionState {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    state.setConsoleOptions({ messagesVisibleItems: 5 });
    return state;
}

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

// ── Collapsed turn summary (P303) ────────────────────────────────────────────

@Suite('collapsed turn summary (P303)')
export class CollapsedTurnSummaryTest {

    @Test('zh summary shows outcome + tool count + change count + duration')
    testZhSummaryParts() {
        const content = foldedContent([
            eventMsg('a-1', 'turn-1', {
                category: 'edit',
                timeline: { source: 'local', sequence: 1, toolCallId: 'tcA', receiptId: 'r1', attempt: 1 },
                durationMs: 500
            }),
            eventMsg('a-2', 'turn-1', {
                timeline: { source: 'local', sequence: 2, toolCallId: 'tcB', receiptId: 'r2', attempt: 1 },
                durationMs: 500
            })
        ]);
        expect(content).toContain('第 1 轮');
        expect(content).toContain('完成');
        expect(content).toContain('2 个工具');
        expect(content).toContain('1 处变更');
        expect(content).toContain('1.0s');
    }

    @Test('EN summary falls back to English labels')
    testEnSummaryParts() {
        const content = foldedContent([
            eventMsg('a-1', 'turn-1', {
                category: 'edit',
                timeline: { source: 'local', sequence: 1, toolCallId: 'tcA', receiptId: 'r1', attempt: 1 },
                durationMs: 500
            }),
            eventMsg('a-2', 'turn-1', {
                timeline: { source: 'local', sequence: 2, toolCallId: 'tcB', receiptId: 'r2', attempt: 1 },
                durationMs: 500
            })
        ], EN_TIMELINE_LABELS);
        expect(content).toContain('turn 1');
        expect(content).toContain('Done');
        expect(content).toContain('2 tool calls');
        expect(content).toContain('1 change(s)');
        expect(content).toContain('1.0s');
    }

    @Test('a cancelled turn folds with the cancelled outcome word')
    testCancelledOutcome() {
        const content = foldedContent([
            eventMsg('a-1', 'turn-1', {
                status: 'cancelled',
                uiEventType: 'turn_cancelled',
                timeline: { source: 'local', sequence: 1, toolCallId: 'tcA', receiptId: 'r1', attempt: 1 },
                durationMs: 300
            })
        ]);
        expect(content).toContain('已取消');
        expect(content).not.toContain('完成');
        expect(content).toContain('1 个工具');
    }

    @Test('no change part when no edit/write category is present')
    testNoChangePart() {
        const content = foldedContent([
            eventMsg('a-1', 'turn-1', {
                timeline: { source: 'local', sequence: 1, toolCallId: 'tcA', receiptId: 'r1', attempt: 1 },
                durationMs: 250
            }),
            eventMsg('a-2', 'turn-1', {
                timeline: { source: 'local', sequence: 2, toolCallId: 'tcB', receiptId: 'r2', attempt: 1 },
                durationMs: 120
            })
        ]);
        expect(content).toContain('完成');
        expect(content).toContain('2 个工具');
        expect(content).toContain('370ms');
        expect(content).not.toContain('变更');
    }
}

// ── Session footer (P303) ────────────────────────────────────────────────────

@Suite('session footer summary (P303)')
export class SessionFooterSummaryTest {

    @Test('zh footer shows result + duration + error count when events failed')
    testZhFooterErrorCount() {
        const state = createState();
        state.setTimelineMode('steps');
        state.setMessages([
            eventMsg('e1'),
            eventMsg('e2', 'turn-1', { status: 'error', uiEventType: 'tool_failed' }),
            eventMsg('e3', 'turn-1', { status: 'error', uiEventType: 'tool_failed' })
        ] as AgentMessage[]);
        const footer = state.sessionFooter!;
        expect(footer.content).toContain('完成');
        expect(footer.content).toContain('2 个错误');
        expect(footer.content).not.toContain('/timeline');
    }

    @Test('EN footer shows Failed + error count with English labels')
    testEnFooterErrorCount() {
        const state = createState();
        state.setConsoleOptions({ timelineLabels: EN_TIMELINE_LABELS });
        state.setTimelineMode('steps');
        state.setStatus('error');
        state.setMessages([
            eventMsg('e1', 'turn-1', { status: 'error', uiEventType: 'tool_failed' }),
            eventMsg('e2', 'turn-1', { status: 'error', uiEventType: 'tool_failed' })
        ] as AgentMessage[]);
        const footer = state.sessionFooter!;
        expect(footer.content).toContain('Failed');
        expect(footer.content).toContain('2 error(s)');
        expect(footer.content).not.toContain('/timeline');
    }

    @Test('footer omits error count when every event succeeded')
    testNoErrorPartWhenClean() {
        const state = createState();
        state.setTimelineMode('steps');
        state.setMessages([eventMsg('e1'), eventMsg('e2')] as AgentMessage[]);
        const footer = state.sessionFooter!;
        expect(footer.content).toContain('完成');
        expect(footer.content).not.toContain('个错误');
    }
}

// ── Event inspector (P303) ───────────────────────────────────────────────────

@Suite('event inspector summary (P303)')
export class EventInspectorSummaryTest {

    @Test('inspector shows content first, human status, and diagnostic ids')
    testInspectorLayout() {
        const state = createState();
        const evt = toolEvent('evt-1');
        state.setMessages([{ id: 'u1', role: 'user', content: 'hi', createdAt: Date.now() } as any, evt]);
        state.openTimelineEventInspector();

        const lines = state.timelineEventDetailLines;
        expect(lines.length).toBeGreaterThan(0);
        expect(lines.some(l => l.includes('Event Inspector'))).toEqual(true);
        // content-first ordering
        expect(lines.findIndex(l => l.includes('tool output content')))
            .toBeLessThan(lines.findIndex(l => l.includes('Status:')));
        // human result word, not the raw lifecycle token
        expect(lines.some(l => l.includes('完成'))).toEqual(true);
        expect(lines.some(l => l.includes('success'))).toEqual(false);
        expect(lines.some(l => l.includes('Duration:'))).toEqual(true);
        expect(lines.some(l => l.includes('150ms'))).toEqual(true);
        // ids sink to the diagnostic section
        expect(lines.some(l => l.includes('Diagnostic'))).toEqual(true);
        expect(lines.some(l => l.includes('Type:'))).toEqual(true);
        expect(lines.some(l => l.includes('tool_invoked'))).toEqual(true);
        expect(lines.some(l => l.includes('Sequence:'))).toEqual(true);
        expect(lines.some(l => l.includes('Source:'))).toEqual(true);
        expect(lines.some(l => l.includes('local'))).toEqual(true);
        expect(lines.some(l => l.includes('tc-evt-1'))).toEqual(true);
        expect(lines.some(l => l.includes('rc-evt-1'))).toEqual(true);
        // key bindings retained
        expect(lines.some(l => l.includes('Key Bindings'))).toEqual(true);
        expect(lines.some(l => l.includes('retry'))).toEqual(true);
    }

    @Test('inspector status word honors EN labels')
    testInspectorEnStatus() {
        const state = createState();
        state.setConsoleOptions({ timelineLabels: EN_TIMELINE_LABELS });
        const evt = toolEvent('evt-1');
        state.setMessages([{ id: 'u1', role: 'user', content: 'hi', createdAt: Date.now() } as any, evt]);
        state.openTimelineEventInspector();

        const lines = state.timelineEventDetailLines;
        expect(lines.some(l => l.includes('Done'))).toEqual(true);
        expect(lines.some(l => l.includes('完成'))).toEqual(false);
    }

    @Test('failed event shows the failure word in the status row')
    testInspectorFailedStatus() {
        const state = createState();
        const evt = toolEvent('evt-1', { status: 'error', uiEventType: 'tool_failed' });
        state.setMessages([{ id: 'u1', role: 'user', content: 'hi', createdAt: Date.now() } as any, evt]);
        state.openTimelineEventInspector();

        const lines = state.timelineEventDetailLines;
        expect(lines.some(l => l.includes('失败'))).toEqual(true);
    }
}