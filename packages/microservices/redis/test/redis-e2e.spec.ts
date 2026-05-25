import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST } from '@tsdi/common';
import { provideService, withServiceRouter, Controller, Get, Post, RouteMapping, RequestBody } from '@tsdi/service';
import { withRedisTransport } from '../src/server';
import { withRedisClientTransport, RedisClient } from '../src/client';
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

const REDIS_URL = 'redis://127.0.0.1:6379';

describe('Redis E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(withServiceRouter(),
                withRedisTransport({ url: REDIS_URL, asDefault: true })),
            provideClient(
                withRedisClientTransport({ url: REDIS_URL, microservice: true, asDefault: true }))
        ]
    })
    class RedisMsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(RedisMsModule);
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should get RedisClient via ctx.get()', () => { expect(ctx.get(RedisClient)).toBeDefined(); });
    it('should bootstrap Redis with microservice:true', () => { expect(ctx).toBeDefined(); });
});

describe('Redis E2E microservice:false', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(withServiceRouter(),
                withRedisTransport({ microservice: false as any, url: REDIS_URL, asDefault: true })),
            provideClient(
                withRedisClientTransport({ url: REDIS_URL, microservice: false, asDefault: true }))
        ]
    })
    class RedisHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(RedisHostModule);
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap Redis with microservice:false', () => { expect(ctx).toBeDefined(); });
});

describe('Redis @Controller', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [TestController],
        providers: [provideService(withServiceRouter(),
            withRedisTransport({ url: REDIS_URL, asDefault: true }))]
    })
    class RedisCtrlModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(RedisCtrlModule);
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @Controller', () => { expect(ctx).toBeDefined(); });
});

describe('Redis @RouteMapping', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [RouteCtrl],
        providers: [provideService(withServiceRouter(),
            withRedisTransport({ url: REDIS_URL, asDefault: true }))]
    })
    class RedisRouteModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(RedisRouteModule);
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @RouteMapping', () => { expect(ctx).toBeDefined(); });
});
