import expect = require('expect');
import { WebSocket } from 'ws';
import { WsMessageAdapter } from '../src/server/message-adapter';

describe('WS message adapter auth-facing reads', () => {
    it('reads authorization headers, query token, body payload, and writes status state', () => {
        const socket = { readyState: WebSocket.OPEN } as any;
        const request = {
            headers: { authorization: 'Bearer ws-token', 'x-test': '1' },
            query: { token: 'query-token' },
            body: { id: 'u1' },
            params: { pid: 'p1' },
            paths: { name: 'alice' },
            topic: 'sensor.message.start'
        };
        const adapter = new WsMessageAdapter(socket);
        adapter.setRequestData(request);
        adapter.setStatus(202, 'Accepted');
        adapter.setHeader('x-auth', 'ok');
        adapter.setPayload({ ok: true });

        expect(adapter.read('headers', 'authorization')).toBe('Bearer ws-token');
        expect(adapter.read('query', 'token')).toBe('query-token');
        expect(adapter.read('body', 'id')).toBe('u1');
        expect(adapter.read('params', 'pid')).toBe('p1');
        expect(adapter.read('path', 'name')).toBe('alice');
        expect(adapter.read('topic')).toBe('sensor.message.start');
        expect(adapter.status).toBe(202);
        expect(adapter.getStatusMessage()).toBe('Accepted');
        expect(adapter.getResponseHeader('x-auth')).toBe('ok');
        expect(adapter.payload).toEqual({ ok: true });
    });
});
