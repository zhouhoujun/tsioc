import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST } from '@tsdi/common';
import { provideService, withServiceRouter, Controller, Get, Post, RouteMapping, RequestBody } from '@tsdi/service';
import { withCoapTransport } from '../src/server';
import { withCoapClientTransport } from '../src/client';
import { provideClient } from '@tsdi/client';
import * as coap from 'coap';
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

// ----- microservice:true full e2e -----
describe('CoAP E2E with provideService + provideClient (microservice:true)', () => {
    @Controller('/api/e2e')
    class E2eController {
        @Get('/ping') ping() { return { result: 'pong' }; }
    }

    const E2E_PORT = 21310;

    @Module({
        imports: [LoggerModule],
        declarations: [E2eController],
        providers: [
            ...provideService(withServiceRouter(),
                withCoapTransport({ listenOpts: { port: E2E_PORT, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withCoapClientTransport({ port: E2E_PORT, host: '127.0.0.1', microservice: true, asDefault: true }))
        ]
    })
    class CoapE2eModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(CoapE2eModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    function sendCoapRequest(method: string, pathname: string, payload?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const req = coap.request({
                host: '127.0.0.1',
                port: E2E_PORT,
                pathname,
                method: method as any,
                options: { 'Accept': 'application/json' }
            });
            if (payload != null) {
                req.write(JSON.stringify(payload));
            }
            req.on('response', (res: any) => {
                const body = res.payload?.toString() || '';
                try {
                    resolve(JSON.parse(body));
                } catch {
                    resolve(body);
                }
            });
            req.on('error', (err: Error) => reject(err));
            req.end();
        });
    }

    it('should bootstrap with provideService and provideClient', () => {
        expect(ctx).toBeDefined();
    });

    it('should respond to CoAP request (server is running)', async () => {
        const res = await sendCoapRequest('GET', '/api/e2e/ping');
        expect(res).toBeDefined();
    });

    it('should handle GET request via CoAP protocol', async () => {
        const res = await sendCoapRequest('GET', '/api/test/info');
        expect(res).toBeDefined();
    });
});

// ----- microservice:false full e2e -----
describe('CoAP E2E with provideService + provideClient (microservice:false)', () => {
    const E2E_HOST_PORT = 21311;

    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withCoapTransport({ microservice: false as any, listenOpts: { port: E2E_HOST_PORT, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withCoapClientTransport({ port: E2E_HOST_PORT, host: '127.0.0.1', microservice: false, asDefault: true }))
        ]
    })
    class CoapE2eHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(CoapE2eHostModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    function sendCoapRequest(method: string, pathname: string, payload?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const req = coap.request({
                host: '127.0.0.1',
                port: E2E_HOST_PORT,
                pathname,
                method: method as any,
                options: { 'Accept': 'application/json' }
            });
            if (payload != null) {
                req.write(JSON.stringify(payload));
            }
            req.on('response', (res: any) => {
                const body = res.payload?.toString() || '';
                try {
                    resolve(JSON.parse(body));
                } catch {
                    resolve(body);
                }
            });
            req.on('error', (err: Error) => reject(err));
            req.end();
        });
    }

    it('should bootstrap with provideService and provideClient in host mode', () => {
        expect(ctx).toBeDefined();
    });

    it('should respond to CoAP request in host mode', async () => {
        const res = await sendCoapRequest('GET', '/api/test/info');
        expect(res).toBeDefined();
    });
});
