import expect = require('expect');
import { EventEmitter } from 'events';
import { createInjector } from '@tsdi/ioc';
import { createRequestContext } from '@tsdi/common';
import { WsClient } from '../src/client/client';
import { WsRequest } from '../src/client/request';
import { SOCKET as WS_SOCKET } from '../src/context';
import { SOCKET as TRANSPORT_SOCKET } from '@tsdi/transport';

class TestWsClient extends WsClient {
    public makeRequest(first: any, options: any = {}) {
        return this.buildRequest(first, options);
    }

    public setConnection(connection: any) {
        (this as any).connection = connection;
    }

    public bindContext(context: any, request: any) {
        this.initContext(context, request);
    }

    public async shutdownClient() {
        await this.onShutdown();
    }

    public checkValid(connection: any) {
        return this.isValid(connection);
    }
}

class FakeWsConnection extends EventEmitter {
    public readyState = 1;
    public sent: string[] = [];
    public closeCalls: Array<{ code?: number; reason?: string }> = [];
    public terminated = 0;
    public listenersCleared = 0;

    send(message: string, callback?: (err?: Error) => void) {
        this.sent.push(message);
        callback?.();
    }

    close(code?: number, reason?: string) {
        this.closeCalls.push({ code, reason });
    }

    terminate() {
        this.terminated += 1;
        this.readyState = 3;
    }

    removeAllListeners(event?: string | symbol) {
        this.listenersCleared += 1;
        return super.removeAllListeners(event as any);
    }
}

describe('WsClient', () => {
    function createClient(options: any = {}) {
        const injector = createInjector();
        const handler = { injector } as any;
        return new TestWsClient(handler, options);
    }

    it('defaults url when omitted', () => {
        const client = createClient({});
        expect((client as any).options.url).toBe('ws://localhost:3000');
    });

    it('builds request with GET default when microservice is false', () => {
        const client = createClient({ url: 'ws://127.0.0.1:3000', microservice: false });
        const request = client.makeRequest('/device', {});

        expect(request).toBeInstanceOf(WsRequest);
        expect(request.url).toBe('/device');
        expect(request.method).toBe('GET');
    });

    it('initializes both ws and transport socket tokens', () => {
        const client = createClient({ url: 'ws://127.0.0.1:3000' });
        const connection = new FakeWsConnection();
        const request = new WsRequest('/topic', null, {});
        const context = createRequestContext(createInjector(), []);

        client.setConnection(connection);
        client.bindContext(context, request);

        expect(context.get(WsClient)).toBe(client);
        expect(context.get(WsRequest)).toBe(request);
        expect(context.get(WS_SOCKET)).toBe(connection);
        expect(context.get(TRANSPORT_SOCKET)).toBe(connection);
    });

    it('sends stringified objects over an open websocket', async () => {
        const client = createClient({ url: 'ws://127.0.0.1:3000' });
        const connection = new FakeWsConnection();
        client.setConnection(connection);

        await client.sendMessage({ ok: true });

        expect(connection.sent).toEqual(['{"ok":true}']);
    });

    it('receives and parses the next message', async () => {
        const client = createClient({ url: 'ws://127.0.0.1:3000' });
        const connection = new FakeWsConnection();
        client.setConnection(connection);

        const pending = client.receive();
        connection.emit('message', Buffer.from('{"status":"ok"}'));

        await expect(pending).resolves.toEqual({ status: 'ok' });
    });

    it('rejects receive when the websocket errors', async () => {
        const client = createClient({ url: 'ws://127.0.0.1:3000' });
        const connection = new FakeWsConnection();
        client.setConnection(connection);

        const pending = client.receive();
        connection.emit('error', new Error('socket failed'));

        await expect(pending).rejects.toThrow('socket failed');
    });

    it('unrefs receive timeout timers so they do not keep the process alive', async () => {
        const client = createClient({ url: 'ws://127.0.0.1:3000' });
        const connection = new FakeWsConnection();
        client.setConnection(connection);
        const originalSetTimeout = global.setTimeout;
        let unrefCalled = 0;

        (global as any).setTimeout = ((handler: (...args: any[]) => void, _delay?: number) => {
            return {
                ref() { return this; },
                unref() {
                    unrefCalled += 1;
                    handler();
                    return this;
                }
            };
        }) as typeof setTimeout;

        try {
            await expect(client.receive()).rejects.toThrow('Receive timeout');
            expect(unrefCalled).toBe(1);
        } finally {
            (global as any).setTimeout = originalSetTimeout;
        }
    });

    it('rejects sendMessage when websocket is not connected', async () => {
        const client = createClient({ url: 'ws://127.0.0.1:3000' });
        const connection = new FakeWsConnection();
        connection.readyState = 3;
        client.setConnection(connection);

        await expect(client.sendMessage('hello')).rejects.toThrow('WebSocket is not connected');
    });

    it('closes and terminates active websocket connections on shutdown', async () => {
        const client = createClient({ url: 'ws://127.0.0.1:3000' });
        const connection = new FakeWsConnection();
        client.setConnection(connection);

        await client.shutdownClient();

        expect(connection.closeCalls).toEqual([{ code: 1001, reason: 'Client shutdown' }]);
        expect(connection.terminated).toBe(1);
        expect((client as any).connection).toBe(null);
    });

    it('skips terminate when websocket is already closed', async () => {
        const client = createClient({ url: 'ws://127.0.0.1:3000' });
        const connection = new FakeWsConnection();
        connection.readyState = 3;
        client.setConnection(connection);

        await client.shutdownClient();

        expect(connection.closeCalls).toEqual([]);
        expect(connection.terminated).toBe(0);
        expect((client as any).connection).toBe(null);
    });

    it('reports validity from websocket ready state', () => {
        const client = createClient({ url: 'ws://127.0.0.1:3000' });
        expect(client.checkValid({ readyState: 1 })).toBe(true);
        expect(client.checkValid({ readyState: 3 })).toBe(false);
    });
});
