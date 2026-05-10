import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST } from '@tsdi/common';
import { provideService, withServiceRouter, Controller, Get, Post, RouteMapping, RequestBody } from '@tsdi/service';
import { withNatsTransport } from '../src/server';
import { withNatsClientTransport } from '../src/client';
import { provideClient } from '@tsdi/client';
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
