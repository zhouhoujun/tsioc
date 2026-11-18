import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { EventHandler } from '../src/api/EventHandler';

function createHandler() {
    const owners = { isAuthorized: async () => true } as any;
    return new EventHandler(owners);
}

function connect(handler: EventHandler, lastEventId?: string) {
    const writes: string[] = [];
    const res = {
        writeHead: () => res,
        write: (chunk: any) => { writes.push(String(chunk)); return true; },
        on: () => undefined,
        end: () => undefined
    } as any;
    const req = {
        url: '/api/events?sessionId=s1',
        headers: lastEventId ? { 'last-event-id': lastEventId } : {}
    } as any;
    const route = handler.getRoutes().find(item => item.path === '/api/events')!;
    return { writes, run: () => route.handler(req, res, {}) };
}

@Suite('gateway SSE reconnect replay')
export class GatewaySseReplayTest {
    @Test('replays events after Last-Event-ID and stamps live ids')
    async replay() {
        const handler = createHandler();
        handler.onTurnStarted({ sessionId: 's1', input: 'one' } as any);
        handler.onTurnStarted({ sessionId: 's1', input: 'two' } as any);
        const events = handler.getHistory('s1').events;
        expect(events.length).toEqual(2);

        const first = connect(handler, events[0].id);
        await first.run();
        const replayed = first.writes.join('');
        expect(replayed).toContain(`id: ${events[1].id}`);
        expect(replayed).not.toContain(`id: ${events[0].id}`);
        expect(replayed).toContain('event: turn_started');

        // Live broadcasts carry the record id so a later reconnect can resume.
        handler.onTurnStarted({ sessionId: 's1', input: 'three' } as any);
        const latest = handler.getHistory('s1').events[events.length];
        expect(first.writes.join('')).toContain(`id: ${latest.id}`);
    }

    @Test('connects without replay when no Last-Event-ID is sent')
    async freshConnection() {
        const handler = createHandler();
        handler.onTurnStarted({ sessionId: 's1', input: 'one' } as any);
        const connection = connect(handler);
        await connection.run();
        const text = connection.writes.join('');
        expect(text).toContain('event: connected');
        expect(text).not.toContain('event: turn_started');
    }
}
