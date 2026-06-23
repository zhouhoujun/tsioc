import expect = require('expect');
import { EventEmitter } from 'events';
import { createInjector } from '@tsdi/ioc';
import { createRequestContext, ErrorResponse, REQUEST } from '@tsdi/common';
import { SOCKET } from '../src/context';
import { useJsonPacket } from '../src/providers';
import { createRequestHandler } from '@tsdi/common';
import { lastValueFrom, take, toArray } from 'rxjs';
import { TcpRequest } from '@tsdi/tcp';

class FakeSocket extends EventEmitter {
    public writes: any[] = [];

    write(data: any, callback?: (err?: Error | null) => void) {
        this.writes.push(data);
        callback?.(null);
        return true;
    }

    send(data: any, callback?: (err?: Error | null) => void) {
        this.writes.push(data);
        callback?.(null);
        return true;
    }
}

describe('socket client contract', () => {
    function createBackend() {
        const config: any = {
            side: 0,
            transport: 'tcp',
            transfer: {},
            providers: [],
            features: { defaultTransfer: useJsonPacket() }
        };
        const injector = createInjector(config.providers as any);
        return createRequestHandler(injector, config) as any;
    }

    function createContext(request: TcpRequest<any>, socket: FakeSocket) {
        const injector = createInjector();
        return createRequestContext(injector, [
            [REQUEST, request],
            [SOCKET, socket]
        ]);
    }

    it('returns ResponseEventPacket for emit', async () => {
        const handler = createBackend();
        const socket = new FakeSocket();
        const request = new TcpRequest('/topic.emit', null, { observe: 'emit' } as any, 'POST');

        const result = await lastValueFrom(handler.handle(request, createContext(request, socket)));
        expect(result).toEqual({ type: 0 });
    });

    it('returns body for body observe', async () => {
        const handler = createBackend();
        const socket = new FakeSocket();
        const request = new TcpRequest('/topic.body', null, { observe: 'body' } as any, 'POST');
        const result$ = handler.handle(request, createContext(request, socket));

        setTimeout(() => {
            const sent = JSON.parse(socket.writes[0].toString());
            socket.emit('data', Buffer.from(JSON.stringify({ id: sent.id, status: 200, payload: 'done' }) + '\r\n'));
        }, 0);

        const result = await lastValueFrom(result$);
        expect(result).toBe('done');
    });

    it('returns full response for response observe', async () => {
        const handler = createBackend();
        const socket = new FakeSocket();
        const request = new TcpRequest('/topic.response', null, { observe: 'response' } as any, 'POST');
        const result$ = handler.handle(request, createContext(request, socket));

        setTimeout(() => {
            const sent = JSON.parse(socket.writes[0].toString());
            socket.emit('data', Buffer.from(JSON.stringify({ id: sent.id, status: 201, statusMessage: 'Created', payload: { ok: true } }) + '\r\n'));
        }, 0);

        const result: any = await lastValueFrom(result$);
        expect(result.status).toBe(201);
        expect(result.statusText).toBe('Created');
        expect(result.body).toEqual({ ok: true });
    });

    it('throws ErrorResponse for failed body observe reply', async () => {
        const handler = createBackend();
        const socket = new FakeSocket();
        const request = new TcpRequest('/topic.error', null, { observe: 'body' } as any, 'POST');
        const result$ = handler.handle(request, createContext(request, socket));

        setTimeout(() => {
            const sent = JSON.parse(socket.writes[0].toString());
            socket.emit('data', Buffer.from(JSON.stringify({ id: sent.id, status: 500, statusMessage: 'Boom', error: { message: 'Boom' } }) + '\r\n'));
        }, 0);

        await expect(lastValueFrom(result$)).rejects.toBeInstanceOf(ErrorResponse);
    });

    it('streams matching replies for observe until unsubscribe', async () => {
        const handler = createBackend();
        const socket = new FakeSocket();
        const request = new TcpRequest('/topic.observe', null, { observe: 'observe' } as any, 'POST');
        const result$ = handler.handle(request, createContext(request, socket));
        const resultPromise = lastValueFrom(result$.pipe(take(2), toArray()));

        setTimeout(() => {
            const sent = JSON.parse(socket.writes[0].toString());
            socket.emit('data', Buffer.from(JSON.stringify({ id: 'other', status: 200, payload: 'skip' }) + '\r\n'));
            socket.emit('data', Buffer.from(JSON.stringify({ id: sent.id, status: 200, payload: 'one' }) + '\r\n'));
            socket.emit('data', Buffer.from(JSON.stringify({ id: sent.id, status: 200, payload: 'two' }) + '\r\n'));
        }, 0);

        const result = await resultPromise;
        expect(result).toEqual(['one', 'two']);
    });
});
