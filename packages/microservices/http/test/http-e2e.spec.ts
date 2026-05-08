import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST } from '@tsdi/common';
import { provideService, withServiceRouter, Controller, Get, Post, RouteMapping, RequestBody, MESSAGE_ROUTERS } from '@tsdi/service';
import { withHttpTransport } from '../src/server';
import { withHttpClientTransport } from '../src/client';
import { provideClient } from '@tsdi/client';
import expect = require('expect');
import * as http from 'node:http';
import * as http2 from 'node:http2';

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

const PORTS = { ms: 21200, host: 21201, ctrl: 21202, route: 21203, h2: 21204 };

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

    it('should register controller route', () => {
        const routers = ctx.get(MESSAGE_ROUTERS);
        expect(routers?.length).toBeGreaterThan(0);
        const patterns = routers[0].getPatterns();
        expect(patterns.routes).toContain('api/test');
    });

    it('should parse json body over http1', async () => {
        const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
            const req = http.request({
                host: '127.0.0.1',
                port: PORTS.ctrl,
                path: '/api/test/echo',
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'accept': 'application/json'
                }
            }, res => {
                let body = '';
                res.setEncoding('utf8');
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
            });
            req.on('error', reject);
            req.end(JSON.stringify({ hello: 'http1' }));
        });
        expect(response.status).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ received: { hello: 'http1' } });
    });
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

describe('HTTP/2 request handling', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [HttpTestController],
        providers: [...provideService(withServiceRouter(),
            withHttpTransport({ majorVersion: 2, listenOpts: { port: PORTS.h2, host: '127.0.0.1' }, asDefault: true }))]
    })
    class Http2Module { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(Http2Module);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should parse json body over http2', async () => {
        const client = http2.connect(`http://127.0.0.1:${PORTS.h2}`);
        const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
            const req = client.request({
                ':method': 'POST',
                ':path': '/api/test/echo',
                'content-type': 'application/json',
                'accept': 'application/json'
            });
            let body = '';
            req.setEncoding('utf8');
            req.on('response', headers => {
                req.on('data', chunk => body += chunk);
                req.on('end', () => resolve({ status: Number(headers[':status'] ?? 0), body }));
            });
            req.on('error', reject);
            req.end(JSON.stringify({ hello: 'http2' }));
        });
        client.close();
        expect(response.status).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ received: { hello: 'http2' } });
    });
});
