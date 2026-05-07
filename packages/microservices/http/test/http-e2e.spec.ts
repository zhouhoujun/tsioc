import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST, Transport } from '@tsdi/common';
import { provideService, withServiceRouter, Controller, Get, Post, RouteMapping, RequestBody } from '@tsdi/service';
import { withHttpTransport } from '../src/server';
import { withHttpClientTransport } from '../src/client';
import { provideClient } from '@tsdi/client';
import expect = require('expect');

@Controller('/api/test')
class HttpTestController {
    @Get('/info') info() { return { status: 'ok' }; }
    @Post('/echo') echo(@RequestBody() body: any) { return { received: body }; }
}

@RouteMapping('/api/route')
class HttpRouteCtrl {
    @RouteMapping('/hello', GET) hello() { return 'hi'; }
    @RouteMapping('/data', POST) data(@RequestBody() b: any) { return { received: b }; }
}

const PORTS = { ms: 21200, host: 21201, ctrl: 21202, route: 21203 };

describe('HTTP E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withHttpTransport({ listenOpts: { port: PORTS.ms, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withHttpClientTransport({ url: `http://127.0.0.1:${PORTS.ms}`, asDefault: true }))
        ]
    })
    class HttpMsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(HttpMsModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap HTTP with microservice:true', () => { expect(ctx).toBeDefined(); });
});

describe('HTTP E2E microservice:false', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withHttpTransport({ microservice: false as any, listenOpts: { port: PORTS.host, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withHttpClientTransport({ url: `http://127.0.0.1:${PORTS.host}`, microservice: false, asDefault: true }))
        ]
    })
    class HttpHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(HttpHostModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap HTTP with microservice:false', () => { expect(ctx).toBeDefined(); });
});

describe('HTTP @Controller / @Get / @Post', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [HttpTestController],
        providers: [...provideService(withServiceRouter(),
            withHttpTransport({ listenOpts: { port: PORTS.ctrl, host: '127.0.0.1' }, asDefault: true }))]
    })
    class HttpCtrlModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(HttpCtrlModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @Controller', () => { expect(ctx).toBeDefined(); });
});

describe('HTTP @RouteMapping', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [HttpRouteCtrl],
        providers: [...provideService(withServiceRouter(),
            withHttpTransport({ listenOpts: { port: PORTS.route, host: '127.0.0.1' }, asDefault: true }))]
    })
    class HttpRouteModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(HttpRouteModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @RouteMapping', () => { expect(ctx).toBeDefined(); });
});
