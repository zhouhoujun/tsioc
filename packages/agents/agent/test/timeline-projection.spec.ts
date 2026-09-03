import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    applyTimelineEvent, decodeTimelineCursor, encodeTimelineCursor,
    reduceTimelineEvents, sortTimelineEntries, TimelineEventRecord,
    TimelineHistoryStore, TimelineNoncePage, TimelinePageOptions, pageTimelineEntries
} from '../src/memory/timeline-projection';

class TestInMemoryTimelineHistoryStore extends TimelineHistoryStore {
    private events: TimelineEventRecord[] = [];

    async append(event: Omit<TimelineEventRecord, 'seq'>): Promise<TimelineEventRecord> {
        const sessionEvents = this.events.filter(e => e.sessionId === event.sessionId);
        const seq = sessionEvents.length;
        const record = { ...event, seq };
        this.events.push(record);
        return record;
    }

    async get(sessionId: string): Promise<TimelineEventRecord[]> {
        return this.events.filter(e => e.sessionId === sessionId).sort((a, b) => a.seq - b.seq);
    }

    async replay(sessionId: string, sinceSeq?: number): Promise<TimelineEventRecord[]> {
        return (await this.get(sessionId)).filter(e => e.seq > (sinceSeq ?? -1));
    }

    async query(sessionId: string, options?: TimelinePageOptions): Promise<TimelineNoncePage> {
        const raw = await this.get(sessionId);
        return pageTimelineEntries(sortTimelineEntries(reduceTimelineEvents(raw).values()), options);
    }
}

function toolEvent(over: Partial<TimelineEventRecord>): Omit<TimelineEventRecord, 'seq'> {
    return {
        id: 'evt-1',
        type: 'tool_invoked',
        sessionId: 's1',
        timestamp: 100,
        toolName: 'bash',
        toolCallId: 'tc1',
        receiptId: 'rc1',
        ...over
    };
}

@Suite('Timeline projection')
export class TimelineProjectionTest {
    @Test('aggregates multiple raw events for one toolCall into a single row')
    aggregatesToolCall() {
        const map = reduceTimelineEvents([
            { seq: 0, id: 'a', type: 'tool_invoked', sessionId: 's1', timestamp: 100, toolName: 'bash', toolCallId: 'tc1', receiptId: 'rc1' },
            { seq: 1, id: 'b', type: 'tool_completed', sessionId: 's1', timestamp: 200, toolName: 'bash', toolCallId: 'tc1', receiptId: 'rc1', status: 'success', durationMs: 100 }
        ] as TimelineEventRecord[]);
        const entries = sortTimelineEntries(map.values());
        expect(entries.length).toEqual(1);
        expect(entries[0].kind).toEqual('tool');
        expect(entries[0].key).toEqual('tool:tc1');
        expect(entries[0].status).toEqual('success');
        expect(entries[0].lastSeq).toEqual(1);
        expect(entries[0].durationMs).toEqual(100);
    }

    @Test('merged stale events are rejected by lastSeq')
    rejectsStaleEvents() {
        let key: string | null = null;
        const map = new Map();
        key = applyTimelineEvent(map, toolEvent({ id: 'a', seq: 3 }) as any);
        expect(key).toEqual('tool:tc1');
        const applied = applyTimelineEvent(map, toolEvent({ id: 'b', seq: 1, type: 'tool_failed', detail: 'late failure' }) as any);
        const entry = map.get('tool:tc1');
        expect(applied).toEqual('tool:tc1');
        expect(entry.status).toEqual('running');
        expect(entry.error).toBeUndefined();
        expect(entry.lastSeq).toEqual(3);
    }

    @Test('plan steps aggregate under plan:step keys and plans under plan keys')
    aggregatesPlanSteps() {
        const events: TimelineEventRecord[] = [
            { seq: 0, id: 'p1', type: 'plan_created', sessionId: 's1', timestamp: 100, planId: 'plan1', sequence: 0 },
            { seq: 1, id: 's1', type: 'step_started', sessionId: 's1', timestamp: 110, planId: 'plan1', stepId: 'stepA', sequence: 1 },
            { seq: 2, id: 's2', type: 'step_completed', sessionId: 's1', timestamp: 120, planId: 'plan1', stepId: 'stepA', sequence: 2, status: 'completed' },
            { seq: 3, id: 's3', type: 'step_blocked', sessionId: 's1', timestamp: 130, planId: 'plan1', stepId: 'stepB', sequence: 3 }
        ];
        const entries = sortTimelineEntries(reduceTimelineEvents(events).values());
        expect(entries.length).toEqual(3);
        const plan = entries.find(entry => entry.key === 'plan:plan1');
        const stepA = entries.find(entry => entry.key === 'plan:plan1:step:stepA');
        const stepB = entries.find(entry => entry.key === 'plan:plan1:step:stepB');
        expect(plan?.status).toEqual('pending');
        expect(stepA?.status).toEqual('completed');
        expect(stepB?.status).toEqual('blocked');
    }

    @Test('starting from a late seq produces a non-stale in-order projection')
    lateStartIsNotStale() {
        const events: TimelineEventRecord[] = [
            { seq: 0, id: 'a', type: 'tool_invoked', sessionId: 's1', timestamp: 100, toolName: 'bash', toolCallId: 'tc1', receiptId: 'rc1' },
            { seq: 1, id: 'b', type: 'tool_completed', sessionId: 's1', timestamp: 200, toolName: 'bash', toolCallId: 'tc1', receiptId: 'rc1', status: 'success' }
        ];
        const entries = sortTimelineEntries(reduceTimelineEvents(events).values());
        expect(entries[0].status).toEqual('success');
        expect(entries[0].lastSeq).toEqual(1);
    }

    @Test('cursor encode/decode round-trips seq and id')
    cursorRoundTrip() {
        const cursor = encodeTimelineCursor({ seq: 42, id: 'tool:tc1' });
        expect(typeof cursor).toEqual('string');
        const decoded = decodeTimelineCursor(cursor);
        expect(decoded).toEqual({ seq: 42, id: 'tool:tc1' });
        expect(decodeTimelineCursor('')).toBeUndefined();
        expect(decodeTimelineCursor('not-a-cursor')).toBeUndefined();
    }

    @Test('store pages entries by cursor and reports hasMore')
    async pagesByCursor() {
        const store = new TestInMemoryTimelineHistoryStore();
        for (let i = 0; i < 5; i++) {
            await store.append(toolEvent({ id: `t${i}`, toolCallId: `tc${i}`, receiptId: `rc${i}` }) as any);
        }
        const first = await store.query('s1', { limit: 2 });
        expect(first.entries.length).toEqual(2);
        expect(first.hasMore).toEqual(true);
        expect(first.nextCursor).toBeDefined();
        const second = await store.query('s1', { limit: 2, cursor: first.nextCursor });
        expect(second.entries.length).toEqual(2);
        expect(second.hasMore).toEqual(true);
        const third = await store.query('s1', { limit: 2, cursor: second.nextCursor });
        expect(third.entries.length).toEqual(1);
        expect(third.hasMore).toEqual(false);
        expect(third.nextCursor).toBeUndefined();
    }

    @Test('replay returns only events after sinceSeq and is idempotent')
    async replayIdempotent() {
        const store = new TestInMemoryTimelineHistoryStore();
        const evts = [];
        for (let i = 0; i < 4; i++) {
            evts.push(await store.append(toolEvent({ id: `t${i}`, toolCallId: `tc${i}`, receiptId: `rc${i}` }) as any));
        }
        const replay1 = await store.replay('s1', 1);
        expect(replay1.map(event => event.seq)).toEqual([2, 3]);
        const replay2 = await store.replay('s1', 1);
        expect(replay2).toEqual(replay1);
        expect(await store.replay('s1', 99)).toEqual([]);
        expect(await store.replay('missing')).toEqual([]);
    }

    @Test('append assigns monotonic ascending seq per session')
    async monotonicSeq() {
        const store = new TestInMemoryTimelineHistoryStore();
        const one = await store.append(toolEvent({ id: 'a' }) as any);
        const two = await store.append(toolEvent({ id: 'b' }) as any);
        const other = await store.append(toolEvent({ id: 'c', sessionId: 's2' }) as any);
        expect(one.seq).toEqual(0);
        expect(two.seq).toEqual(1);
        expect(other.seq).toEqual(0);
        expect((await store.get('s1')).length).toEqual(2);
        expect(await store.replay('s1', 0)).toEqual([two]);
    }
}
