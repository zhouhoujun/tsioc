import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST, Transport } from '@tsdi/common';
import { AuthOptions, provideService, useAuth, useRouter, Controller, Get, Post, RouteMapping, RequestBody, RequestHeader, RequestParam, RequestPath, Handle, Subscribe, Payload } from '@tsdi/service';
import { useUdpTransport } from '../src/server';
import { withUdpTransport, UdpClient } from '../src/client';
import { provideClient, withTimeout } from '@tsdi/client';
import * as dgram from 'node:dgram';
import expect = require('expect');
import { lastValueFrom, of, take, toArray } from 'rxjs';

interface UdpEnvelope {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    body?: unknown;
    payload?: unknown;
}

interface AuthResultResponse {
    ok?: boolean;
    body?: { ok?: boolean };
    payload?: { ok?: boolean };
    statusCode?: number;
    statusMessage?: string;
    message?: string;
}

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
                withTimeout(),
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
                useUdpTransport({ microservice: false, listenOpts: { port: PORTS.host, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withTimeout(),
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
                withTimeout(),
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
            }, 500);
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
                useUdpTransport({ microservice: false, features: { defaultTransfer: undefined }, listenOpts: { port: PORTS.hostE2e, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withTimeout(),
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
            }, 500);
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
                useUdpTransport({ microservice: false, features: { defaultTransfer: undefined }, listenOpts: { port: MATRIX_PORT, host: '127.0.0.1' }, asDefault: true }))
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
            }, 500);
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

    @Handle({ cmd: 'emit' })
    emitOnly() { return null; }

    @Handle({ cmd: 'stream' })
    stream(@Payload() msg: any) {
        const value = typeof msg === 'object' && msg !== null ? msg.msg : msg;
        return of(`${value}-1`, `${value}-2`, `${value}-3`);
    }

    @Handle('sensor.message.+')
    topic(@Payload() msg: string) { return msg; }

    @Subscribe('sensor.+.start', Transport.UDP)
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
                withTimeout(),
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
        const result = await lastValueFrom<string>(client.send({ cmd: 'echo' }, { payload: { msg: 'hello' }, timeout: 50 }));
        console.log('udp cmd result:', result);
        expect(result).toEqual('hello');
    });

    it('returns ResponseEventPacket for emit observe', async () => {
        const result = await lastValueFrom(client.send({ cmd: 'emit' }, {
            observe: 'events',
            payload: { msg: 'hello' },
            timeout: 50
        } as any));
        expect(result).toEqual({ type: 0 });
    });

    it('streams multiple values for observe until unsubscribe', async () => {
        const result = await lastValueFrom(client.send({ cmd: 'stream' }, {
            observe: 'observe',
            payload: { msg: 'hello' },
            timeout: 100
        } as any).pipe(take(2), toArray()));
        expect(result).toEqual(['hello-1', 'hello-2']);
    });

    it('routes wildcard topic patterns', async () => {
        const result = await lastValueFrom<string>(client.send('sensor.message.update', { payload: { msg: 'world' }, timeout: 50 }));
        expect(result).toEqual('world');
    });

    it('routes subscribe patterns with wildcard', async () => {
        const result = await lastValueFrom<string>(client.send('sensor.temp.start', { payload: { msg: 'foo' }, timeout: 50 }));
        expect(result).toEqual('foo');
    });
});

describe('UDP auth E2E', () => {
    const AUTH_PORT = 21130;
    const authOptions: AuthOptions = { bearerToken: 'secret-token' };

    @Controller('/secure')
    class UdpSecureController {
        @Get('/ping')
        ping() { return { ok: true }; }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [UdpSecureController],
        providers: [
            provideService(
                useRouter(),
                useAuth(authOptions),
                useUdpTransport({
                    microservice: false,
                    features: { defaultTransfer: undefined },
                    listenOpts: { port: AUTH_PORT, host: '127.0.0.1' },
                    asDefault: true
                })
            ),
            provideClient(
                withTimeout(),
                withUdpTransport({ port: AUTH_PORT, host: '127.0.0.1', microservice: false, asDefault: true })
            )
        ]
    })
    class UdpAuthModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(UdpAuthModule);
    });

    after(async () => { if (ctx) await ctx.destroy(); });

    function sendUdpAuthMessage(data: UdpEnvelope): Promise<AuthResultResponse> {
        return new Promise((resolve, reject) => {
            const client = dgram.createSocket('udp4');
            const payload = Buffer.from(JSON.stringify(data));
            const timer = setTimeout(() => {
                try { client.close(); } catch { }
                reject(new Error('Timeout'));
            }, 1000);

            client.send(payload, AUTH_PORT, '127.0.0.1', (err) => {
                if (err) {
                    clearTimeout(timer);
                    try { client.close(); } catch { }
                    reject(err);
                }
            });

            client.on('message', (msg) => {
                clearTimeout(timer);
                try { client.close(); } catch { }
                resolve(JSON.parse(msg.toString()) as AuthResultResponse);
            });

            client.on('error', (err) => {
                clearTimeout(timer);
                try { client.close(); } catch { }
                reject(err);
            });
        });
    }

    it('accepts requests with bearer token', async () => {
        const result = await sendUdpAuthMessage({
            url: '/secure/ping',
            method: 'GET',
            headers: { authorization: 'Bearer secret-token' }
        });
        expect(result.ok ?? result.body?.ok ?? result.payload?.ok).toBe(true);
    });

    it('rejects requests without bearer token', async () => {
        const result = await sendUdpAuthMessage({
            url: '/secure/ping',
            method: 'GET'
        });
        expect(result.statusCode).toBe(401);
        expect(result.statusMessage ?? result.message).toContain('Unauthorized');
    });
});
