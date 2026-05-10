import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST } from '@tsdi/common';
import { provideService, withServiceRouter, Controller, Get, Post, RouteMapping, RequestBody } from '@tsdi/service';
import { withGrpcTransport } from '../src/server';
import { withGrpcClientTransport } from '../src/client';
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

const PORTS = { ms: 50052, host: 50053, ctrl: 50054, route: 50055 };

// ----- microservice:true -----
describe('gRPC E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withGrpcTransport({ port: PORTS.ms, asDefault: true })),
            ...provideClient(
                withGrpcClientTransport({ url: `localhost:${PORTS.ms}`, microservice: true, asDefault: true }))
        ]
    })
    class GrpcMsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(GrpcMsModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap gRPC with microservice:true', () => { expect(ctx).toBeDefined(); });
});

// ----- microservice:false -----
describe('gRPC E2E microservice:false', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withGrpcTransport({ microservice: false as any, port: PORTS.host, asDefault: true })),
            ...provideClient(
                withGrpcClientTransport({ url: `localhost:${PORTS.host}`, microservice: false, asDefault: true }))
        ]
    })
    class GrpcHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(GrpcHostModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap gRPC with microservice:false', () => { expect(ctx).toBeDefined(); });
});

// ----- @Controller / @Get / @Post -----
describe('gRPC @Controller / @Get / @Post', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [TestController],
        providers: [...provideService(withServiceRouter(),
            withGrpcTransport({ port: PORTS.ctrl, asDefault: true }))]
    })
    class GrpcCtrlModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(GrpcCtrlModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @Controller', () => { expect(ctx).toBeDefined(); });
});

// ----- @RouteMapping -----
describe('gRPC @RouteMapping', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [RouteCtrl],
        providers: [...provideService(withServiceRouter(),
            withGrpcTransport({ port: PORTS.route, asDefault: true }))]
    })
    class GrpcRouteModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(GrpcRouteModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @RouteMapping', () => { expect(ctx).toBeDefined(); });
});
