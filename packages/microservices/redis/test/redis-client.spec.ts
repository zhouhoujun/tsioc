import expect = require('expect');
import { EventEmitter } from 'events';
import { createInjector } from '@tsdi/ioc';
import { createRequestContext } from '@tsdi/common';
import { RedisClient } from '../src/client/client';
import { RedisRequest } from '../src/client/request';
import { SOCKET } from '@tsdi/transport';

class TestRedisClient extends RedisClient {
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

describe('Redis client', () => {
    function createClient(options: any = {}) {
        const injector = createInjector();
        const handler = { injector } as any;
        return new TestRedisClient(handler, options);
    }

    it('defaults host and port when omitted', () => {
        const client = createClient({});
        expect((client as any).options.connectOpts).toEqual({ host: 'localhost', port: 6379 });
    });

    it('builds topic request for string topic', () => {
        const client = createClient({ connectOpts: { host: '127.0.0.1', port: 6379 } });
        const request = client.makeRequest('queue.jobs', { observe: 'response' });

        expect(request).toBeInstanceOf(RedisRequest);
        expect(request.topic).toBe('queue.jobs');
        expect(request.pattern).toBe('queue.jobs');
        expect(request.responseTopic).toBe('queue.jobs:response');
    });

    it('builds formatted topic request for object pattern', () => {
        const client = createClient({ connectOpts: { host: '127.0.0.1', port: 6379 } });
        const request = client.makeRequest({ cmd: 'device.status' }, { payload: { online: true } });

        expect(request.topic).toBe('cmd:device.status');
        expect(request.pattern).toEqual({ cmd: 'device.status' });
        expect(request.responseTopic).toBe('cmd:device.status:response');
    });

    it('initializes context with client, request, and socket', () => {
        const client = createClient({ connectOpts: { host: '127.0.0.1', port: 6379 } });
        const fakeConnection = { status: 'ready' };
        client.setConnection(fakeConnection);
        const request = new RedisRequest('topic.test', null, {});
        const context = createRequestContext(createInjector(), []);

        client.bindContext(context, request);

        expect(context.get(RedisClient)).toBe(client);
        expect(context.get(RedisRequest)).toBe(request);
        expect(context.get(SOCKET)).toBe(fakeConnection);
    });

    it('reports validity from redis status', () => {
        const client = createClient({ connectOpts: { host: '127.0.0.1', port: 6379 } });
        expect(client.checkValid({ status: 'ready' })).toBe(true);
        expect(client.checkValid({ status: 'connect' })).toBe(true);
        expect(client.checkValid({ status: 'end' })).toBe(false);
    });

    it('shuts down an active connection and clears it', async () => {
        const client = createClient({ connectOpts: { host: '127.0.0.1', port: 6379 } });
        const closeHandlers: Array<() => void> = [];
        const fakeConnection = {
            once(event: string, handler: () => void) {
                if (event === 'close') {
                    closeHandlers.push(handler);
                }
                return this;
            },
            removeAllListeners() {
                return this;
            },
            quit() {
                setTimeout(() => closeHandlers.splice(0).forEach(handler => handler()), 0);
                return Promise.resolve('OK');
            },
            disconnect() {
                return undefined;
            }
        };

        client.setConnection(fakeConnection);
        await client.shutdownClient();

        expect((client as any).connection).toBeUndefined();
    });

    it('forces shutdown when close never arrives', async () => {
        const client = createClient({ connectOpts: { host: '127.0.0.1', port: 6379 } });
        const originalSetTimeout = global.setTimeout;
        let disconnectCalls = 0;
        let unrefCalls = 0;
        const fakeConnection = {
            once() {
                return this;
            },
            removeAllListeners() {
                return this;
            },
            quit() {
                return Promise.resolve('OK');
            },
            disconnect() {
                disconnectCalls += 1;
                return undefined;
            }
        };

        (global as any).setTimeout = (handler: (...args: any[]) => void) => {
            handler();
            return {
                ref() { return this; },
                unref() {
                    unrefCalls += 1;
                    return this;
                }
            };
        };

        try {
            client.setConnection(fakeConnection);
            await client.shutdownClient();
            expect(disconnectCalls).toBe(1);
            expect(unrefCalls).toBe(1);
            expect((client as any).connection).toBeUndefined();
        } finally {
            (global as any).setTimeout = originalSetTimeout;
        }
    });
});
