import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    CommandExchangeRecord,
    pageCommandExchangeRecords,
    encodeCommandExchangeCursor,
    decodeCommandExchangeCursor,
    compareCommandExchangeAsc,
    InMemoryCommandExecutionControl
} from '@tsdi/agent';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';

function makeRecord(seq: number, overrides: Partial<CommandExchangeRecord> = {}): CommandExchangeRecord {
    return {
        seq,
        id: `rec-${seq}`,
        sessionId: 'session-A',
        sessionEpoch: 1,
        kind: 'command',
        key: `cmd-${seq}`,
        content: `command ${seq}`,
        sequence: seq,
        attempt: 1,
        status: 'success',
        timestamp: 1000 + seq,
        ...overrides
    };
}

function createState(): AgentConsoleSessionState {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    // Bumps commandExchangeSessionEpoch 0 -> 1, matching makeRecord's sessionEpoch.
    state.configure({ sessionId: 'session-A' } as any);
    return state;
}

@Suite('P284 command exchange paging')
export class P284CommandExchangePagingTest {

    @Test('no options returns all records ascending with hasMore false')
    noOptionsReturnsAll() {
        const records = [makeRecord(1), makeRecord(2), makeRecord(3)];
        const page = pageCommandExchangeRecords(records);
        expect(page.records.length).toEqual(3);
        expect(page.hasMore).toEqual(false);
        expect(page.nextCursor).toBeUndefined();
    }

    @Test('sinceSeq 2 returns only records with seq >= 3')
    sinceSeqFilters() {
        const records = [makeRecord(1), makeRecord(2), makeRecord(3), makeRecord(4)];
        const page = pageCommandExchangeRecords(records, { sinceSeq: 2 });
        expect(page.records.map(r => r.seq)).toEqual([3, 4]);
        expect(page.hasMore).toEqual(false);
    }

    @Test('cursor pages through records and last page has no nextCursor')
    cursorPaging() {
        const records = [makeRecord(1), makeRecord(2), makeRecord(3), makeRecord(4), makeRecord(5)];
        const page1 = pageCommandExchangeRecords(records, { limit: 2 });
        expect(page1.records.map(r => r.seq)).toEqual([1, 2]);
        expect(page1.hasMore).toEqual(true);
        expect(page1.nextCursor).toBeDefined();

        const page2 = pageCommandExchangeRecords(records, { limit: 2, cursor: page1.nextCursor });
        expect(page2.records.map(r => r.seq)).toEqual([3, 4]);
        expect(page2.hasMore).toEqual(true);
        expect(page2.nextCursor).toBeDefined();

        const page3 = pageCommandExchangeRecords(records, { limit: 2, cursor: page2.nextCursor });
        expect(page3.records.map(r => r.seq)).toEqual([5]);
        expect(page3.hasMore).toEqual(false);
        expect(page3.nextCursor).toBeUndefined();
    }

    @Test('unknown cursor anchor falls back to the first record')
    unknownCursorFallsBackToFirst() {
        const records = [makeRecord(1), makeRecord(2), makeRecord(3)];
        const page = pageCommandExchangeRecords(records, { limit: 2, cursor: '9_missing' });
        expect(page.records.map(r => r.seq)).toEqual([1, 2]);
        expect(page.hasMore).toEqual(true);
    }

    @Test('zero limit falls back to default page size')
    zeroLimitFallsBackToDefault() {
        const records = [makeRecord(1), makeRecord(2), makeRecord(3)];
        const page = pageCommandExchangeRecords(records, { limit: 0 });
        expect(page.records.length).toEqual(3);
        expect(page.hasMore).toEqual(false);
    }

    @Test('cursor with sinceSeq combines both filters')
    cursorAndSinceSeqCombine() {
        const records = [makeRecord(1), makeRecord(2), makeRecord(3), makeRecord(4), makeRecord(5)];
        const page1 = pageCommandExchangeRecords(records, { sinceSeq: 2, limit: 2 });
        expect(page1.records.map(r => r.seq)).toEqual([3, 4]);
        const page2 = pageCommandExchangeRecords(records, { sinceSeq: 2, limit: 2, cursor: page1.nextCursor });
        expect(page2.records.map(r => r.seq)).toEqual([5]);
        expect(page2.hasMore).toEqual(false);
    }

    @Test('encode/decode cursor round-trips seq and id')
    cursorRoundTrip() {
        const cursor = encodeCommandExchangeCursor({ seq: 42, id: 'rec-42' });
        expect(decodeCommandExchangeCursor(cursor)).toEqual({ seq: 42, id: 'rec-42' });
    }

    @Test('malformed cursors decode to undefined')
    malformedCursorDecodesUndefined() {
        expect(decodeCommandExchangeCursor()).toBeUndefined();
        expect(decodeCommandExchangeCursor('')).toBeUndefined();
        expect(decodeCommandExchangeCursor('no-separator')).toBeUndefined();
        expect(decodeCommandExchangeCursor('abc_')).toBeUndefined();
    }

    @Test('compareCommandExchangeAsc orders by seq then id')
    compareOrdersBySeqThenId() {
        const leftIdA = makeRecord(5, { id: 'a' });
        const leftIdB = makeRecord(5, { id: 'b' });
        expect(compareCommandExchangeAsc(makeRecord(1), makeRecord(2))).toBeLessThan(0);
        expect(compareCommandExchangeAsc(makeRecord(2), makeRecord(1))).toBeGreaterThan(0);
        expect(compareCommandExchangeAsc(leftIdA, leftIdB)).toBeLessThan(0);
        expect(compareCommandExchangeAsc(leftIdB, leftIdA)).toBeGreaterThan(0);
        expect(compareCommandExchangeAsc(leftIdA, { ...leftIdA })).toEqual(0);
    }
}

@Suite('P284 UI durable replay')
export class P284UiDurableReplayTest {

    @Test('matching-epoch command records project into commandExecutionMessages')
    matchingEpochCommandsProject() {
        const state = createState();
        state.seedCommandExchange([
            makeRecord(1, { kind: 'command', key: 'cmd-1', content: '/usage', sequence: 7, attempt: 2, status: 'success' }),
            makeRecord(2, { kind: 'command', key: 'cmd-2', content: '/status', sequence: 8, attempt: 1, status: 'error' })
        ]);
        const executions = state.displayMessages.filter(m => m.metadata?.uiKind === 'command-execution');
        expect(executions.length).toEqual(2);
        const first = executions[0];
        expect(first.metadata?.uiEventKey).toEqual('cmd-1');
        expect(first.metadata?.requestId).toEqual('cmd-1');
        expect(first.metadata?.sequence).toEqual(7);
        expect(first.metadata?.attempt).toEqual(2);
        expect(first.metadata?.status).toEqual('succeeded');
        const second = executions[1];
        expect(second.metadata?.uiEventKey).toEqual('cmd-2');
        expect(second.metadata?.status).toEqual('error');
    }

    @Test('stale-epoch records are rejected and not projected')
    staleEpochRejected() {
        const state = createState();
        state.seedCommandExchange([
            makeRecord(1, { sessionEpoch: 0, kind: 'command', key: 'stale-1' }),
            makeRecord(2, { sessionEpoch: 1, kind: 'command', key: 'current-2' })
        ]);
        const executions = state.displayMessages.filter(m => m.metadata?.uiKind === 'command-execution');
        expect(executions.length).toEqual(1);
        expect(executions[0].metadata?.uiEventKey).toEqual('current-2');
    }

    @Test('unprojectable kinds do not count toward seed count')
    unprojectableKindsSkipped() {
        const state = createState();
        state.seedCommandExchange([
            makeRecord(1, { kind: 'output', key: 'out-1', content: 'stdout line' }),
            makeRecord(2, { kind: 'command', key: 'cmd-2', content: '/status' })
        ]);
        const executions = state.displayMessages.filter(m => m.metadata?.uiKind === 'command-execution');
        expect(executions.length).toEqual(1);
        expect(executions[0].metadata?.uiEventKey).toEqual('cmd-2');
    }

    @Test('mixed command and tool records in one seed both survive')
    mixedSeedKeepsCommandsAndTools() {
        const state = createState();
        state.seedCommandExchange([
            makeRecord(1, { kind: 'command', key: 'cmd-1', content: '/usage' }),
            makeRecord(2, { kind: 'tool', key: 'tool:tc-1', content: 'tool finished', toolCallId: 'tc-1', durationMs: 12 }),
            makeRecord(3, { kind: 'command', key: 'cmd-2', content: '/status' })
        ]);
        const executions = state.displayMessages.filter(m => m.metadata?.uiKind === 'command-execution');
        expect(executions.map(m => m.metadata?.uiEventKey)).toEqual(['cmd-1', 'cmd-2']);
        const toolEvent = state.messages.find(m => m.metadata?.uiKind === 'event' && m.metadata?.uiEventKey === 'tool:tc-1');
        expect(toolEvent).toBeDefined();
        expect(toolEvent?.metadata?.durationMs).toEqual(12);
        expect(toolEvent?.metadata?.timeline?.toolCallId).toEqual('tc-1');
        expect(toolEvent?.metadata?.timeline?.source).toEqual('local');
    }

    @Test('seeding the same records twice is idempotent')
    replayIsIdempotent() {
        const state = createState();
        const records = [
            makeRecord(1, { kind: 'command', key: 'cmd-1', content: '/usage' }),
            makeRecord(2, { kind: 'tool', key: 'tool:tc-1', content: 'tool finished', toolCallId: 'tc-1' })
        ];
        state.seedCommandExchange(records);
        state.seedCommandExchange(records);
        const executions = state.displayMessages.filter(m => m.metadata?.uiKind === 'command-execution');
        expect(executions.length).toEqual(1);
        const toolEvents = state.messages.filter(m => m.metadata?.uiKind === 'event' && m.metadata?.uiEventKey === 'tool:tc-1');
        expect(toolEvents.length).toEqual(1);
    }

    @Test('out-of-order page is sorted ascending for stable sequential projection')
    outOfOrderSorted() {
        const state = createState();
        state.seedCommandExchange([
            makeRecord(3, { kind: 'command', key: 'cmd-3', content: '/c', sequence: 3 }),
            makeRecord(1, { kind: 'command', key: 'cmd-1', content: '/a', sequence: 1 }),
            makeRecord(2, { kind: 'command', key: 'cmd-2', content: '/b', sequence: 2 })
        ]);
        const executions = state.displayMessages.filter(m => m.metadata?.uiKind === 'command-execution');
        expect(executions.map(m => m.metadata?.uiEventKey)).toEqual(['cmd-1', 'cmd-2', 'cmd-3']);
        expect(executions.map(m => m.metadata?.sequence)).toEqual([1, 2, 3]);
    }

    @Test('seed count and tail seq reflect accepted records only')
    seedCountAndTailSeq() {
        const state = createState();
        state.seedCommandExchange([
            makeRecord(1, { sessionEpoch: 0, kind: 'command', key: 'stale-1' }),
            makeRecord(2, { kind: 'command', key: 'cmd-2', content: '/b' }),
            makeRecord(3, { kind: 'tool', key: 'tool:t-3', content: 'done', toolCallId: 't-3' })
        ]);
        expect(state.commandExchangeTailSeq).toEqual(3);
        expect(state.displayMessages.filter(m => m.metadata?.uiKind === 'command-execution').length).toEqual(1);
        expect(state.messages.filter(m => m.metadata?.uiKind === 'event' && m.metadata?.uiEventKey === 'tool:t-3').length).toEqual(1);
    }

    @Test('session switch resets tail seq and clears replayed projections')
    sessionSwitchResetsReplayState() {
        const state = createState();
        state.seedCommandExchange([
            makeRecord(1, { kind: 'command', key: 'cmd-1', content: '/a' }),
            makeRecord(2, { kind: 'command', key: 'cmd-2', content: '/b' })
        ]);
        expect(state.commandExchangeTailSeq).toEqual(2);
        expect(state.displayMessages.filter(m => m.metadata?.uiKind === 'command-execution').length).toEqual(2);

        state.configure({ sessionId: 'session-B' } as any);
        expect(state.commandExchangeTailSeq).toEqual(-1);
        expect(state.displayMessages.filter(m => m.metadata?.uiKind === 'command-execution').length).toEqual(0);

        state.seedCommandExchange([
            makeRecord(1, { sessionId: 'session-B', sessionEpoch: 2, kind: 'command', key: 'b-1', content: '/x' })
        ]);
        const executions = state.displayMessages.filter(m => m.metadata?.uiKind === 'command-execution');
        expect(executions.length).toEqual(1);
        expect(executions[0].metadata?.uiEventKey).toEqual('b-1');
    }
}