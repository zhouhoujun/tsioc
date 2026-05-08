import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { provideService, withServiceRouter, Controller, Get, MESSAGE_ROUTERS } from '@tsdi/service';
import { withHttpTransport } from '../src/server';
import { withHttpClientTransport } from '../src/client';
import { provideClient } from '@tsdi/client';
import { HttpClient } from '../src/client/client';
import { HttpRequest } from '../src/client/request';
import { lastValueFrom } from 'rxjs';
import * as http from 'node:http';
import * as http2 from 'node:http2';
import expect = require('expect');

@Controller('/api/test')
class HttpTestController {
    @Get('/info') info() { return { status: 'ok' }; }
}

const PORTS = { ms: 21200, host: 21201, ctrl: 21202, h2: 21204, h2client: 21205 };

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

describe('HTTP @Controller', () => {
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

    it('should handle GET via http1', async () => {
        const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
            const req = http.request({
                host: '127.0.0.1',
                port: PORTS.ctrl,
                path: '/api/test/info',
                method: 'GET',
                headers: { 'accept': 'application/json' }
            }, res => {
                let body = '';
                res.setEncoding('utf8');
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
            });
            req.on('error', reject);
            req.end();
        });
        expect(response.status).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
    });
});

describe('HTTP/2 over h2c (plaintext)', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [HttpTestController],
        providers: [...provideService(withServiceRouter(),
            withHttpTransport({ majorVersion: 2, listenOpts: { port: PORTS.h2, host: '127.0.0.1' }, asDefault: true }))]
    })
    class Http2Module { }

    let ctx: ApplicationContext;
    let http2Client: http2.ClientHttp2Session;

    before(async () => {
        ctx = await Application.run(Http2Module);
        await new Promise(r => setTimeout(r, 500));
        http2Client = http2.connect(`http://127.0.0.1:${PORTS.h2}`);
    });
    after(async () => {
        try { http2Client?.close(); } catch { /* ignore */ }
        if (ctx) await ctx.close();
    });

    function http2Request(method: string, path: string): Promise<{ status: number; body: string }> {
        return new Promise((resolve, reject) => {
            const req = http2Client.request({
                ':method': method,
                ':path': path,
                'accept': 'application/json'
            });
            const chunks: Buffer[] = [];
            const responseHeaders: http2.IncomingHttpHeaders = {};
            req.on('response', headers => { Object.assign(responseHeaders, headers); });
            req.on('data', chunk => chunks.push(Buffer.from(chunk)));
            req.on('end', () => {
                resolve({
                    status: Number(responseHeaders[':status'] ?? 0),
                    body: Buffer.concat(chunks).toString('utf8')
                });
            });
            req.on('error', reject);
            req.end();
        });
    }

    it('should handle GET over http2', async () => {
        const response = await http2Request('GET', '/api/test/info');
        expect(response.status).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
    });
});

describe('HTTP/2 via microservice client pipeline', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [HttpTestController],
        providers: [
            ...provideService(withServiceRouter(),
                withHttpTransport({ majorVersion: 2, listenOpts: { port: PORTS.h2client, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withHttpClientTransport({ authority: `http://127.0.0.1:${PORTS.h2client}`, asDefault: true }))
        ]
    })
    class Http2ClientModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(Http2ClientModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap HTTP/2 with client', () => { expect(ctx).toBeDefined(); });

    it('should send GET over HTTP/2 via microservice client', async () => {
        const client = ctx.get(HttpClient);
        const response: any = await lastValueFrom(client.send(
            new HttpRequest('/api/test/info', null, {
                method: 'GET',
                observe: 'response',
                responseType: 'json',
                headers: { 'accept': 'application/json' }
            })
        ));
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'ok' });
    });
});
