import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST } from '@tsdi/common';
import { provideService, withServiceRouter, Controller, Get, Post, RouteMapping, RequestBody } from '@tsdi/service';
import { withNatsTransport } from '../src/server';
import { withNatsClientTransport, NatsClient } from '../src/client';
import { provideClient } from '@tsdi/client';
import { connect, StringCodec, NatsConnection } from 'nats';
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

const NATS_URL = 'nats://127.0.0.1:4222';

describe('NATS E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withNatsTransport({ url: NATS_URL, asDefault: true })),
            ...provideClient(
                withNatsClientTransport({ url: NATS_URL, microservice: true, asDefault: true }))
        ]
    })
    class NatsMsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(NatsMsModule);
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should get NatsClient via ctx.get()', () => { expect(ctx.get(NatsClient)).toBeDefined(); });
    it('should bootstrap NATS with microservice:true', () => { expect(ctx).toBeDefined(); });
});

describe('NATS E2E microservice:false', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withNatsTransport({ microservice: false as any, url: NATS_URL, asDefault: true })),
            ...provideClient(
                withNatsClientTransport({ url: NATS_URL, microservice: false, asDefault: true }))
        ]
    })
    class NatsHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(NatsHostModule);
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap NATS with microservice:false', () => { expect(ctx).toBeDefined(); });
});

describe('NATS @Controller', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [TestController],
        providers: [...provideService(withServiceRouter(),
            withNatsTransport({ url: NATS_URL, asDefault: true }))]
    })
    class NatsCtrlModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(NatsCtrlModule);
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @Controller', () => { expect(ctx).toBeDefined(); });
});

describe('NATS @RouteMapping', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [RouteCtrl],
        providers: [...provideService(withServiceRouter(),
            withNatsTransport({ url: NATS_URL, asDefault: true }))]
    })
    class NatsRouteModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(NatsRouteModule);
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @RouteMapping', () => { expect(ctx).toBeDefined(); });
});

// ----- NATS E2E request/response via native client -----
describe('NATS E2E with provideService + provideClient (microservice:true)', () => {
    const SUBJECT = 'e2e.test.ping';

    @Controller('/e2e/test')
    class NatsE2eController {
        @Get('/ping') ping() { return { result: 'pong' }; }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [NatsE2eController],
        providers: [
            ...provideService(withServiceRouter(),
                withNatsTransport({ url: NATS_URL, subjects: [SUBJECT], asDefault: true })),
            ...provideClient(
                withNatsClientTransport({ url: NATS_URL, microservice: true, asDefault: true }))
        ]
    })
    class NatsE2eModule { }

    let ctx: ApplicationContext;
    let nc: NatsConnection;
    const sc = StringCodec();

    before(async () => {
        ctx = await Application.run(NatsE2eModule);
        nc = await connect({ servers: NATS_URL });
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => {
        if (nc) await nc.drain();
        if (ctx) await ctx.destroy();
    });

    it('should bootstrap with provideService and provideClient', () => {
        expect(ctx).toBeDefined();
    });

    it('should handle request and respond via NATS', async () => {
        const msg = await nc.request(SUBJECT, sc.encode(JSON.stringify({
            url: '/e2e/test/ping',
            method: 'GET'
        })), { timeout: 10000 });
        const response = JSON.parse(sc.decode(msg.data));
        expect(response).toBeDefined();
        expect(response).toBeDefined();
    });
});

// ----- microservice:false -----
describe('NATS E2E with provideService + provideClient (microservice:false)', () => {
    const SUBJECT = 'e2e.host.ping';

    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withNatsTransport({ microservice: false as any, url: NATS_URL, subjects: [SUBJECT], asDefault: true })),
            ...provideClient(
                withNatsClientTransport({ url: NATS_URL, microservice: false, asDefault: true }))
        ]
    })
    class NatsE2eHostModule { }

    let ctx: ApplicationContext;
    let nc: NatsConnection;
    const sc = StringCodec();

    before(async () => {
        ctx = await Application.run(NatsE2eHostModule);
        nc = await connect({ servers: NATS_URL });
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => {
        if (nc) await nc.drain();
        if (ctx) await ctx.destroy();
    });

    it('should bootstrap with provideService and provideClient in host mode', () => {
        expect(ctx).toBeDefined();
    });

    it('should handle request in host mode', async () => {
        const msg = await nc.request(SUBJECT, sc.encode(JSON.stringify({
            url: '/test',
            method: 'GET'
        })), { timeout: 10000 });
        const response = JSON.parse(sc.decode(msg.data));
        expect(response).toBeDefined();
    });
});
