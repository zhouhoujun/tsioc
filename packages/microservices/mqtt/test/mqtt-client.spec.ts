import expect = require('expect');
import { createInjector } from '@tsdi/ioc';
import { createRequestContext } from '@tsdi/common';
import { MqttClient } from '../src/client/client';
import { MqttRequest } from '../src/client/request';
import { SOCKET } from '@tsdi/transport';
import * as mqtt from 'mqtt';
import { Events } from '@tsdi/common';
import { EventEmitter } from 'events';

class TestMqttClient extends MqttClient {
    public makeRequest(first: any, options: any = {}) {
        return this.buildRequest(first, options);
    }

    public makeConnection(opts: any) {
        return this.createConnection(opts);
    }

    public setConnection(connection: any) {
        (this as any).connection = connection;
    }

    public async shutdownClient() {
        await this.onShutdown();
    }

    public checkValid(connection: any) {
        return this.isValid(connection);
    }

    public bindContext(context: any, request: any) {
        this.initContext(context, request);
    }

    public connectMqtt() {
        return this.connect();
    }
}

describe('MQTT client', () => {
    const originalConnect = mqtt.connect;

    function createClient(options: any = {}) {
        const injector = createInjector();
        const handler = { injector } as any;
        return new TestMqttClient(handler, options);
    }

    afterEach(() => {
        (mqtt as any).connect = originalConnect;
    });

    it('defaults url when omitted', () => {
        const client = createClient({});
        expect((client as any).options.url).toBe('mqtt://localhost:1883');
    });

    it('builds topic request for string topic', () => {
        const client = createClient({ url: 'mqtt://127.0.0.1:1883' });
        const request = client.makeRequest('sensor/message/start', { observe: 'response' });

        expect(request).toBeInstanceOf(MqttRequest);
        expect(request.topic).toBe('sensor/message/start');
        expect(request.pattern).toBe(null);
        expect(request.responseTopic).toBe('sensor/message/start/response');
    });

    it('builds formatted topic request for object pattern', () => {
        const client = createClient({ url: 'mqtt://127.0.0.1:1883' });
        const request = client.makeRequest({ cmd: 'device.status' }, { payload: { online: true } });

        expect(request.topic).toBe('cmd:device.status');
        expect(request.pattern).toEqual({ cmd: 'device.status' });
        expect(request.responseTopic).toBe('cmd:device.status/response');
    });

    it('initializes context with client, request, and socket', () => {
        const client = createClient({ url: 'mqtt://127.0.0.1:1883' });
        const fakeConnection = { connected: true };
        client.setConnection(fakeConnection);
        const request = new MqttRequest('topic.test', null, {});
        const context = createRequestContext(createInjector(), []);

        client.bindContext(context, request);

        expect(context.get(MqttClient)).toBe(client);
        expect(context.get(MqttRequest)).toBe(request);
        expect(context.get(SOCKET)).toBe(fakeConnection);
    });

    it('reports validity from mqtt connected state', () => {
        const client = createClient({ url: 'mqtt://127.0.0.1:1883' });
        expect(client.checkValid({ connected: true })).toBe(true);
        expect(client.checkValid({ connected: false })).toBe(false);
    });

    it('delegates connection creation to mqtt.connect', () => {
        const fakeConnection = { sentinel: 'mqtt-connect' };
        (mqtt as any).connect = (url: string, connectOpts: any) => {
            expect(url).toBe('mqtt://127.0.0.1:1883');
            expect(connectOpts).toEqual({ keepalive: 15 });
            return fakeConnection;
        };

        const client = createClient({ url: 'mqtt://127.0.0.1:1883', connectOpts: { keepalive: 15 } });
        const created = client.makeConnection((client as any).options);

        expect(created).toBe(fakeConnection);
    });

    it('shuts down an active connection and clears it', async () => {
        const client = createClient({ url: 'mqtt://127.0.0.1:1883' });
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
            end(_force?: boolean) {
                setTimeout(() => closeHandlers.splice(0).forEach(handler => handler()), 0);
                return this;
            }
        };

        client.setConnection(fakeConnection);
        await client.shutdownClient();

        expect((client as any).connection).toBeUndefined();
    });

    it('forces shutdown when close never arrives', async () => {
        const client = createClient({ url: 'mqtt://127.0.0.1:1883' });
        const originalSetTimeout = global.setTimeout;
        const endCalls: boolean[] = [];
        let unrefCalls = 0;
        const fakeConnection = {
            once() {
                return this;
            },
            removeAllListeners() {
                return this;
            },
            end(force?: boolean) {
                endCalls.push(!!force);
                return this;
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
            expect(endCalls).toEqual([false, true]);
            expect(unrefCalls).toBe(1);
            expect((client as any).connection).toBeUndefined();
        } finally {
            (global as any).setTimeout = originalSetTimeout;
        }
    });

    it('ends failed connection attempts and clears listeners', async () => {
        const client = createClient({ url: 'mqtt://127.0.0.1:1883' });
        const events = new EventEmitter() as any;
        let removeAllListenersCalls = 0;
        const endCalls: boolean[] = [];

        events.once = events.once.bind(events);
        events.on = events.on.bind(events);
        events.removeAllListeners = () => {
            removeAllListenersCalls += 1;
            return events;
        };
        events.end = (force?: boolean) => {
            endCalls.push(!!force);
            return events;
        };

        (client as any).createConnection = () => events;

        const promise = new Promise((resolve) => {
            client.connectMqtt().subscribe({
                next: resolve,
                error: resolve
            });
        });

        events.emit(Events.ERROR, new Error('connect failed'));
        await promise;

        expect(endCalls).toEqual([true]);
        expect(removeAllListenersCalls).toBeGreaterThan(0);
    });
});
