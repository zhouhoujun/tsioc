import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST, Transport } from '@tsdi/common';
import { AuthOptions, provideService, useAuth, useRouter, Controller, Get, Post, RouteMapping, RequestBody, Handle, Subscribe, Payload } from '@tsdi/service';
import { useMqttTransport } from '../src/server';
import { withMqttTransport, MqttClient } from '../src/client';
import { provideClient, withTimeout } from '@tsdi/client';
import * as mqtt from 'mqtt';
import expect = require('expect');
import { lastValueFrom } from 'rxjs';
import { MQTT_TEST_URL, startMqttBroker, stopMqttBroker } from './test-broker';

const MQTT_URL = MQTT_TEST_URL;

interface AuthResultResponse {
    ok?: boolean;
    body?: { ok?: boolean };
    payload?: { ok?: boolean };
    statusCode?: number;
}

@Controller('/api/test')
class TestController {
    @Get('/info') info() { return { status: 'ok' }; }
    @Post('/echo') echo(@RequestBody() body: any) { return { received: body }; }
}

@RouteMapping('/api/route')
class RouteCtrl {
    @RouteMapping('/hello', GET) hello() { return 'hi'; }
    @RouteMapping('/data', POST) data(@RequestBody() b: any) { return { received: b }; }
}

class MqttPatternService {
    @Handle({ cmd: 'xxx' })
    cmd(@Payload() message: string) { return message; }

    @Handle('sensor/message/+')
    topic(@Payload() message: string) { return message; }

    @Subscribe('sensor/+/start', Transport.MQTT)
    subscribe(@Payload() message: string) { return message; }
}

describe('MQTT E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useMqttTransport({ url: MQTT_URL, asDefault: true })),
            provideClient(
                withTimeout(),
                withMqttTransport({ url: MQTT_URL, microservice: true, asDefault: true }))
        ]
    })
    class MqttMsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        await startMqttBroker();
        ctx = await Application.run(MqttMsModule);

    });
    after(async () => {
        if (ctx) await ctx.close();
        await stopMqttBroker();
    });

    it('should get MqttClient via ctx.get()', () => { expect(ctx.get(MqttClient)).toBeDefined(); });
    it('should bootstrap MQTT with microservice:true', () => { expect(ctx).toBeDefined(); });
});

describe('MQTT E2E microservice:false', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useMqttTransport({ microservice: false, url: MQTT_URL, asDefault: true })),
            provideClient(
                withTimeout(),
                withMqttTransport({ url: MQTT_URL, microservice: false, asDefault: true }))
        ]
    })
    class MqttHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        await startMqttBroker();
        ctx = await Application.run(MqttHostModule);

    });
    after(async () => {
        if (ctx) await ctx.close();
        await stopMqttBroker();
    });

    it('should bootstrap MQTT with microservice:false', () => { expect(ctx).toBeDefined(); });
});

describe('MQTT @Controller', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [TestController],
        providers: [provideService(useRouter(),
            useMqttTransport({ url: MQTT_URL, asDefault: true }))]
    })
    class MqttCtrlModule { }

    let ctx: ApplicationContext;

    before(async () => {
        await startMqttBroker();
        ctx = await Application.run(MqttCtrlModule);

    });
    after(async () => {
        if (ctx) await ctx.close();
        await stopMqttBroker();
    });

    it('should bootstrap @Controller', () => { expect(ctx).toBeDefined(); });
});

describe('MQTT @RouteMapping', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [RouteCtrl],
        providers: [provideService(useRouter(),
            useMqttTransport({ url: MQTT_URL, asDefault: true }))]
    })
    class MqttRouteModule { }

    let ctx: ApplicationContext;

    before(async () => {
        await startMqttBroker();
        ctx = await Application.run(MqttRouteModule);

    });
    after(async () => {
        if (ctx) await ctx.close();
        await stopMqttBroker();
    });

    it('should bootstrap @RouteMapping', () => { expect(ctx).toBeDefined(); });
});

describe('MQTT pattern routing', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [MqttPatternService],
        providers: [
            provideService(useRouter(),
                useMqttTransport({
                    url: MQTT_URL,
                    subscribeTopics: [
                        { topic: 'cmd:xxx', qos: 0 },
                        { topic: 'sensor/message/+', qos: 0 },
                        { topic: 'sensor/+/start', qos: 0 }
                    ]
                })),
            provideClient(
                withTimeout(),
                withMqttTransport({ url: MQTT_URL, microservice: true, asDefault: true }))
        ]
    })
    class MqttPatternModule { }

    let ctx: ApplicationContext;
    let client: MqttClient;

    before(async () => {
        await startMqttBroker();
        ctx = await Application.run(MqttPatternModule);
        client = ctx.get(MqttClient);

    });
    after(async () => {
        if (ctx) await ctx.destroy();
        await stopMqttBroker();
    });

    it('routes object cmd patterns through the default formatter', async () => {
        const result = await lastValueFrom<string>(client.send({ cmd: 'xxx' }, { payload: { message: 'ble' }, timeout: 5000 }));
        expect(result).toEqual('ble');
    });

    it('routes wildcard mqtt topics', async () => {
        const result = await lastValueFrom<string>(client.send('sensor/message/update', { payload: { message: 'ble' }, timeout: 5000 }));
        expect(result).toEqual('ble');
    });

    it('routes subscribe patterns via MQTT wildcard topic', async () => {
        const result = await lastValueFrom<string>(client.send('sensor/sensor01/start', { payload: { message: 'ble' }, timeout: 5000 }));
        expect(result).toEqual('ble');
    });
});

// ----- MQTT E2E request/response via native client -----
describe('MQTT E2E with provideService + provideClient (microservice:true)', () => {
    const TOPIC = 'e2e/test/ping';

    @Controller('/e2e/test')
    class MqttE2eController {
        @Get('/ping') ping() { return { result: 'pong' }; }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [MqttE2eController, TestController],
        providers: [
            provideService(useRouter(),
                useMqttTransport({
                    url: MQTT_URL,
                    subscribeTopics: [{ topic: TOPIC, qos: 0 }],
                    asDefault: true
                })),
            provideClient(
                withTimeout(),
                withMqttTransport({ url: MQTT_URL, microservice: true, asDefault: true }))
        ]
    })
    class MqttE2eModule { }

    let ctx: ApplicationContext;
    let client: mqtt.MqttClient;
    let tsdiClient: MqttClient;

    before(async () => {
        await startMqttBroker();
        ctx = await Application.run(MqttE2eModule);
        client = mqtt.connect(MQTT_URL);
        tsdiClient = ctx.get(MqttClient);
    });
    after(async () => {
        if (client) client.end(true);
        if (ctx) await ctx.destroy();
        await stopMqttBroker();
    });

    it('should bootstrap with provideService and provideClient', () => {
        expect(ctx).toBeDefined();
    });

    it('should handle message and respond via MQTT', async () => {
        const responseTopic = TOPIC + '/response';

        const result = await new Promise<any>((resolve, reject) => {
            client.subscribe(responseTopic, { qos: 0 }, () => {
                client.publish(TOPIC, JSON.stringify({
                    url: '/e2e/test/ping',
                    method: 'GET'
                }));
            });
            client.on('message', (topic, payload) => {
                if (topic === responseTopic) {
                    try {
                        resolve(JSON.parse(payload.toString()));
                    } catch {
                        resolve(payload.toString());
                    }
                }
            });
            setTimeout(() => reject(new Error('Timeout')), 1000);
        });

        expect(result.statusCode ?? result.status).toBe(200);
        expect(result.body ?? result.payload).toEqual({ result: 'pong' });
    });

    it('binds payload body for controller POST requests from native MQTT publish', async () => {
        const responseTopic = TOPIC + '/response';
        const result = await new Promise<any>((resolve, reject) => {
            client.subscribe(responseTopic, { qos: 0 }, () => {
                client.publish(TOPIC, JSON.stringify({
                    url: '/api/test/echo',
                    method: 'POST',
                    payload: { id: 'u1', enabled: true }
                }));
            });
            client.once('message', (topic, payload) => {
                if (topic === responseTopic) {
                    resolve(JSON.parse(payload.toString()));
                }
            });
            setTimeout(() => reject(new Error('Timeout')), 1500);
        });

        expect(result.body ?? result.payload).toEqual({
            received: { id: 'u1', enabled: true }
        });
    });

    it('returns response envelopes for observe:response client requests', async () => {
        const result: any = await lastValueFrom(tsdiClient.send(TOPIC, {
            observe: 'response',
            method: 'GET',
            payload: {
                url: '/api/test/info',
                method: 'GET'
            },
            timeout: 5000
        }));

        expect(result.status).toBe(200);
        expect(result.ok).toBe(true);
        expect(result.body).toEqual({ result: 'pong' });
        expect(result.payload).toEqual({ result: 'pong' });
    });

    it('supports custom response topics for native MQTT request-response flows', async () => {
        const responseTopic = 'e2e/test/custom-replies';
        const result = await new Promise<any>((resolve, reject) => {
            client.subscribe(responseTopic, { qos: 0 }, () => {
                client.publish(TOPIC, JSON.stringify({
                    url: '/api/test/echo',
                    method: 'POST',
                    payload: { id: 'custom' },
                    responseTopic
                }));
            });
            const onMessage = (topic: string, payload: Buffer) => {
                if (topic === responseTopic) {
                    client.off('message', onMessage);
                    resolve(JSON.parse(payload.toString()));
                }
            };
            client.on('message', onMessage);
            setTimeout(() => reject(new Error('Timeout')), 1500);
        });

        expect(result.body ?? result.payload).toEqual({
            received: { id: 'custom' }
        });
    });
});

// ----- microservice:false -----
describe('MQTT E2E with provideService + provideClient (microservice:false)', () => {
    const TOPIC = 'e2e/host/ping';

    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useMqttTransport({
                    microservice: false,
                    url: MQTT_URL,
                    subscribeTopics: [{ topic: TOPIC, qos: 0 }],
                    asDefault: true
                })),
            provideClient(
                withTimeout(),
                withMqttTransport({ url: MQTT_URL, microservice: false, asDefault: true }))
        ]
    })
    class MqttE2eHostModule { }

    let ctx: ApplicationContext;
    let client: mqtt.MqttClient;

    before(async () => {
        await startMqttBroker();
        ctx = await Application.run(MqttE2eHostModule);
        client = mqtt.connect(MQTT_URL);
    });
    after(async () => {
        if (client) client.end(true);
        if (ctx) await ctx.destroy();
        await stopMqttBroker();
    });

    it('should bootstrap with provideService and provideClient in host mode', () => {
        expect(ctx).toBeDefined();
    });

    it('should handle message in host mode', async () => {
        const responseTopic = TOPIC + '/response';

        const result = await new Promise<any>((resolve, reject) => {
            client.subscribe(responseTopic, { qos: 0 }, () => {
                client.publish(TOPIC, JSON.stringify({ url: '/test', method: 'GET' }));
            });
            client.on('message', (topic, payload) => {
                if (topic === responseTopic) {
                    try { resolve(JSON.parse(payload.toString())); } catch { resolve(payload.toString()); }
                }
            });
            setTimeout(() => reject(new Error('Timeout')), 1000);
        });

        expect(result.statusCode ?? result.status).toBe(404);
    });
});

describe('MQTT auth E2E', () => {
    const TOPIC = 'e2e/auth/ping';
    const authOptions: AuthOptions = { bearerToken: 'secret-token' };

    @Controller('/secure')
    class MqttSecureController {
        @Get('/ping') ping() { return { ok: true }; }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [MqttSecureController],
        providers: [
            provideService(
                useRouter(),
                useAuth(authOptions),
                useMqttTransport({
                    url: MQTT_URL,
                    subscribeTopics: [{ topic: TOPIC, qos: 0 }],
                    asDefault: true
                })
            ),
            provideClient(
                withTimeout(),
                withMqttTransport({ url: MQTT_URL, microservice: true, asDefault: true })
            )
        ]
    })
    class MqttAuthModule { }

    let ctx: ApplicationContext;
    let client: mqtt.MqttClient;

    before(async () => {
        await startMqttBroker();
        ctx = await Application.run(MqttAuthModule);
        client = mqtt.connect(MQTT_URL);
    });

    after(async () => {
        if (client) client.end(true);
        if (ctx) await ctx.destroy();
        await stopMqttBroker();
    });

    it('accepts requests with bearer token', async () => {
        const responseTopic = TOPIC + '/response';
        const result = await new Promise<AuthResultResponse>((resolve, reject) => {
            client.subscribe(responseTopic, { qos: 0 }, () => {
                client.publish(TOPIC, JSON.stringify({
                    url: '/secure/ping',
                    method: 'GET',
                    headers: { authorization: 'Bearer secret-token' }
                }));
            });
            client.once('message', (topic, payload) => {
                if (topic === responseTopic) {
                    resolve(JSON.parse(payload.toString()));
                }
            });
            setTimeout(() => reject(new Error('Timeout')), 1500);
        });
        expect(result.payload?.ok ?? result.body?.ok ?? result.ok).toBe(true);
    });

    it('rejects requests without bearer token', async () => {
        const responseTopic = TOPIC + '/response';
        const result = await new Promise<AuthResultResponse>((resolve, reject) => {
            client.subscribe(responseTopic, { qos: 0 }, () => {
                client.publish(TOPIC, JSON.stringify({
                    url: '/secure/ping',
                    method: 'GET'
                }));
            });
            client.once('message', (topic, payload) => {
                if (topic === responseTopic) {
                    resolve(JSON.parse(payload.toString()));
                }
            });
            setTimeout(() => reject(new Error('Timeout')), 1500);
        });
        expect(result.statusCode).toBe(401);
    });
});
