import { Module, Injectable } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST, Transport } from '@tsdi/common';
import { AuthOptions, provideService, useAuth, useRouter, Controller, Get, Post, RouteMapping, RequestBody, Handle, Payload } from '@tsdi/service';
import { useTcpTransport } from '../src/server';
import { withTcpTransport } from '../src/client';
import { provideClient, withTimeout } from '@tsdi/client';
import { TcpClient } from '../src/client/client';
import { catchError, lastValueFrom, of, take, toArray } from 'rxjs';
import expect = require('expect');

interface AuthErrorResponse {
    status?: number | string;
    statusCode?: number | string;
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

const PORTS = { ms: 3000, host: 3000, ctrl: 3000, route: 3000, client: 3000, hostClient: 3000 };

// ----- microservice:true -----
describe('TCP E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useRouter({ microservice: true }),
                useTcpTransport({ listenOpts: { port: PORTS.ms, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withTcpTransport({ connectOpts: { port: PORTS.ms, host: '127.0.0.1' }, asDefault: true }))
        ]
    })
    class MsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(MsModule);
        
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap', () => { expect(ctx).toBeDefined(); });
});

// ----- microservice:false -----
describe('TCP E2E microservice:false', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useRouter({ microservice: true }),
                useTcpTransport({ microservice: false, listenOpts: { port: PORTS.host, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withTcpTransport({ connectOpts: { port: PORTS.host, host: '127.0.0.1' }, microservice: false, asDefault: true }))
        ]
    })
    class HostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(HostModule);
        
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap', () => { expect(ctx).toBeDefined(); });
});

// ----- @Controller / @Get / @Post -----
describe('TCP @Controller / @Get / @Post', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [TestController],
        providers: [provideService(useRouter(),
                useRouter({ microservice: true }),
            useTcpTransport({ listenOpts: { port: PORTS.ctrl, host: '127.0.0.1' }, asDefault: true }))]
    })
    class CtrlModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(CtrlModule);
        
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap', () => { expect(ctx).toBeDefined(); });
});

// ----- @RouteMapping -----
describe('TCP @RouteMapping', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [RouteCtrl],
        providers: [provideService(useRouter(),
                useRouter({ microservice: true }),
            useTcpTransport({ listenOpts: { port: PORTS.route, host: '127.0.0.1' }, asDefault: true }))]
    })
    class RouteModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(RouteModule);
        
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap', () => { expect(ctx).toBeDefined(); });
});

// ----- TCP client.send via ctx.get(TcpClient) (microservice:true) -----
if (process.env.TSIO_TEST_TCP_MICRO) describe('TCP client.send via ctx.get(TcpClient) (microservice:true)', () => {
    @Injectable()
    class TcpEchoHandler {
        @Handle({ cmd: 'ping' }, Transport.TCP)
        ping() { return 'pong'; }

        @Handle({ cmd: 'emit' }, Transport.TCP)
        emitOnly() { return null; }

        @Handle({ cmd: 'echo' }, Transport.TCP)
        echo(@Payload('message') message: string) { return { echoed: { message } }; }

        @Handle({ cmd: 'stream' }, Transport.TCP)
        stream(@Payload('message') message: string) {
            return of(`${message}-1`, `${message}-2`, `${message}-3`);
        }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [TcpEchoHandler],
        providers: [
            provideService(useRouter(),
                useRouter({ microservice: true }),
                useTcpTransport({ listenOpts: { port: PORTS.client, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withTimeout(),
                withTcpTransport({ connectOpts: { port: PORTS.client, host: '127.0.0.1' }, asDefault: true }))
        ]
    })
    class TcpClientModule { }

    let ctx: ApplicationContext;
    let client: TcpClient;

    before(async () => {
        ctx = await Application.run(TcpClientModule);
        client = ctx.get(TcpClient);

    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('should get TcpClient via ctx.get()', () => {
        expect(client).toBeDefined();
        expect(client.send).toBeDefined();
    });

    it('should send ping cmd and receive pong via client.send()', async () => {
        const result = await lastValueFrom(client.send({ cmd: 'ping' }, {
            observe: 'response',
            responseType: 'text',
            timeout: 50
        }).pipe(catchError(err => of(err))));
        expect(result).toMatchObject({
            status: 200,
            ok: true,
            body: 'pong'
        });
    });

    it('should send echo cmd and receive echoed object', async () => {
        const testMsg = { message: 'hello tcp' };
        const result = await lastValueFrom(client.send({ cmd: 'echo' }, {
            observe: 'response',
            payload: testMsg,
            timeout: 50
        }).pipe(catchError(err => of(err))));
        expect(result).toMatchObject({
            status: 200,
            ok: true,
            body: { echoed: testMsg }
        });
    });

    it('should return ResponseEventPacket for emit observe', async () => {
        const result = await lastValueFrom(client.send({ cmd: 'emit' }, {
            observe: 'events',
            payload: { message: 'hello tcp' },
            timeout: 50
        } as any));
        expect(result).toEqual({ type: 0 });
    });

    it('should stream multiple values for observe until unsubscribe', async () => {
        const result = await lastValueFrom(client.send({ cmd: 'stream' }, {
            observe: 'observe',
            payload: { message: 'hello tcp' },
            timeout: 100
        } as any).pipe(take(2), toArray()));
        expect(result).toEqual(['hello tcp-1', 'hello tcp-2']);
    });
});

// ----- TCP with provideService + provideClient (microservice:false) -----
if (process.env.TSIO_TEST_TCP_MICRO) describe('TCP client.send via ctx.get(TcpClient) (microservice:false)', () => {
    @Controller('/host')
    class TcpHostHandler {
        @Get('/ping')
        ping() { return 'pong'; }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [TcpHostHandler],
        providers: [
            provideService(useRouter(),
                useRouter({ microservice: true }),
                useTcpTransport({ microservice: false, listenOpts: { port: PORTS.hostClient, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withTcpTransport({ connectOpts: { port: PORTS.hostClient, host: '127.0.0.1' }, microservice: false, asDefault: true }))
        ]
    })
    class TcpHostClientModule { }

    let ctx: ApplicationContext;
    let client: TcpClient;

    before(async () => {
        ctx = await Application.run(TcpHostClientModule);
        client = ctx.get(TcpClient);
        
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('should get TcpClient via ctx.get() in host mode', () => {
        expect(client).toBeDefined();
    });

    it('should send cmd and receive response in host mode', async () => {
        const result = await lastValueFrom(client.send('/host/ping', {
            observe: 'response',
            responseType: 'text'
        }).pipe(catchError(err => of(err))));
        expect(result).toMatchObject({
            status: 200,
            ok: true,
            body: 'pong'
        });
    });
});

if (process.env.TSIO_TEST_TCP_MICRO) describe('TCP auth E2E', () => {
    const AUTH_PORT = 3011;
    const authOptions: AuthOptions = { bearerToken: 'secret-token' };

    @Controller('/secure')
    class TcpSecureController {
        @Get('/ping')
        ping() {
            return { ok: true };
        }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [TcpSecureController],
        providers: [
            provideService(
                useRouter(),
                useAuth(authOptions),
                useTcpTransport({ microservice: false, listenOpts: { port: AUTH_PORT, host: '127.0.0.1' }, asDefault: true })
            ),
            provideClient(
                withTimeout(),
                withTcpTransport({ connectOpts: { port: AUTH_PORT, host: '127.0.0.1' }, microservice: false, asDefault: true })
            )
        ]
    })
    class TcpAuthModule { }

    let ctx: ApplicationContext;
    let client: TcpClient;

    before(async () => {
        ctx = await Application.run(TcpAuthModule);
        client = ctx.get(TcpClient);
    });

    after(async () => { if (ctx) await ctx.destroy(); });

    it('accepts requests with bearer token', async () => {
        const result = await lastValueFrom(client.send('/secure/ping', {
            headers: { authorization: 'Bearer secret-token' }
        }));
        expect(result.ok).toBe(true);
    });

    it('rejects requests without bearer token', async () => {
        const result = await lastValueFrom<AuthErrorResponse & { ok?: boolean; body?: any; status?: number | string }>(client.send('/secure/ping', {
            observe: 'response'
        }));
        expect(result).toMatchObject({
            status: 401,
            ok: false
        });
    });
});
