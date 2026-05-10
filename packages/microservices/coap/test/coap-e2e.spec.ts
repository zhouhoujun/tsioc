import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST } from '@tsdi/common';
import { provideService, withServiceRouter, Controller, Get, Post, RouteMapping, RequestBody } from '@tsdi/service';
import { withCoapTransport } from '../src/server';
import { withCoapClientTransport } from '../src/client';
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

const PORTS = { ms: 21300, host: 21301, ctrl: 21302, route: 21303 };

// ----- microservice:true -----
describe('CoAP E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withCoapTransport({ listenOpts: { port: PORTS.ms, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withCoapClientTransport({ port: PORTS.ms, host: '127.0.0.1', microservice: true, asDefault: true }))
        ]
    })
    class CoapMsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(CoapMsModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap CoAP with microservice:true', () => { expect(ctx).toBeDefined(); });
});

// ----- microservice:false -----
describe('CoAP E2E microservice:false', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withCoapTransport({ microservice: false as any, listenOpts: { port: PORTS.host, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withCoapClientTransport({ port: PORTS.host, host: '127.0.0.1', microservice: false, asDefault: true }))
        ]
    })
    class CoapHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(CoapHostModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap CoAP with microservice:false', () => { expect(ctx).toBeDefined(); });
});

// ----- @Controller / @Get / @Post -----
describe('CoAP @Controller / @Get / @Post', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [TestController],
        providers: [...provideService(withServiceRouter(),
            withCoapTransport({ listenOpts: { port: PORTS.ctrl, host: '127.0.0.1' }, asDefault: true }))]
    })
    class CoapCtrlModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(CoapCtrlModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @Controller', () => { expect(ctx).toBeDefined(); });
});

// ----- @RouteMapping -----
describe('CoAP @RouteMapping', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [RouteCtrl],
        providers: [...provideService(withServiceRouter(),
            withCoapTransport({ listenOpts: { port: PORTS.route, host: '127.0.0.1' }, asDefault: true }))]
    })
    class CoapRouteModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(CoapRouteModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @RouteMapping', () => { expect(ctx).toBeDefined(); });
});
