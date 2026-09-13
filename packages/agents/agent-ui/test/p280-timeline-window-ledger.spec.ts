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
    TimelineItemCategory,
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
        expect(result.items[0].estimatedRows).toBe(1);
        expect(result.items[0].message.content).toContain('已隐藏');
        expect(result.items[0].message.content).not.toContain('/timeline');
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
        expect(result.items[0].estimatedRows).toBe(1);
        expect(result.items[0].message.content).toContain('已隐藏 30 条事件');
        expect(result.items[0].message.content).not.toContain('/timeline');
    }

    @Test('summary line falls back to EN labels when provided')
    testSummaryEnFallback() {
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
            activeScope: scope,
            summaryLabels: EN_TIMELINE_LABELS
        });
        expect(result.items[0].category).toBe('summary');
        expect(result.items[0].estimatedRows).toBe(1);
        expect(result.items[0].message.content).toContain('30 events hidden');
        expect(result.items[0].message.content).not.toContain('press /timeline');
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

    @Test('session header/footer pin the bounds in every mode')
    testHeaderFooterPinned() {
        const header = msg('__hdr__', { content: '会话标题 · 14:30' });
        const footer = msg('__ftr__', { content: '完成 · 耗时 1m 2s' });
        const modes = ['verbose', 'steps', 'compact'] as const;
        modes.forEach(mode => {
            const result = resolveTimelineWindowLedger({
                messages: makeMessages(30, 'turn-0'),
                limit: 5,
                mode,
                activeScope: 'turn-1',
                header,
                footer
            });
            const head = result.items[0];
            const foot = result.items[result.items.length - 1];
            expect(head.message.id).toBe('__hdr__');
            expect(foot.message.id).toBe('__ftr__');
            expect(head.category).toBe('structural');
            expect(foot.category).toBe('structural');
            expect(head.priority).toBe(TIMELINE_PRIORITY_STRUCTURAL);
            expect(foot.priority).toBe(TIMELINE_PRIORITY_STRUCTURAL);
            expect(head.estimatedRows).toBe(1);
            expect(foot.estimatedRows).toBe(1);
            expect(result.items.length).toBeGreaterThan(2);
        });
    }

    @Test('session header/footer do not inflate hiddenCount')
    testHeaderFooterHiddenCount() {
        const options = {
            messages: makeMessages(30, 'turn-0'),
            limit: 5,
            mode: 'steps' as const,
            activeScope: 'turn-1'
        };
        const baseline = resolveTimelineWindowLedger(options);
        const withBounds = resolveTimelineWindowLedger({
            ...options,
            header: msg('__hdr__', { content: 'h' }),
            footer: msg('__ftr__', { content: 'f' })
        });
        expect(withBounds.hiddenCount).toBe(baseline.hiddenCount);
    }

    @Test('header/footer apply when messages fit under the limit')
    testHeaderFooterUnderLimit() {
        const result = resolveTimelineWindowLedger({
            messages: makeMessages(3, 'turn-0'),
            limit: 10,
            mode: 'steps',
            activeScope: '',
            header: msg('__hdr__', { content: 'h' }),
            footer: msg('__ftr__', { content: 'f' })
        });
        expect(result.items[0].message.id).toBe('__hdr__');
        expect(result.items[result.items.length - 1].message.id).toBe('__ftr__');
        expect(result.hiddenCount).toBe(0);
    }

    @Test('empty messages still show header and footer bounds')
    testHeaderFooterEmpty() {
        const result = resolveTimelineWindowLedger({
            messages: [],
            limit: 10,
            mode: 'steps',
            activeScope: '',
            header: msg('__hdr__', { content: 'h' }),
            footer: msg('__ftr__', { content: 'f' })
        });
        expect(result.items.length).toBe(2);
        expect(result.items[0].message.id).toBe('__hdr__');
        expect(result.items[1].message.id).toBe('__ftr__');
    }

    @Test('turn-scoped events derive groupKey/depth, non-turn prefixes do not (P290)')
    testGroupKeyDerivation() {
        const messages: TimelineWindowMessage[] = [
            eventMsg('t-1', 'turn-1'),
            eventMsg('t-2', 'turn-1', { uiEventKey: 'turn-1:tool:t-2' }),
            eventMsg('x-1', 'read'), // event-type prefix, not a group key
            structuralMsg('s-1'),
            msg('u-1', { role: 'user' })
        ];
        const result = resolveTimelineWindowLedger({
            messages,
            limit: 10,
            mode: 'steps',
            activeScope: 'turn-1'
        });
        const byId = new Map(result.items.map(i => [i.message.id, i]));
        expect(byId.get('t-1')!.groupKey).toBe('turn-1');
        expect(byId.get('t-1')!.depth).toBe(1);
        expect(byId.get('t-2')!.groupKey).toBe('turn-1');
        expect(byId.get('x-1')!.groupKey).toBe('');
        expect(byId.get('x-1')!.depth).toBe(0);
        expect(byId.get('s-1')!.groupKey).toBe('');
        expect(byId.get('u-1')!.groupKey).toBe('');
    }

    @Test('collapsedTurns replaces a completed turn group with one collapsed row (P290)')
    testCollapseCompletedTurn() {
        const messages: TimelineWindowMessage[] = [
            ...makeMessages(3, 'turn-1'),
            eventMsg('a-0', 'turn-2'),
            eventMsg('a-1', 'turn-2')
        ];
        const result = resolveTimelineWindowLedger({
            messages,
            limit: 10,
            mode: 'steps',
            activeScope: 'turn-2',
            collapsedTurns: { 'turn-1': true }
        });
        const ids = result.items.map(i => i.message.id);
        expect(ids).not.toContain('m-0');
        expect(ids).not.toContain('m-1');
        expect(ids).not.toContain('m-2');
        expect(ids).toContain('__timeline_collapsed_turn-1__');
        const folded = result.items.find(i => i.message.id === '__timeline_collapsed_turn-1__')!;
        expect(folded.category).toBe('structural');
        expect(folded.priority).toBe(TIMELINE_PRIORITY_STRUCTURAL);
        expect(folded.estimatedRows).toBe(1);
        expect(folded.groupKey).toBe('turn-1');
        expect(folded.message.metadata?.uiKind).toBe('timeline-collapsed');
        expect(folded.message.content).toContain('第 1 轮');
        // active-scope turn stays fully expanded
        expect(ids).toContain('a-0');
        expect(ids).toContain('a-1');
    }

    @Test('collapsed row counts unique tool calls and total duration (P290)')
    testCollapsedRowStats() {
        const messages: TimelineWindowMessage[] = [
            eventMsg('c-1', 'turn-1', {
                uiEventKey: 'turn-1:tool:c-1',
                timeline: { source: 'local', sequence: 1, toolCallId: 'tcA', receiptId: 'r1', attempt: 1 },
                durationMs: 250
            }),
            eventMsg('c-2', 'turn-1', {
                uiEventKey: 'turn-1:tool:c-2',
                timeline: { source: 'local', sequence: 2, toolCallId: 'tcA', receiptId: 'r2', attempt: 2 },
                durationMs: 250
            }),
            eventMsg('c-3', 'turn-1', {
                uiEventKey: 'turn-1:tool:c-3',
                timeline: { source: 'local', sequence: 3, toolCallId: 'tcB', receiptId: 'r3', attempt: 1 },
                durationMs: 500
            })
        ];
        const result = resolveTimelineWindowLedger({
            messages,
            limit: 10,
            mode: 'steps',
            activeScope: 'turn-2',
            collapsedTurns: { 'turn-1': true }
        });
        const folded = result.items.find(i => i.message.id === '__timeline_collapsed_turn-1__')!;
        expect(folded.message.content).toContain('2 个工具'); // tcA deduped + tcB
        expect(folded.message.content).toContain('1.0s'); // 250+250+500 = 1000ms
    }

    @Test('a turn containing an error event stays expanded (P290)')
    testErrorGroupNeverFolded() {
        const messages: TimelineWindowMessage[] = [
            eventMsg('ok-1', 'turn-1'),
            errorMsg('bad-1', 'turn-1'),
            eventMsg('ok-2', 'turn-2')
        ];
        const result = resolveTimelineWindowLedger({
            messages,
            limit: 10,
            mode: 'steps',
            activeScope: 'turn-2',
            collapsedTurns: { 'turn-1': true }
        });
        const ids = result.items.map(i => i.message.id);
        expect(ids).toContain('ok-1');
        expect(ids).toContain('bad-1');
        expect(ids).not.toContain('__timeline_collapsed_turn-1__');
    }

    @Test('the active scope turn is never folded (P290)')
    testActiveScopeNeverFolded() {
        const messages: TimelineWindowMessage[] = [
            eventMsg('a-1', 'turn-1'),
            eventMsg('a-2', 'turn-1')
        ];
        const result = resolveTimelineWindowLedger({
            messages,
            limit: 10,
            mode: 'steps',
            activeScope: 'turn-1',
            collapsedTurns: { 'turn-1': true }
        });
        const ids = result.items.map(i => i.message.id);
        expect(ids).toContain('a-1');
        expect(ids).toContain('a-2');
        expect(ids).not.toContain('__timeline_collapsed_turn-1__');
    }

    @Test('clearing collapsedTurns restores the full turn group (P290)')
    testCollapseToggleRoundTrip() {
        const messages = makeMessages(4, 'turn-1');
        const baseOptions = { messages, limit: 10, mode: 'steps' as const, activeScope: 'turn-2' };
        const folded = resolveTimelineWindowLedger({ ...baseOptions, collapsedTurns: { 'turn-1': true } });
        expect(folded.items.some(i => i.message.id === '__timeline_collapsed_turn-1__')).toBe(true);
        const restored = resolveTimelineWindowLedger({ ...baseOptions, collapsedTurns: {} });
        expect(restored.items.some(i => i.message.id === '__timeline_collapsed_turn-1__')).toBe(false);
        expect(restored.items.map(i => i.message.id!).filter(id => id.startsWith('m-')))
            .toEqual(['m-0', 'm-1', 'm-2', 'm-3']);
        expect(restored.hiddenCount).toBe(0);
    }

    @Test('collapse does not change hiddenCount (P290)')
    testCollapseHiddenCountStable() {
        const messages: TimelineWindowMessage[] = [
            ...makeMessages(20, 'turn-1'),
            eventMsg('s-0', 'turn-2'),
            eventMsg('s-1', 'turn-2'),
            eventMsg('s-2', 'turn-2'),
            eventMsg('s-3', 'turn-2'),
            eventMsg('s-4', 'turn-2')
        ];
        const base = { messages, limit: 8, mode: 'steps' as const, activeScope: 'turn-2' };
        const baseline = resolveTimelineWindowLedger(base);
        const folded = resolveTimelineWindowLedger({ ...base, collapsedTurns: { 'turn-1': true } });
        expect(folded.hiddenCount).toBe(baseline.hiddenCount);
    }
}
