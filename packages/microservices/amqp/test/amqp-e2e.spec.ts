import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST } from '@tsdi/common';
import { provideService, withServiceRouter, Controller, Get, Post, RouteMapping, RequestBody } from '@tsdi/service';
import { withAmqpTransport } from '../src/server';
import { withAmqpClientTransport } from '../src/client';
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

const AMQP_URL = 'amqp://127.0.0.1:5672?frameMax=16384';

describe('AMQP E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withAmqpTransport({ url: AMQP_URL, asDefault: true })),
            ...provideClient(
                withAmqpClientTransport({ url: AMQP_URL, microservice: true, asDefault: true }))
        ]
    })
    class AmqpMsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(AmqpMsModule);
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap AMQP with microservice:true', () => { expect(ctx).toBeDefined(); });
});

describe('AMQP E2E microservice:false', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withAmqpTransport({ microservice: false as any, url: AMQP_URL, asDefault: true })),
            ...provideClient(
                withAmqpClientTransport({ url: AMQP_URL, microservice: false, asDefault: true }))
        ]
    })
    class AmqpHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(AmqpHostModule);
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap AMQP with microservice:false', () => { expect(ctx).toBeDefined(); });
});

describe('AMQP @Controller', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [TestController],
        providers: [...provideService(withServiceRouter(),
            withAmqpTransport({ url: AMQP_URL, asDefault: true }))]
    })
    class AmqpCtrlModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(AmqpCtrlModule);
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @Controller', () => { expect(ctx).toBeDefined(); });
});

describe('AMQP @RouteMapping', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [RouteCtrl],
        providers: [...provideService(withServiceRouter(),
            withAmqpTransport({ url: AMQP_URL, asDefault: true }))]
    })
    class AmqpRouteModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(AmqpRouteModule);
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @RouteMapping', () => { expect(ctx).toBeDefined(); });
});
