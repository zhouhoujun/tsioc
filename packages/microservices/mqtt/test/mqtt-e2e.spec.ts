import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST } from '@tsdi/common';
import { provideService, withServiceRouter, Controller, Get, Post, RouteMapping, RequestBody } from '@tsdi/service';
import { withMqttTransport } from '../src/server';
import { withMqttClientTransport } from '../src/client';
import { provideClient } from '@tsdi/client';
import * as mqtt from 'mqtt';
import expect = require('expect');

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

const MQTT_URL = 'mqtt://127.0.0.1:1883';

describe('MQTT E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withMqttTransport({ url: MQTT_URL, asDefault: true })),
            ...provideClient(
                withMqttClientTransport({ url: MQTT_URL, microservice: true, asDefault: true }))
        ]
    })
    class MqttMsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(MqttMsModule);
        await new Promise(r => setTimeout(r, 1500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap MQTT with microservice:true', () => { expect(ctx).toBeDefined(); });
});

describe('MQTT E2E microservice:false', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withMqttTransport({ microservice: false as any, url: MQTT_URL, asDefault: true })),
            ...provideClient(
                withMqttClientTransport({ url: MQTT_URL, microservice: false, asDefault: true }))
        ]
    })
    class MqttHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(MqttHostModule);
        await new Promise(r => setTimeout(r, 1500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap MQTT with microservice:false', () => { expect(ctx).toBeDefined(); });
});

describe('MQTT @Controller', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [TestController],
        providers: [...provideService(withServiceRouter(),
            withMqttTransport({ url: MQTT_URL, asDefault: true }))]
    })
    class MqttCtrlModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(MqttCtrlModule);
        await new Promise(r => setTimeout(r, 1500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @Controller', () => { expect(ctx).toBeDefined(); });
});

describe('MQTT @RouteMapping', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [RouteCtrl],
        providers: [...provideService(withServiceRouter(),
            withMqttTransport({ url: MQTT_URL, asDefault: true }))]
    })
    class MqttRouteModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(MqttRouteModule);
        await new Promise(r => setTimeout(r, 1500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @RouteMapping', () => { expect(ctx).toBeDefined(); });
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
        declarations: [MqttE2eController],
        providers: [
            ...provideService(withServiceRouter(),
                withMqttTransport({
                    url: MQTT_URL,
                    subscribeTopics: [{ topic: TOPIC, qos: 0 }],
                    asDefault: true
                })),
            ...provideClient(
                withMqttClientTransport({ url: MQTT_URL, microservice: true, asDefault: true }))
        ]
    })
    class MqttE2eModule { }

    let ctx: ApplicationContext;
    let client: mqtt.MqttClient;

    before(async () => {
        ctx = await Application.run(MqttE2eModule);
        client = mqtt.connect(MQTT_URL);
        await new Promise(r => setTimeout(r, 1500));
    });
    after(async () => {
        if (client) client.end(true);
        if (ctx) await ctx.destroy();
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
            setTimeout(() => reject(new Error('Timeout')), 10000);
        });

        expect(result).toBeDefined();
        expect(result).toBeDefined();
    });
});

// ----- microservice:false -----
describe('MQTT E2E with provideService + provideClient (microservice:false)', () => {
    const TOPIC = 'e2e/host/ping';

    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withMqttTransport({
                    microservice: false as any,
                    url: MQTT_URL,
                    subscribeTopics: [{ topic: TOPIC, qos: 0 }],
                    asDefault: true
                })),
            ...provideClient(
                withMqttClientTransport({ url: MQTT_URL, microservice: false, asDefault: true }))
        ]
    })
    class MqttE2eHostModule { }

    let ctx: ApplicationContext;
    let client: mqtt.MqttClient;

    before(async () => {
        ctx = await Application.run(MqttE2eHostModule);
        client = mqtt.connect(MQTT_URL);
        await new Promise(r => setTimeout(r, 1500));
    });
    after(async () => {
        if (client) client.end(true);
        if (ctx) await ctx.destroy();
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
            setTimeout(() => reject(new Error('Timeout')), 10000);
        });

        expect(result).toBeDefined();
    });
});
