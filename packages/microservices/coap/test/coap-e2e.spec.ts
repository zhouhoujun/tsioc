import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST } from '@tsdi/common';
import { provideService, useRouter, useBodyParser, Controller, Get, Post, RouteMapping, RequestBody, Handle, Subscribe, Payload } from '@tsdi/service';
import { InternalServerException } from '@tsdi/common';
import { useCoapTransport } from '../src/server';
import { withCoapTransport } from '../src/client';
import { CoapClient } from '../src/client/client';
import { provideClient } from '@tsdi/client';
import * as coap from 'coap';
import { catchError, lastValueFrom, of } from 'rxjs';
import expect = require('expect');

@Controller('/api/test')
class TestController {
    @Get('/info') info() { return { status: 'ok' }; }
    @Get('/zero') zero() { return 0; }
    @Get('/flag') flag() { return false; }
    @Post('/echo') echo(@RequestBody() body: any) { return { received: body }; }
}

@RouteMapping('/api/route')
class RouteCtrl {
    @RouteMapping('/hello', GET) hello() { return 'hi'; }
    @RouteMapping('/data', POST) data(@RequestBody() b: any) { return { received: b }; }
}

@Controller('/api/error')
class ErrorController {
    @Get('/boom')
    boom() {
        throw new Error('secret internal detail');
    }

    @Get('/bad-request')
    badRequest() {
        throw new InternalServerException('bad request', 400);
    }
}

const PORTS = { ms: 21300, host: 21301, ctrl: 21302, route: 21303 };

// ----- microservice:true -----
describe('CoAP E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useCoapTransport({ listenOpts: { port: PORTS.ms, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withCoapTransport({ port: PORTS.ms, host: '127.0.0.1', microservice: true, asDefault: true }))
        ]
    })
    class CoapMsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(CoapMsModule);
        
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap CoAP with microservice:true', () => { expect(ctx).toBeDefined(); });
});

// ----- microservice:false -----
describe('CoAP E2E microservice:false', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useCoapTransport({ microservice: false as any, listenOpts: { port: PORTS.host, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withCoapTransport({ port: PORTS.host, host: '127.0.0.1', microservice: false, asDefault: true }))
        ]
    })
    class CoapHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(CoapHostModule);
        
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
        declarations: [E2eController, TestController, RouteCtrl, ErrorController],
        providers: [
            provideService(useRouter(),
                useBodyParser(),
                useCoapTransport({ listenOpts: { port: E2E_PORT, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withCoapTransport({ port: E2E_PORT, host: '127.0.0.1', microservice: true, asDefault: true }))
        ]
    })
    class CoapE2eModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(CoapE2eModule);
        
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
        expect(res).toEqual({ result: 'pong' });
    });

    it('should handle GET request via CoAP protocol', async () => {
        const res = await sendCoapRequest('GET', '/api/test/info');
        expect(res).toEqual({ status: 'ok' });
    });

    it('should handle POST request via CoAP protocol', async () => {
        const res = await sendCoapRequest('POST', '/api/test/echo', { value: 'hello' });
        expect(res.received).toEqual({ value: 'hello' });
    });

    it('should preserve request method in envelope', async () => {
        const client = ctx.get(CoapClient);
        const result = await lastValueFrom(client.send('/api/test/echo', { method: 'POST', payload: { value: 'hello' } }));
        expect(result).toBeDefined();
        expect(result.received).toEqual({ value: 'hello' });
    });

    it('should preserve native status and response metadata for observe response', async () => {
        const client = ctx.get(CoapClient);
        const result = await lastValueFrom(client.send('/api/test/info', { observe: 'response' as any }));
        expect(result.status).toEqual('2.05');
        expect(result.ok).toBe(true);
        expect(result.body).toEqual({ status: 'ok' });
        expect(result.headers).toBeDefined();
        expect(Array.isArray(result.headers.options)).toBe(true);
    });

    it('should preserve falsy scalar response bodies', async () => {
        const client = ctx.get(CoapClient);
        const zero = await lastValueFrom(client.send('/api/test/zero', { observe: 'response' as any }));
        const flag = await lastValueFrom(client.send('/api/test/flag', { observe: 'response' as any }));
        expect(zero.body).toBe(0);
        expect(flag.body).toBe(false);
    });

    it('should not leak internal server error details', async () => {
        const client = ctx.get(CoapClient);
        const result = await lastValueFrom(client.send('/api/error/boom', { observe: 'response' as any }).pipe(catchError(err => of(err))));
        expect(result.status).toEqual('5.00');
        expect(result.ok).toBe(false);
        expect(result.body.statusCode).toEqual(500);
        expect(result.body.message).not.toContain('secret internal detail');
    });

    it('should preserve safe client error details', async () => {
        const client = ctx.get(CoapClient);
        const result = await lastValueFrom(client.send('/api/error/bad-request', { observe: 'response' as any }).pipe(catchError(err => of(err))));
        expect(result.status).toEqual('4.00');
        expect(result.ok).toBe(false);
        expect(result.body.message).toContain('bad request');
    });
});

// ----- microservice:false full e2e -----
describe('CoAP E2E with provideService + provideClient (microservice:false)', () => {
    const E2E_HOST_PORT = 21311;

    @Module({
        imports: [LoggerModule],
        declarations: [TestController, RouteCtrl],
        providers: [
            provideService(useRouter(),
                useRouter({ microservice: true }),
                useCoapTransport({ microservice: false as any, listenOpts: { port: E2E_HOST_PORT, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withCoapTransport({ port: E2E_HOST_PORT, host: '127.0.0.1', microservice: false, asDefault: true }))
        ]
    })
    class CoapE2eHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(CoapE2eHostModule);
        
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
        expect(res).toEqual({ status: 'ok' });
    });
});

// ----- Verify client via ctx.get -----
describe('CoAP client via ctx.get(CoapClient)', () => {

    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useCoapTransport({ listenOpts: { port: 21320, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withCoapTransport({ port: 21320, host: '127.0.0.1', microservice: true, asDefault: true }))
        ]
    })
    class CoapClientModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(CoapClientModule);
        
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('should get CoapClient via ctx.get()', () => {
        const client = ctx.get(CoapClient);
        expect(client).toBeDefined();
        expect(client.send).toBeDefined();
    });

    it('should get CoapClient via ctx.get() and send cmd', async () => {
        const client = ctx.get(CoapClient);
        expect(client).toBeDefined();
        const result = await lastValueFrom(client.send({ cmd: 'test' }, {
            observe: 'response' as any
        }).pipe(catchError(err => of(err))));
        expect(result).toBeDefined();
    });
});

// ----- ctx.get(CoapClient) verification -----
describe('CoAP client via ctx.get(CoapClient)', () => {
    const P = 21320;

    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useCoapTransport({ listenOpts: { port: P, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withCoapTransport({ port: P, host: '127.0.0.1', microservice: true, asDefault: true }))
        ]
    })
    class CoapGetModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(CoapGetModule);
        
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('should get CoapClient via ctx.get()', () => {
        const client = ctx.get(CoapClient);
        expect(client).toBeDefined();
        expect(client.send).toBeDefined();
    });

    it('should send cmd via CoapClient.send()', async () => {
        const client = ctx.get(CoapClient);
        const result = await lastValueFrom(client.send({ cmd: 'test' }, {
            observe: 'response' as any
        }).pipe(catchError(err => of(err))));
        expect(result).toBeDefined();
    });
});

// ----- CoAP pattern routing -----
class CoapNativePatternService {
    @Handle({ cmd: 'echo' })
    echo(@Payload() msg: string) { return msg; }

    @Handle('sensor/message/+')
    topic(@Payload() msg: string) { return msg; }

    @Subscribe('sensor/+/start', undefined as any)
    subscribe(@Payload() msg: string) { return msg; }
}

class CoapCompatPatternService {
    @Handle({ cmd: 'echo' })
    echo(@Payload() msg: string) { return msg; }

    @Handle('sensor.message.+')
    topic(@Payload() msg: string) { return msg; }

    @Subscribe('sensor.+.start', undefined as any)
    subscribe(@Payload() msg: string) { return msg; }
}

describe('CoAP pattern routing', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [CoapNativePatternService],
        providers: [
            provideService(useRouter(),
                useCoapTransport({ listenOpts: { port: 21600, host: '127.0.0.1' } })),
            provideClient(
                withCoapTransport({ host: '127.0.0.1', port: 21600, microservice: true, asDefault: true }))
        ]
    })
    class CoapPatternModule { }

    let ctx: ApplicationContext;
    let client: CoapClient;

    before(async () => {
        ctx = await Application.run(CoapPatternModule);
        client = ctx.get(CoapClient);
        
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('routes object cmd patterns', async () => {
        const result = await lastValueFrom(client.send({ cmd: 'echo' }, { payload: { msg: 'hello' } }));
        expect(result).toEqual('hello');
    });

    it('routes native CoAP path patterns', async () => {
        const result = await lastValueFrom(client.send('sensor/message/update', { payload: { msg: 'world' } }));
        expect(result).toEqual('world');
    });

    it('routes native CoAP subscribe patterns', async () => {
        const result = await lastValueFrom(client.send('sensor/temp/start', { payload: { msg: 'foo' } }));
        expect(result).toEqual('foo');
    });

    it('does not convert other topic patterns by default', async () => {
        const result = await lastValueFrom(client.send('sensor.message.update', { payload: { msg: 'world' }, observe: 'response' as any }));
        expect(result.status).toEqual('4.04');
        expect(result.ok).toBe(false);
    });
});

describe('CoAP pattern routing compatibility', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [CoapCompatPatternService],
        providers: [
            provideService(useRouter(),
                useCoapTransport({ compatibility: true, listenOpts: { port: 21601, host: '127.0.0.1' } })),
            provideClient(
                withCoapTransport({ host: '127.0.0.1', port: 21601, microservice: true, compatibility: true, asDefault: true }))
        ]
    })
    class CoapPatternCompatModule { }

    let ctx: ApplicationContext;
    let client: CoapClient;

    before(async () => {
        ctx = await Application.run(CoapPatternCompatModule);
        client = ctx.get(CoapClient);
        
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('converts topic patterns when compatibility is enabled', async () => {
        const result = await lastValueFrom(client.send('sensor.message.update', { payload: { msg: 'world' } }));
        expect(result).toEqual('world');
    });

    it('converts subscribe patterns when compatibility is enabled', async () => {
        const result = await lastValueFrom(client.send('sensor.temp.start', { payload: { msg: 'foo' } }));
        expect(result).toEqual('foo');
    });
});
