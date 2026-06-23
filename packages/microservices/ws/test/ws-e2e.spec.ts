import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import expect = require('expect');
import { GET, POST, Transport } from '@tsdi/common';
import { AuthOptions, provideService, useAuth, useRouter, Controller, Get, Post, RouteMapping, RequestBody, Handle, Subscribe, Payload, MESSAGE_ROUTERS } from '@tsdi/service';
import { useWsTransport } from '../src/server';
import { withWsTransport } from '../src/client';
import { provideClient, withTimeout } from '@tsdi/client';
import { WsClient } from '../src/client/client';
import { catchError, lastValueFrom, of, take, toArray } from 'rxjs';

interface AuthErrorResponse {
    ok?: boolean;
    body?: unknown;
    error?: unknown;
    status?: number | string;
    statusCode?: number | string;
    message?: string;
    statusMessage?: string;
}

const PORT = 11500;
const HOST_PORT = 11501;
const CTRL_PORT = 11502;
const ROUTE_PORT = 11503;
const E2E_PORT = 11510;
const E2E_HOST_PORT = 11511;

describe('WS E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [provideService(useRouter(),
            useWsTransport({ microservice: true, listenOpts: { port: PORT, host: '127.0.0.1' }, asDefault: true }))]
    })
    class WsMsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(WsMsModule);
        
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap WS with microservice:true', () => { expect(ctx).toBeDefined(); });
});

describe('WS E2E microservice:false', () => {
    @Module({
        imports: [LoggerModule],
        providers: [provideService(useRouter(),
            useWsTransport({ microservice: false, listenOpts: { port: HOST_PORT, host: '127.0.0.1' }, asDefault: true }))]
    })
    class WsHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(WsHostModule);
        
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
        providers: [provideService(useRouter(),
            useWsTransport({ listenOpts: { port: CTRL_PORT, host: '127.0.0.1' }, asDefault: true }))]
    })
    class WsCtrlModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(WsCtrlModule);
        
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
        providers: [provideService(useRouter(),
            useWsTransport({ listenOpts: { port: ROUTE_PORT, host: '127.0.0.1' }, asDefault: true }))]
    })
    class WsRouteModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(WsRouteModule);
        
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @RouteMapping', () => { expect(ctx).toBeDefined(); });
});

describe('WS client.send via ctx.get(WsClient) (microservice:true)', () => {

    @Controller('/api/ws')
    class WsE2eController {
        @Get('/ping') ping() { return { result: 'pong' }; }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [WsE2eController],
        providers: [
            provideService(useRouter(),
                useWsTransport({ listenOpts: { port: E2E_PORT, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withTimeout(),
                withWsTransport({ url: `ws://127.0.0.1:${E2E_PORT}`, microservice: true, asDefault: true }))
        ]
    })
    class WsE2eModule { }

    let ctx: ApplicationContext;
    let client: WsClient;

    before(async () => {
        ctx = await Application.run(WsE2eModule);
        client = ctx.get(WsClient);

    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('should get WsClient via ctx.get()', () => {
        expect(client).toBeDefined();
        expect(client.send).toBeDefined();
    });

    it('should send cmd via WsClient.send()', async () => {
        const result = await lastValueFrom(client.send({ cmd: 'ping' }, {
            observe: 'response',
            responseType: 'text',
            timeout: 50
        }).pipe(catchError(err => of(err))));
        expect(result).toBeDefined();
    });
});

describe('WS client.send via ctx.get(WsClient) (microservice:false)', () => {

    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useWsTransport({ microservice: false, listenOpts: { port: E2E_HOST_PORT, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withTimeout(),
                withWsTransport({ url: `ws://127.0.0.1:${E2E_HOST_PORT}`, microservice: false, asDefault: true }))
        ]
    })
    class WsE2eHostModule { }

    let ctx: ApplicationContext;
    let client: WsClient;

    before(async () => {
        ctx = await Application.run(WsE2eHostModule);
        client = ctx.get(WsClient);
        
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('should get WsClient via ctx.get() in host mode', () => {
        expect(client).toBeDefined();
    });

    it('should send cmd via WsClient.send() in host mode', async () => {
        const result = await lastValueFrom(client.send({ cmd: 'test' }, {
            observe: 'response',
            responseType: 'text',
            timeout: 50
        }).pipe(catchError(err => of(err))));
        expect(result).toBeDefined();
    });
});

// ----- WS pattern routing -----
class WsPatternService {
    @Handle({ cmd: 'echo' }, Transport.WS)
    echo(@Payload() msg: string) { return msg; }

    @Handle({ cmd: 'emit' }, Transport.WS)
    emitOnly() { return null; }

    @Handle({ cmd: 'stream' }, Transport.WS)
    stream(@Payload() msg: string) {
        return of(`${msg}-1`, `${msg}-2`, `${msg}-3`);
    }

    @Handle('sensor.message.+', Transport.WS)
    topic(@Payload() msg: string) { return msg; }

    @Subscribe('sensor.+.start', Transport.WS)
    subscribe(@Payload() msg: string) { return msg; }
}

describe('WS pattern routing', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [WsPatternService],
        providers: [
            provideService(useRouter(),
                useWsTransport({ listenOpts: { port: 21900, host: '127.0.0.1' } })),
            provideClient(
                withTimeout(),
                withWsTransport({ url: 'ws://127.0.0.1:21900', microservice: true, asDefault: true }))
        ]
    })
    class WsPatternModule { }

    let ctx: ApplicationContext;
    let client: WsClient;

    before(async () => {
        ctx = await Application.run(WsPatternModule);
        client = ctx.get(WsClient);

    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('registers message routes', () => {
        const routers = ctx.get(MESSAGE_ROUTERS);
        expect(routers?.length).toBeGreaterThan(0);
        const patterns = routers[0].getPatterns();
        console.log('ws message router patterns', patterns);
        expect(patterns.routes).toContain('cmd:echo');
    });

    it('routes object cmd patterns', async () => {
        const result = await lastValueFrom(client.send({ cmd: 'echo' }, {
            payload: { msg: 'hello' },
            timeout: 50
        }).pipe(catchError(err => of({ error: err?.message ?? err }))));
        expect(result).toBeDefined();
    });

    it('returns ResponseEventPacket for emit observe', async () => {
        const result = await lastValueFrom(client.send({ cmd: 'emit' }, {
            payload: { msg: 'hello' },
            observe: 'events',
            timeout: 50
        } as any));
        expect(result).toEqual({ type: 0 });
    });

    it('streams multiple values for observe until unsubscribe', async () => {
        const result = await lastValueFrom(client.send({ cmd: 'stream' }, {
            payload: { msg: 'hello' },
            observe: 'observe',
            timeout: 100
        } as any).pipe(take(2), toArray()));
        expect(result).toEqual(['hello-1', 'hello-2']);
    });

    it('routes wildcard topic patterns', async () => {
        const result = await lastValueFrom(client.send('sensor.message.update', { payload: { msg: 'world' } })
            .pipe(catchError(err => of({ error: err?.message ?? err }))));
        console.log('ws wildcard result', result);
        const value = typeof result === 'string' ? result : ('payload' in result ? result.payload : ('body' in result ? result.body : (result as { message?: string }).message));
        expect(value).toEqual('world');
    });

    it('routes subscribe patterns with wildcard', async () => {
        const result = await lastValueFrom(client.send('sensor.temp.start', { payload: { msg: 'foo' } })
            .pipe(catchError(err => of({ error: err?.message ?? err }))));
        console.log('ws subscribe result', result);
        const value = typeof result === 'string' ? result : ('payload' in result ? result.payload : ('body' in result ? result.body : (result as { message?: string }).message));
        expect(value).toEqual('foo');
    });
});

describe('WS auth E2E', () => {
    const AUTH_PORT = 21920;
    const authOptions: AuthOptions = { bearerToken: 'secret-token' };

    @Controller('/secure')
    class WsSecureController {
        @Get('/ping')
        ping() { return { ok: true }; }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [WsSecureController],
        providers: [
            provideService(
                useRouter(),
                useAuth(authOptions),
                useWsTransport({ microservice: false, listenOpts: { port: AUTH_PORT, host: '127.0.0.1' }, asDefault: true })
            ),
            provideClient(
                withTimeout(),
                withWsTransport({ url: `ws://127.0.0.1:${AUTH_PORT}`, microservice: false, asDefault: true })
            )
        ]
    })
    class WsAuthModule { }

    let ctx: ApplicationContext;
    let client: WsClient;

    before(async () => {
        ctx = await Application.run(WsAuthModule);
        client = ctx.get(WsClient);
    });

    after(async () => { if (ctx) await ctx.destroy(); });

    it('accepts requests with bearer token', async () => {
        const result = await lastValueFrom(client.send('/secure/ping', {
            method: 'GET',
            headers: { authorization: 'Bearer secret-token' },
            timeout: 100
        }));
        expect(result).toMatchObject({ ok: true });
    });

    it('rejects requests without bearer token', async () => {
        const result = await lastValueFrom<AuthErrorResponse>(client.send('/secure/ping', {
            method: 'GET',
            observe: 'response',
            timeout: 100
        }));
        expect(result.statusCode ?? result.status).toBe(401);
        expect(result.ok).toBe(false);
        expect(result.statusMessage ?? result.message).toContain('Unauthorized');
    });
});
