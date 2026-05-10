import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import expect = require('expect');
import { GET, POST } from '@tsdi/common';
import { provideService, withServiceRouter, Controller, Get, Post, RouteMapping, RequestBody } from '@tsdi/service';
import { withWsTransport } from '../src/server';
import { withWsClientTransport } from '../src/client';
import { provideClient } from '@tsdi/client';

const PORT = 11500;
const HOST_PORT = 11501;
const CTRL_PORT = 11502;
const ROUTE_PORT = 11503;
const E2E_PORT = 11510;
const E2E_HOST_PORT = 11511;

describe('WS E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [...provideService(withServiceRouter(),
            withWsTransport({ microservice: true, listenOpts: { port: PORT, host: '127.0.0.1' }, asDefault: true }))]
    })
    class WsMsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(WsMsModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap WS with microservice:true', () => { expect(ctx).toBeDefined(); });
});

describe('WS E2E microservice:false', () => {
    @Module({
        imports: [LoggerModule],
        providers: [...provideService(withServiceRouter(),
            withWsTransport({ microservice: false as any, listenOpts: { port: HOST_PORT, host: '127.0.0.1' }, asDefault: true }))]
    })
    class WsHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(WsHostModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap WS with microservice:false', () => { expect(ctx).toBeDefined(); });
});

describe('WS @Controller / @Get / @Post', () => {
    @Controller('/api')
    class WsTestController {
        @Get('/info') info() { return { status: 'ok' }; }
        @Post('/echo') echo(@RequestBody() body: any) { return { received: body }; }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [WsTestController],
        providers: [...provideService(withServiceRouter(),
            withWsTransport({ listenOpts: { port: CTRL_PORT, host: '127.0.0.1' }, asDefault: true }))]
    })
    class WsCtrlModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(WsCtrlModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @Controller', () => { expect(ctx).toBeDefined(); });
});

describe('WS @RouteMapping', () => {
    @RouteMapping('/ws-route')
    class WsRouteCtrl {
        @RouteMapping('/hello', GET) hello() { return 'hi'; }
        @RouteMapping('/data', POST) data(@RequestBody() b: any) { return { received: b }; }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [WsRouteCtrl],
        providers: [...provideService(withServiceRouter(),
            withWsTransport({ listenOpts: { port: ROUTE_PORT, host: '127.0.0.1' }, asDefault: true }))]
    })
    class WsRouteModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(WsRouteModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @RouteMapping', () => { expect(ctx).toBeDefined(); });
});

// ----- WS with provideService + provideClient (microservice:true) -----
describe('WS E2E with provideService + provideClient (microservice:true)', () => {
    @Controller('/api/ws')
    class WsE2eController {
        @Get('/ping') ping() { return { result: 'pong' }; }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [WsE2eController],
        providers: [
            ...provideService(withServiceRouter(),
                withWsTransport({ listenOpts: { port: E2E_PORT, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withWsClientTransport({ url: `ws://127.0.0.1:${E2E_PORT}`, microservice: true, asDefault: true }))
        ]
    })
    class WsE2eModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(WsE2eModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('should bootstrap with provideService and provideClient', () => {
        expect(ctx).toBeDefined();
    });
});

// ----- WS with provideService + provideClient (microservice:false) -----
describe('WS E2E with provideService + provideClient (microservice:false)', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withWsTransport({ microservice: false as any, listenOpts: { port: E2E_HOST_PORT, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withWsClientTransport({ url: `ws://127.0.0.1:${E2E_HOST_PORT}`, microservice: false, asDefault: true }))
        ]
    })
    class WsE2eHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(WsE2eHostModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('should bootstrap with provideService and provideClient in host mode', () => {
        expect(ctx).toBeDefined();
    });
});
