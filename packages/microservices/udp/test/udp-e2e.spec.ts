import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST } from '@tsdi/common';
import { provideService, useRouter, Controller, Get, Post, RouteMapping, RequestBody, RequestHeader, RequestParam, RequestPath, Handle, Subscribe, Payload } from '@tsdi/service';
import { useUdpTransport } from '../src/server';
import { withUdpTransport, UdpClient } from '../src/client';
import { provideClient } from '@tsdi/client';
import * as dgram from 'node:dgram';
import expect = require('expect');
import { lastValueFrom } from 'rxjs';

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

@Controller('/api/matrix')
class UdpMatrixController {
    @Get('/query')
    query(
        @RequestParam('page', { nullable: true }) page: number = 1,
        @RequestParam('sort', { nullable: true }) sort: string = 'name',
        @RequestHeader('accept', { nullable: true }) accept?: string,
    ) {
        return { page, sort, accept: accept ?? null };
    }

    @Get('/path/:id')
    path(@RequestPath('id') id: string) {
        return { id };
    }

    @Post('/body')
    body(@RequestBody() body: any) {
        return { received: body };
    }

    @Get('/falsy')
    falsy(@RequestParam('zero') zero: number = 0) {
        return { zero, ok: false, empty: '' };
    }
}

const PORTS = { ms: 21100, host: 21101, ctrl: 21102, route: 21103, e2e: 21110, hostE2e: 21111 };

// ----- microservice:true -----
describe('UDP E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useUdpTransport({ listenOpts: { port: PORTS.ms, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withUdpTransport({ port: PORTS.ms, host: '127.0.0.1', microservice: true, asDefault: true }))
        ]
    })
    class UdpMsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(UdpMsModule);
        
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should get UdpClient via ctx.get()', () => { expect(ctx.get(UdpClient)).toBeDefined(); });
    it('should bootstrap UDP with microservice:true', () => { expect(ctx).toBeDefined(); });
});

// ----- microservice:false -----
describe('UDP E2E microservice:false', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useUdpTransport({ microservice: false as any, listenOpts: { port: PORTS.host, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withUdpTransport({ port: PORTS.host, host: '127.0.0.1', microservice: false, asDefault: true }))
        ]
    })
    class UdpHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(UdpHostModule);
        
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap UDP with microservice:false', () => { expect(ctx).toBeDefined(); });
});

// ----- @Controller / @Get / @Post -----
describe('UDP @Controller / @Get / @Post', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [TestController],
        providers: [provideService(useRouter(),
            useUdpTransport({ listenOpts: { port: PORTS.ctrl, host: '127.0.0.1' }, asDefault: true }))]
    })
    class UdpCtrlModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(UdpCtrlModule);
        
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @Controller', () => { expect(ctx).toBeDefined(); });
});

// ----- @RouteMapping -----
describe('UDP @RouteMapping', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [RouteCtrl],
        providers: [provideService(useRouter(),
            useUdpTransport({ listenOpts: { port: PORTS.route, host: '127.0.0.1' }, asDefault: true }))]
    })
    class UdpRouteModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(UdpRouteModule);
        
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @RouteMapping', () => { expect(ctx).toBeDefined(); });
});

// ----- UDP E2E Request/Response -----
describe('UDP E2E with provideService + provideClient (microservice:true)', () => {
    @Controller('/api/udp')
    class UdpDataController {
        @Get('/ping') ping() { return { result: 'pong' }; }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [UdpDataController],
        providers: [
            provideService(useRouter(),
                useUdpTransport({ features: { defaultTransfer: undefined }, listenOpts: { port: PORTS.e2e, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withUdpTransport({ port: PORTS.e2e, host: '127.0.0.1', microservice: true, asDefault: true }))
        ]
    })
    class UdpE2eModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(UdpE2eModule);
        
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    function sendUdpMessage(data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const client = dgram.createSocket('udp4');
            const payload = Buffer.from(JSON.stringify(data));
            const timer = setTimeout(() => {
                try { client.close(); } catch { }
                reject(new Error('Timeout'));
            }, 5000);
            client.send(payload, PORTS.e2e, '127.0.0.1', (err) => {
                if (err) {
                    clearTimeout(timer);
                    try { client.close(); } catch { }
                    reject(err);
                    return;
                }
            });
            client.on('message', (msg) => {
                clearTimeout(timer);
                try { client.close(); } catch { }
                try {
                    resolve(JSON.parse(msg.toString()));
                } catch {
                    resolve(msg.toString());
                }
            });
            client.on('error', (err) => {
                clearTimeout(timer);
                try { client.close(); } catch { }
                reject(err);
            });
        });
    }

    it('should bootstrap with provideService and provideClient', () => {
        expect(ctx).toBeDefined();
    });

    it('should respond to UDP request (server is running)', async () => {
        const res = await sendUdpMessage({ url: '/api/udp/ping', method: 'GET' });
        expect(res).toBeDefined();
    });

    it('should handle GET via UDP', async () => {
        const res = await sendUdpMessage({ url: '/api/test/info', method: 'GET' });
        expect(res).toBeDefined();
    });
});

// ----- microservice:false full e2e -----
describe('UDP E2E with provideService + provideClient (microservice:false)', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useUdpTransport({ microservice: false as any, features: { defaultTransfer: undefined }, listenOpts: { port: PORTS.hostE2e, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withUdpTransport({ port: PORTS.hostE2e, host: '127.0.0.1', microservice: false, asDefault: true }))
        ]
    })
    class UdpE2eHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(UdpE2eHostModule);
        
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    function sendUdpMessage(data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const client = dgram.createSocket('udp4');
            const payload = Buffer.from(JSON.stringify(data));
            const timer = setTimeout(() => {
                try { client.close(); } catch { }
                reject(new Error('Timeout'));
            }, 5000);
            client.send(payload, PORTS.hostE2e, '127.0.0.1', (err) => {
                if (err) {
                    clearTimeout(timer);
                    try { client.close(); } catch { }
                    reject(err);
                    return;
                }
            });
            client.on('message', (msg) => {
                clearTimeout(timer);
                try { client.close(); } catch { }
                try {
                    resolve(JSON.parse(msg.toString()));
                } catch {
                    resolve(msg.toString());
                }
            });
            client.on('error', (err) => {
                clearTimeout(timer);
                try { client.close(); } catch { }
                reject(err);
            });
        });
    }

    it('should bootstrap with provideService and provideClient in host mode', () => {
        expect(ctx).toBeDefined();
    });

    it('should respond to UDP request in host mode', async () => {
        const res = await sendUdpMessage({ url: '/test', method: 'GET' });
        expect(res).toBeDefined();
    });
});

describe('UDP parameter coverage matrix', () => {
    const MATRIX_PORT = 21120;

    @Module({
        imports: [LoggerModule],
        declarations: [UdpMatrixController],
        providers: [
            provideService(useRouter(),
                useUdpTransport({ microservice: false as any, features: { defaultTransfer: undefined }, listenOpts: { port: MATRIX_PORT, host: '127.0.0.1' }, asDefault: true }))
        ]
    })
    class UdpMatrixModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(UdpMatrixModule);
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    function sendMatrix(data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const client = dgram.createSocket('udp4');
            const payload = Buffer.from(JSON.stringify(data));
            const timer = setTimeout(() => {
                try { client.close(); } catch { }
                reject(new Error('Timeout'));
            }, 5000);
            client.send(payload, MATRIX_PORT, '127.0.0.1', (err) => {
                if (err) {
                    clearTimeout(timer);
                    try { client.close(); } catch { }
                    reject(err);
                }
            });
            client.on('message', (msg) => {
                clearTimeout(timer);
                try { client.close(); } catch { }
                try { resolve(JSON.parse(msg.toString())); } catch { resolve(msg.toString()); }
            });
            client.on('error', (err) => {
                clearTimeout(timer);
                try { client.close(); } catch { }
                reject(err);
            });
        });
    }

    it('should resolve query params and header defaults', async () => {
        const res = await sendMatrix({ url: '/api/matrix/query', method: 'GET', query: { page: '2' }, headers: { accept: 'application/json' } });
        expect(res).toEqual({ page: 2, sort: 'name', accept: 'application/json' });
    });

    it('should resolve path params', async () => {
        const res = await sendMatrix({ url: '/api/matrix/path/abc', method: 'GET' });
        expect(res).toEqual({ id: 'abc' });
    });

    it('should resolve request body', async () => {
        const res = await sendMatrix({ url: '/api/matrix/body', method: 'POST', body: { value: 'hello' } });
        expect(res).toEqual({ received: { value: 'hello' } });
    });

    it('should preserve falsy response values', async () => {
        const res = await sendMatrix({ url: '/api/matrix/falsy', method: 'GET', query: { zero: '0' } });
        expect(res).toEqual({ zero: 0, ok: false, empty: '' });
    });
});

// ----- UDP pattern routing -----
class UdpPatternService {
    @Handle({ cmd: 'echo' })
    echo(@Payload() msg: string) { return msg; }

    @Handle('sensor.message.+')
    topic(@Payload() msg: string) { return msg; }

    @Subscribe('sensor.+.start', undefined as any)
    subscribe(@Payload() msg: string) { return msg; }
}

describe('UDP pattern routing', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [UdpPatternService],
        providers: [
            provideService(useRouter(),
                useUdpTransport({ listenOpts: { port: 21800, host: '127.0.0.1' } })),
            provideClient(
                withUdpTransport({ host: '127.0.0.1', port: 21800, microservice: true, asDefault: true }))
        ]
    })
    class UdpPatternModule { }

    let ctx: ApplicationContext;
    let client: UdpClient;

    before(async () => {
        ctx = await Application.run(UdpPatternModule);
        client = ctx.get(UdpClient);
        
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('routes object cmd patterns', async () => {
        const result = await lastValueFrom(client.send({ cmd: 'echo' }, { payload: { msg: 'hello' } }));
        console.log('udp cmd result:', result);
        expect(result.payload).toEqual('hello');
    });

    it('routes wildcard topic patterns', async () => {
        const result = await lastValueFrom(client.send('sensor.message.update', { payload: { msg: 'world' } }));
        expect(result.payload).toEqual('world');
    });

    it('routes subscribe patterns with wildcard', async () => {
        const result = await lastValueFrom(client.send('sensor.temp.start', { payload: { msg: 'foo' } }));
        expect(result.payload).toEqual('foo');
    });
});
