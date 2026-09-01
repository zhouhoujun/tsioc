import { InMemoryCommandExecutionControl } from "@tsdi/agent";
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    AgentConsoleSessionState,
    renderAgentConsoleMessageItems,
    resolveTimelineEventActionLabel,
    truncateTimelineEventRowContent,
    TIMELINE_EVENT_ROW_CONTENT_MAX
} from '../src';

function upsertEvent(
    state: AgentConsoleSessionState,
    key: string,
    eventType: string,
    status: 'running' | 'success' | 'failed' | 'error' | undefined,
    content = 'event content',
    over: Record<string, unknown> = {}
) {
    state.upsertUiEventMessage(key, content, {
        eventType,
        status,
        eventKey: key,
        ...over
    } as any);
    return state.displayMessages.find(item => item.metadata?.uiKind === 'event' && item.metadata?.uiEventKey === key);
}

@Suite('P237 timeline event row summary baseline')
export class P237EventRowSummaryTest {

    @Test('event rows carry textual status in meta (no color-only status)')
    eventMetaCarriesTextualStatus() {
        const running = renderAgentConsoleMessageItems([{
            id: 'e1', role: 'assistant', content: 'Reading files', createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_invoked', status: 'running' }
        }] as any);
        expect(running[0].lines[0].meta).toContain('正在执行');

        const completed = renderAgentConsoleMessageItems([{
            id: 'e2', role: 'assistant', content: 'Read files', createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_completed', status: 'success', durationMs: 1250 }
        }] as any);
        expect(completed[0].lines[0].meta).toContain('1.3s');
        expect(completed[0].lines[0].meta).toContain('成功');

        const failed = renderAgentConsoleMessageItems([{
            id: 'e3', role: 'assistant', content: 'Read failed', createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_failed', status: 'error' }
        }] as any);
        expect(failed[0].lines[0].meta).toContain('错误');
        expect(failed[0].lines[0].meta).toContain('retry');
    }

    @Test('long event row content is truncated; the full body stays on the message')
    longEventRowTruncated() {
        const longContent = 'x'.repeat(300);
        const message = {
            id: 'e4', role: 'assistant', content: longContent, createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_completed', status: 'success', durationMs: 1250 }
        };
        const items = renderAgentConsoleMessageItems([message] as any);
        expect(items[0].lines[0].content.length).toBeLessThanOrEqual(TIMELINE_EVENT_ROW_CONTENT_MAX + 1);
        expect(items[0].lines[0].content).toEqual(`${'x'.repeat(TIMELINE_EVENT_ROW_CONTENT_MAX)}…`);
        expect(items[0].lines[0].meta).toContain('1.3s');
        expect(message.content).toEqual(longContent);
    }

    @Test('failed event rows stay fully expanded by default')
    failedEventRowStaysExpanded() {
        const longContent = 'x'.repeat(300);
        const message = {
            id: 'e5', role: 'assistant', content: longContent, createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_failed', status: 'error', durationMs: 40 }
        };
        const items = renderAgentConsoleMessageItems([message] as any);
        expect(items[0].lines[0].content).toEqual(longContent);
        expect(message.content).toEqual(longContent);
        expect(items[0].lines[0].meta).toContain('retry');
    }

    @Test('resolveTimelineEventActionLabel maps actionable states to labels')
    actionLabelMapping() {
        expect(resolveTimelineEventActionLabel(undefined, 'error')).toEqual('');
        expect(resolveTimelineEventActionLabel({ id: 'x', role: 'user', content: 'hi', createdAt: 1 } as any, 'error')).toEqual('');
        expect(resolveTimelineEventActionLabel({ id: 'x', role: 'assistant', content: 'c', createdAt: 1, metadata: { uiKind: 'event', uiEventType: 'tool_failed' } } as any, 'error')).toEqual('retry');
        expect(resolveTimelineEventActionLabel({ id: 'x', role: 'assistant', content: 'c', createdAt: 1, metadata: { uiKind: 'event', uiEventType: 'tool_completed' } } as any, 'success')).toEqual('');
        expect(resolveTimelineEventActionLabel({ id: 'x', role: 'assistant', content: 'c', createdAt: 1, metadata: { uiKind: 'event', uiEventType: 'tool_call' } } as any, 'failed')).toEqual('retry');
        expect(resolveTimelineEventActionLabel({ id: 'x', role: 'assistant', content: 'c', createdAt: 1, metadata: { uiKind: 'event', uiEventType: 'plan_step_failed' } } as any, 'error')).toEqual('重试');
        expect(resolveTimelineEventActionLabel({ id: 'x', role: 'assistant', content: 'c', createdAt: 1, metadata: { uiKind: 'event', uiEventType: 'plan_step_blocked', status: 'blocked' } } as any, undefined)).toEqual('重试');
        expect(resolveTimelineEventActionLabel({ id: 'x', role: 'assistant', content: 'c', createdAt: 1, metadata: { uiKind: 'event', uiEventType: 'approval_request' } } as any, 'success')).toEqual('审批');
        expect(resolveTimelineEventActionLabel({ id: 'x', role: 'assistant', content: 'c', createdAt: 1, metadata: { uiKind: 'event', uiEventType: 'approval' } } as any, 'success')).toEqual('审批');
    }

    @Test('truncateTimelineEventRowContent bounds rows except failed/error')
    truncationRules() {
        const short = 'short content';
        expect(truncateTimelineEventRowContent(short, 'success')).toEqual(short);
        const long = 'y'.repeat(TIMELINE_EVENT_ROW_CONTENT_MAX + 50);
        const sliced = truncateTimelineEventRowContent(long, 'success');
        expect(sliced.endsWith('…')).toEqual(true);
        expect(sliced.length).toBeLessThanOrEqual(TIMELINE_EVENT_ROW_CONTENT_MAX + 1);
        expect(truncateTimelineEventRowContent(long, 'failed')).toEqual(long);
        expect(truncateTimelineEventRowContent(long, 'error')).toEqual(long);
        expect(truncateTimelineEventRowContent('', 'success')).toEqual('');
    }

    @Test('inspector opens for failure, blocked-step and approval timeline events')
    inspectorAcceptsFailedBlockedApproval() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 's1' });

        const failed = upsertEvent(state, 'evt-fail', 'tool_failed', 'error');
        state.openTimelineEventInspector(failed);
        expect(state.timelineEventInspectorOpen).toEqual(true);
        expect(state.selectedTimelineEventId).toEqual(failed?.id);

        state.closeTimelineEventInspector();
        const blocked = upsertEvent(state, 'evt-blocked', 'plan_step_blocked', undefined, 'Step blocked');
        state.openTimelineEventInspector(blocked);
        expect(state.timelineEventInspectorOpen).toEqual(true);
        expect(state.selectedTimelineEventId).toEqual(blocked?.id);

        state.closeTimelineEventInspector();
        const approval = upsertEvent(state, 'evt-approval', 'approval_request', undefined, 'Approval required');
        state.openTimelineEventInspector(approval);
        expect(state.timelineEventInspectorOpen).toEqual(true);
        expect(state.selectedTimelineEventId).toEqual(approval?.id);

        state.closeTimelineEventInspector();
        const plain = upsertEvent(state, 'evt-state', 'state', undefined, 'state change');
        state.openTimelineEventInspector(plain);
        expect(state.timelineEventInspectorOpen).toEqual(false);
        expect(state.selectedTimelineEventId).toEqual('');
    }
}