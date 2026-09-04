import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    resolveTimelineWindowLedger,
    TIMELINE_PRIORITY_ERROR,
    TIMELINE_PRIORITY_BOUNDARY,
    TIMELINE_PRIORITY_STRUCTURAL,
    TIMELINE_PRIORITY_CURRENT_SCOPE,
    TIMELINE_PRIORITY_TAIL,
    TimelineWindowMessage,
    TimelineItemCategory
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
            uiEventKey: `${scope}:read:${id}`,
            status: 'success',
            durationMs: 100,
            ...overrides
        }
    });
}

function structuralMsg(id: string, kind: 'plan-todo' | 'file-change' | 'timeline-boundary' = 'plan-todo'): TimelineWindowMessage {
    return msg(id, {
        content: 'step 1',
        metadata: { uiKind: kind }
    });
}

function errorMsg(id: string, scope = 'turn-1'): TimelineWindowMessage {
    return eventMsg(id, scope, { status: 'error', uiEventType: 'tool_failed' });
}

function makeMessages(count: number, scope = 'turn-1'): TimelineWindowMessage[] {
    return Array.from({ length: count }, (_, i) => eventMsg(`m-${i}`, scope));
}

// ── Tests ────────────────────────────────────────────────────────────────────

@Suite('timeline window ledger (P280)')
export class TimelineWindowLedgerTest {

    @Test('verbose mode returns all messages with per-item annotations')
    testVerbose() {
        const messages = makeMessages(100);
        const result = resolveTimelineWindowLedger({
            messages,
            limit: 10,
            mode: 'verbose',
            activeScope: ''
        });
        expect(result.items.length).toBe(100);
        expect(result.hiddenCount).toBe(0);
        result.items.forEach(item => {
            expect(item.priority).toBe(TIMELINE_PRIORITY_TAIL);
            expect(item.category).toBe('tail');
            expect(item.estimatedRows).toBeGreaterThanOrEqual(1);
        });
    }

    @Test('returns all messages when count <= limit')
    testUnderLimit() {
        const messages = makeMessages(5);
        const result = resolveTimelineWindowLedger({
            messages,
            limit: 10,
            mode: 'steps',
            activeScope: ''
        });
        expect(result.items.length).toBe(5);
        expect(result.hiddenCount).toBe(0);
    }

    @Test('steps mode returns tail + active scope + structural')
    testStepsMode() {
        const scope = 'turn-1';
        const messages: TimelineWindowMessage[] = [
            ...makeMessages(20, 'turn-0'),
            eventMsg('active-1', scope),
            eventMsg('active-2', scope),
            structuralMsg('struct-1'),
            structuralMsg('struct-2', 'file-change'),
        ];
        const result = resolveTimelineWindowLedger({
            messages,
            limit: 5,
            mode: 'steps',
            activeScope: scope
        });
        const ids = result.items.map(i => i.message.id);
        expect(ids).toContain('__timeline_hidden_summary__');
        expect(ids).toContain('active-1');
        expect(ids).toContain('active-2');
        expect(ids).toContain('struct-1');
        expect(ids).toContain('struct-2');
        expect(result.hiddenCount).toBeGreaterThan(0);
        expect(result.items[0].category).toBe('summary');
    }

    @Test('compact mode returns current scope + errors + structural')
    testCompactMode() {
        const scope = 'turn-1';
        const messages: TimelineWindowMessage[] = [
            ...makeMessages(30, 'turn-0'),
            eventMsg('active-1', scope),
            eventMsg('active-2', scope),
            errorMsg('err-1', scope),
            structuralMsg('struct-1'),
        ];
        const result = resolveTimelineWindowLedger({
            messages,
            limit: 5,
            mode: 'compact',
            activeScope: scope
        });
        const ids = result.items.map(i => i.message.id);
        expect(ids).toContain('__timeline_hidden_summary__');
        expect(ids).toContain('active-1');
        expect(ids).toContain('active-2');
        expect(ids).toContain('err-1');
        expect(ids).toContain('struct-1');
        expect(result.hiddenCount).toBe(30);
        expect(result.items[0].category).toBe('summary');
    }

    @Test('errors get highest priority')
    testErrorPriority() {
        const messages = [
            errorMsg('err-1'),
            eventMsg('ev-1'),
        ];
        const result = resolveTimelineWindowLedger({
            messages,
            limit: 10,
            mode: 'steps',
            activeScope: ''
        });
        const errItem = result.items.find(i => i.message.id === 'err-1');
        const evItem = result.items.find(i => i.message.id === 'ev-1');
        expect(errItem).toBeDefined();
        expect(evItem).toBeDefined();
        expect(errItem!.priority).toBe(TIMELINE_PRIORITY_ERROR);
        expect(errItem!.category).toBe('error');
        expect(evItem!.priority).toBe(TIMELINE_PRIORITY_TAIL);
    }

    @Test('structural items get structural priority')
    testStructuralPriority() {
        const messages = [
            structuralMsg('s1'),
            structuralMsg('s2', 'timeline-boundary'),
            structuralMsg('s3', 'file-change'),
            eventMsg('ev-1'),
        ];
        const result = resolveTimelineWindowLedger({
            messages,
            limit: 10,
            mode: 'steps',
            activeScope: ''
        });
        const s1 = result.items.find(i => i.message.id === 's1');
        const s2 = result.items.find(i => i.message.id === 's2');
        const s3 = result.items.find(i => i.message.id === 's3');
        expect(s1!.priority).toBe(TIMELINE_PRIORITY_STRUCTURAL);
        expect(s1!.category).toBe('structural');
        expect(s2!.priority).toBe(TIMELINE_PRIORITY_BOUNDARY);
        expect(s2!.category).toBe('boundary');
        expect(s3!.priority).toBe(TIMELINE_PRIORITY_STRUCTURAL);
        expect(s3!.category).toBe('structural');
    }

    @Test('active scope items get current-scope priority')
    testActiveScopePriority() {
        const scope = 'turn-1';
        const messages = [
            eventMsg('old-1', 'turn-0'),
            eventMsg('old-2', 'turn-0'),
            eventMsg('active-1', scope),
        ];
        const result = resolveTimelineWindowLedger({
            messages,
            limit: 2,
            mode: 'steps',
            activeScope: scope
        });
        const active = result.items.find(i => i.message.id === 'active-1');
        const old = result.items.find(i => i.message.id === 'old-2');
        expect(active!.priority).toBe(TIMELINE_PRIORITY_CURRENT_SCOPE);
        expect(active!.category).toBe('current-scope');
        expect(old!.priority).toBe(TIMELINE_PRIORITY_TAIL);
        expect(old!.category).toBe('tail');
    }

    @Test('estimatedRows reflects content length')
    testEstimatedRows() {
        const short = msg('short', { content: 'hi' });
        const long = msg('long', { content: 'x'.repeat(200) });
        const result = resolveTimelineWindowLedger({
            messages: [short, long],
            limit: 10,
            mode: 'steps',
            activeScope: ''
        });
        const shortItem = result.items.find(i => i.message.id === 'short')!;
        const longItem = result.items.find(i => i.message.id === 'long')!;
        expect(shortItem.estimatedRows).toBe(1);
        expect(longItem.estimatedRows).toBeGreaterThanOrEqual(2);
    }

    @Test('plan-todo structural items get 3 estimated rows')
    testPlanTodoRows() {
        const messages = [structuralMsg('s1', 'plan-todo')];
        const result = resolveTimelineWindowLedger({
            messages,
            limit: 10,
            mode: 'steps',
            activeScope: ''
        });
        expect(result.items[0].estimatedRows).toBe(3);
    }

    @Test('file-change structural items get 2 estimated rows')
    testFileChangeRows() {
        const messages = [structuralMsg('s1', 'file-change')];
        const result = resolveTimelineWindowLedger({
            messages,
            limit: 10,
            mode: 'steps',
            activeScope: ''
        });
        expect(result.items[0].estimatedRows).toBe(2);
    }

    @Test('steps mode: tail and active scope union is retained')
    testTailAndScopeUnion() {
        const scope = 'turn-1';
        const messages: TimelineWindowMessage[] = [
            ...makeMessages(5, scope),
            eventMsg('tail-1'), // no scope, but in tail
            eventMsg('tail-2'), // no scope, but in tail
        ];
        const result = resolveTimelineWindowLedger({
            messages,
            limit: 3,
            mode: 'steps',
            activeScope: scope
        });
        // tail(3) includes tail-1, tail-2, and one from scope
        // active scope (5) are all retained
        // So all 7 should be visible
        expect(result.hiddenCount).toBe(0);
        expect(result.items.length).toBe(7);
    }

    @Test('empty messages returns empty result')
    testEmpty() {
        const result = resolveTimelineWindowLedger({
            messages: [],
            limit: 10,
            mode: 'steps',
            activeScope: ''
        });
        expect(result.items.length).toBe(0);
        expect(result.hiddenCount).toBe(0);
    }

    @Test('no active scope in compact mode: only errors retained')
    testCompactNoScope() {
        const messages: TimelineWindowMessage[] = [
            errorMsg('err-1'),
            eventMsg('ev-1'),
            eventMsg('ev-2'),
        ];
        const result = resolveTimelineWindowLedger({
            messages,
            limit: 2, // force compact filtering (3 > 2)
            mode: 'compact',
            activeScope: ''
        });
        // Only err-1 retained (no active scope → empty current, but error retained)
        const ids = result.items.map(i => i.message.id);
        expect(ids).toContain('err-1');
        expect(ids).not.toContain('ev-1');
    }
}
