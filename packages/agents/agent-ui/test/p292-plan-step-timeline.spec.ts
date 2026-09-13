import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    resolveTimelineWindowLedger,
    TimelineWindowMessage
} from '../src/AgentConsoleTimelineWindow';
import {
    renderAgentConsoleMessageItems,
    truncateTimelineEventRowContent,
    TIMELINE_EVENT_ROW_CONTENT_MAX
} from '../src';

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

function eventMsg(id: string, uiEventKey: string, overrides: Record<string, any> = {}): TimelineWindowMessage {
    return msg(id, {
        metadata: {
            uiKind: 'event',
            uiEventType: 'tool_invoked',
            uiEventKey,
            status: 'success',
            durationMs: 100,
            ...overrides
        }
    });
}

// ── Tests ────────────────────────────────────────────────────────────────────

@Suite('P292 plan-step timeline linked display')
export class PlanStepTimelineTest {

    @Test('plan step events group by step key `plan:{planId}:{stepId}`; plan rows without stepId fall back to turn (P292)')
    stepGroupKeyDerivation() {
        const messages: TimelineWindowMessage[] = [
            eventMsg('p-created', 'turn-1:plan:p1', { uiEventType: 'plan_created', status: 'success' }),
            eventMsg('s1-start', 'turn-1:plan:p1:s1', { uiEventType: 'plan_step_started', status: 'running' }),
            eventMsg('s1-done', 'turn-1:plan:p1:s1', { uiEventType: 'plan_step_completed', status: 'success' }),
            eventMsg('s2-fail', 'turn-1:plan:p1:s2', { uiEventType: 'plan_step_failed', status: 'error' }),
            eventMsg('t-1', 'turn-1:tool:t-1', { status: 'success' }),
            eventMsg('r-1', 'read:r-1', { status: 'success' })
        ];
        const result = resolveTimelineWindowLedger({
            messages,
            limit: 10,
            mode: 'steps',
            activeScope: 'turn-1'
        });
        const byId = new Map(result.items.map(i => [i.message.id, i]));
        // step key beats turn grouping; same step events share one group key
        expect(byId.get('s1-start')!.groupKey).toBe('plan:p1:s1');
        expect(byId.get('s1-start')!.depth).toBe(1);
        expect(byId.get('s1-done')!.groupKey).toBe('plan:p1:s1');
        expect(byId.get('s2-fail')!.groupKey).toBe('plan:p1:s2');
        // plan_created/plan_completed carry only `plan:{planId}` → turn fallback
        expect(byId.get('p-created')!.groupKey).toBe('turn-1');
        expect(byId.get('p-created')!.depth).toBe(1);
        // tool rows keep their turn group, non-turn prefixes stay ungrouped
        expect(byId.get('t-1')!.groupKey).toBe('turn-1');
        expect(byId.get('r-1')!.groupKey).toBe('');
        expect(byId.get('r-1')!.depth).toBe(0);
    }

    @Test('real blocked step: bridge status is running but the event type wins → ⊘ 阻塞 + retry meta (P292)')
    realBlockedStepRendersBlocked() {
        const message = {
            id: 'b1', role: 'assistant', content: 'Step blocked: s1 (approval required)', createdAt: 1,
            metadata: {
                uiKind: 'event', uiEventType: 'plan_step_blocked', status: 'running', eventKey: 'b1'
            }
        };
        const items = renderAgentConsoleMessageItems([message] as any);
        // bridge pins status='running' → the old renderer showed ● 正在执行;
        // the event type is the authoritative state (P292).
        expect(items[0].status).toContain('⊘');
        expect(items[0].status).not.toContain('●');
        expect(items[0].lines[0].ariaLabel).toContain('阻塞');
        expect(items[0].lines[0].ariaLabel).not.toContain('正在执行');
        expect(items[0].lines[0].meta).toContain('重试');
        expect(items[0].lines[0].meta).not.toContain('阻塞');
    }

    @Test('long blocked/failed step rows stay fully expanded even when status is running (P292/P237)')
    blockedStepRowStaysExpanded() {
        const longContent = 'x'.repeat(TIMELINE_EVENT_ROW_CONTENT_MAX + 50);
        const blocked = {
            id: 'b2', role: 'assistant', content: longContent, createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'plan_step_blocked', status: 'running' }
        };
        const blockedItems = renderAgentConsoleMessageItems([blocked] as any);
        expect(blockedItems[0].lines[0].content).toEqual(longContent);
        expect(blockedItems[0].lines[0].meta).toContain('重试');
        // direct truncation contract: eventType alone (no statusKind) keeps the row
        expect(truncateTimelineEventRowContent(longContent, undefined, 'plan_step_blocked')).toEqual(longContent);
        expect(truncateTimelineEventRowContent(longContent, 'blocked')).toEqual(longContent);
        const failed = {
            id: 'f1', role: 'assistant', content: longContent, createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'plan_step_failed', status: 'running' }
        };
        const failedItems = renderAgentConsoleMessageItems([failed] as any);
        expect(failedItems[0].lines[0].content).toEqual(longContent);
        expect(failedItems[0].status).toContain('✕');
        expect(failedItems[0].lines[0].meta).toContain('重试');
    }

    @Test('active step renders running ● + in-progress word as its group-header state (P292)')
    activeStepGroupHeader() {
        const items = renderAgentConsoleMessageItems([{
            id: 'a1', role: 'assistant', content: 'Checking repo', createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'plan_step_started', status: 'running' }
        }] as any);
        expect(items[0].status).toContain('●');
        expect(items[0].lines[0].ariaLabel).toContain('正在执行');
    }

    @Test('step groups are not folded when their turn is collapsed (P292)')
    stepGroupSurvivesTurnCollapse() {
        const messages: TimelineWindowMessage[] = [
            eventMsg('s1', 'turn-1:plan:p1:s1', { uiEventType: 'plan_step_started', status: 'running' }),
            eventMsg('s2', 'turn-1:plan:p1:s2', { uiEventType: 'plan_step_completed', status: 'success' }),
            eventMsg('t-1', 'turn-1:tool:t-1', { status: 'success' })
        ];
        const result = resolveTimelineWindowLedger({
            messages,
            limit: 10,
            mode: 'steps',
            activeScope: 'turn-2',
            collapsedTurns: { 'turn-1': true }
        });
        const ids = result.items.map(i => i.message.id);
        expect(ids).toContain('__timeline_collapsed_turn-1__');
        expect(ids).not.toContain('t-1');
        // step groups keep their own keys → never folded by the turn collapse
        expect(ids).toContain('s1');
        expect(ids).toContain('s2');
    }

    @Test('plan_step_completed success renders ✓ 成功 and truncates long content (P292)')
    completedStepRendersSuccess() {
        const longContent = 'y'.repeat(TIMELINE_EVENT_ROW_CONTENT_MAX + 50);
        const items = renderAgentConsoleMessageItems([{
            id: 'c1', role: 'assistant', content: longContent, createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'plan_step_completed', status: 'success', durationMs: 40 }
        }] as any);
        expect(items[0].status).toContain('✓');
        expect(items[0].lines[0].ariaLabel).toContain('成功');
        // success step rows follow the normal truncation bound
        expect(items[0].lines[0].content.endsWith('…')).toEqual(true);
        expect(items[0].lines[0].content.length).toBeLessThanOrEqual(TIMELINE_EVENT_ROW_CONTENT_MAX + 1);
    }
}