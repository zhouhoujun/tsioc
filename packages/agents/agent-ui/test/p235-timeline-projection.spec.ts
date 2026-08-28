import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import { TimelineEntry } from '@tsdi/agent';

function entry(over: Partial<TimelineEntry> & { key: string }): TimelineEntry {
    return {
        kind: 'tool',
        sessionId: 's1',
        label: 'bash',
        status: 'success',
        lastSeq: 1,
        ...over
    } as TimelineEntry;
}

@Suite('timeline projection seeding (P235)')
export class TimelineProjectionSeedTest {

    @Test('seedTimeline upserts ui-event messages keyed by stable timeline key')
    testSeeds() {
        const state = new AgentConsoleSessionState();
        state.configure({ sessionId: 's1' });
        const entryList: TimelineEntry[] = [
            entry({ key: 'tool:tc1', kind: 'tool', label: 'bash', status: 'running', lastSeq: 0, toolCallId: 'tc1' }),
            entry({ key: 'plan:p1', kind: 'plan', label: 'plan p1', status: 'pending', lastSeq: 1 }),
            entry({ key: 'plan:p1:step:st1', kind: 'step', label: 'st1', status: 'completed', lastSeq: 2 })
        ];
        state.seedTimeline(entryList);
        const uiEvents = state.messages.filter(message => message.metadata?.uiKind === 'event');
        expect(uiEvents.length).toEqual(3);
        expect(uiEvents.some(message => message.metadata?.uiEventKey === 'tool:tc1')).toBe(true);
        expect(uiEvents.some(message => message.metadata?.uiEventKey === 'plan:p1')).toBe(true);
        expect(uiEvents.some(message => message.metadata?.uiEventKey === 'plan:p1:step:st1')).toBe(true);
        expect(state.timelineSeedCount).toEqual(3);
        expect(state.timelineTailSeq).toEqual(2);
    }

    @Test('re-seeding with an updated entry is idempotent (upsert, not duplicate)')
    testReseedIdempotent() {
        const state = new AgentConsoleSessionState();
        state.configure({ sessionId: 's1' });
        const first: TimelineEntry[] = [
            entry({ key: 'tool:tc1', kind: 'tool', label: 'bash', status: 'running', lastSeq: 0, toolCallId: 'tc1' })
        ];
        const second: TimelineEntry[] = [
            entry({ key: 'tool:tc1', kind: 'tool', label: 'bash', status: 'success', lastSeq: 1, toolCallId: 'tc1', durationMs: 40 })
        ];
        state.seedTimeline(first);
        state.seedTimeline(second);
        const uiEvents = state.messages.filter(message => message.metadata?.uiKind === 'event' && message.metadata?.uiEventKey === 'tool:tc1');
        expect(uiEvents.length).toEqual(1);
        expect(uiEvents[0].metadata?.status).toEqual('success');
    }

    @Test('markTimelineReconnecting toggles reconnecting and stale flags')
    testReconnectFlags() {
        const state = new AgentConsoleSessionState();
        expect(state.timelineReconnecting).toBe(false);
        expect(state.timelineStale).toBe(false);
        state.markTimelineReconnecting(true);
        expect(state.timelineReconnecting).toBe(true);
        expect(state.timelineStale).toBe(true);
        state.markTimelineReconnecting(false);
        expect(state.timelineReconnecting).toBe(false);
        expect(state.timelineStale).toBe(false);
    }

    @Test('seed then live upsert merge onto same key')
    testSeedThenLiveMerge() {
        const state = new AgentConsoleSessionState();
        state.configure({ sessionId: 's1' });
        state.seedTimeline([entry({ key: 'tool:tc1', kind: 'tool', label: 'bash', status: 'running', lastSeq: 0, toolCallId: 'tc1' })]);
        state.upsertUiEventMessage('tool:tc1', 'bash completed', {
            eventType: 'tool_completed',
            label: 'tool',
            status: 'success',
            toolCallId: 'tc1',
            source: 'remote'
        });
        const uiEvents = state.messages.filter(message => message.metadata?.uiKind === 'event' && message.metadata?.uiEventKey === 'tool:tc1');
        expect(uiEvents.length).toEqual(1);
        expect(uiEvents[0].content).toEqual('bash completed');
    }
}
