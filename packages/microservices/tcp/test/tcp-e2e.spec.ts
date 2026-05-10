import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST } from '@tsdi/common';
import { provideService, withServiceRouter, Controller, Get, Post, RouteMapping, RequestBody } from '@tsdi/service';
import { withTcpTransport } from '../src/server';
import { withTcpClientTransport } from '../src/client';
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

const PORTS = { ms: 11400, host: 11401, ctrl: 11402, route: 11403, client: 11404, hostClient: 11405 };

// ----- microservice:true -----
describe('TCP E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withTcpTransport({ listenOpts: { port: PORTS.ms, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withTcpClientTransport({ connectOpts: { port: PORTS.ms, host: '127.0.0.1' }, asDefault: true }))
        ]
    })
    class MsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(MsModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap', () => { expect(ctx).toBeDefined(); });
});

// ----- microservice:false -----
describe('TCP E2E microservice:false', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withTcpTransport({ microservice: false as any, listenOpts: { port: PORTS.host, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withTcpClientTransport({ connectOpts: { port: PORTS.host, host: '127.0.0.1' }, microservice: false, asDefault: true }))
        ]
    })
    class HostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(HostModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap', () => { expect(ctx).toBeDefined(); });
});

// ----- @Controller / @Get / @Post -----
describe('TCP @Controller / @Get / @Post', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [TestController],
        providers: [...provideService(withServiceRouter(),
            withTcpTransport({ listenOpts: { port: PORTS.ctrl, host: '127.0.0.1' }, asDefault: true }))]
    })
    class CtrlModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(CtrlModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap', () => { expect(ctx).toBeDefined(); });
});

// ----- @RouteMapping -----
describe('TCP @RouteMapping', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [RouteCtrl],
        providers: [...provideService(withServiceRouter(),
            withTcpTransport({ listenOpts: { port: PORTS.route, host: '127.0.0.1' }, asDefault: true }))]
    })
    class RouteModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(RouteModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap', () => { expect(ctx).toBeDefined(); });
});

// ----- provideService + provideClient (microservice:true) -----
describe('TCP E2E with provideService + provideClient (microservice:true)', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withTcpTransport({ listenOpts: { port: PORTS.client, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withTcpClientTransport({ connectOpts: { port: PORTS.client, host: '127.0.0.1' }, asDefault: true }))
        ]
    })
    class TcpClientModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(TcpClientModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('should bootstrap with provideService and provideClient', () => {
        expect(ctx).toBeDefined();
    });
});

// ----- provideService + provideClient (microservice:false) -----
describe('TCP E2E with provideService + provideClient (microservice:false)', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withTcpTransport({ microservice: false as any, listenOpts: { port: PORTS.hostClient, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withTcpClientTransport({ connectOpts: { port: PORTS.hostClient, host: '127.0.0.1' }, microservice: false, asDefault: true }))
        ]
    })
    class TcpHostClientModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(TcpHostClientModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('should bootstrap with provideService and provideClient in host mode', () => {
        expect(ctx).toBeDefined();
    });
});
