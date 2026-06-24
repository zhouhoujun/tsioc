import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST, Transport } from '@tsdi/common';
import { AuthOptions, provideService, useAuth, useRouter, Controller, Get, Post, RouteMapping, RequestBody, Handle, Subscribe, Payload } from '@tsdi/service';
import { useNatsTransport } from '../src/server';
import { provideClient, withTimeout } from '@tsdi/client';
import { withNatsTransport, NatsClient } from '../src/client';
import { connect, StringCodec, NatsConnection } from 'nats';
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

const NATS_URL = 'nats://127.0.0.1:4222';

interface AuthResultResponse {
    ok?: boolean;
    body?: { ok?: boolean; body?: { ok?: boolean }; payload?: { ok?: boolean } };
    payload?: { ok?: boolean; body?: { ok?: boolean }; payload?: { ok?: boolean } };
    statusCode?: number;
}

describe('NATS E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useNatsTransport({ url: NATS_URL, asDefault: true })),
            provideClient(
                withTimeout(),
                withNatsTransport({ url: NATS_URL, microservice: true, asDefault: true }))
        ]
    })
    class NatsMsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(NatsMsModule);
        
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should get NatsClient via ctx.get()', () => { expect(ctx.get(NatsClient)).toBeDefined(); });
    it('should bootstrap NATS with microservice:true', () => { expect(ctx).toBeDefined(); });
});

describe('NATS E2E microservice:false', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useNatsTransport({ microservice: false, url: NATS_URL, asDefault: true })),
            provideClient(
                withTimeout(),
                withNatsTransport({ url: NATS_URL, microservice: false, asDefault: true }))
        ]
    })
    class NatsHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(NatsHostModule);
        
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap NATS with microservice:false', () => { expect(ctx).toBeDefined(); });
});

describe('NATS @Controller', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [TestController],
        providers: [provideService(useRouter(),
            useNatsTransport({ url: NATS_URL, asDefault: true }))]
    })
    class NatsCtrlModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(NatsCtrlModule);
        
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @Controller', () => { expect(ctx).toBeDefined(); });
});

describe('NATS @RouteMapping', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [RouteCtrl],
        providers: [provideService(useRouter(),
            useNatsTransport({ url: NATS_URL, asDefault: true }))]
    })
    class NatsRouteModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(NatsRouteModule);
        
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @RouteMapping', () => { expect(ctx).toBeDefined(); });
});

// ----- NATS E2E request/response via native client -----
describe('NATS E2E with provideService + provideClient (microservice:true)', () => {
    const SUBJECT = 'e2e.test.ping';

    @Controller('/e2e/test')
    class NatsE2eController {
        @Get('/ping') ping() { return { result: 'pong' }; }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [NatsE2eController],
        providers: [
            provideService(useRouter(),
                useNatsTransport({ url: NATS_URL, subjects: [SUBJECT], asDefault: true })),
            provideClient(
                withTimeout(),
                withNatsTransport({ url: NATS_URL, microservice: true, asDefault: true }))
        ]
    })
    class NatsE2eModule { }

    let ctx: ApplicationContext;
    let nc: NatsConnection;
    const sc = StringCodec();

    before(async () => {
        ctx = await Application.run(NatsE2eModule);
        nc = await connect({ servers: NATS_URL });
        
    });
    after(async () => {
        if (nc) await nc.drain();
        if (ctx) await ctx.destroy();
    });

    it('should bootstrap with provideService and provideClient', () => {
        expect(ctx).toBeDefined();
    });

    it('should handle request and respond via NATS', async () => {
        const msg = await nc.request(SUBJECT, sc.encode(JSON.stringify({
            url: '/e2e/test/ping',
            method: 'GET'
        })), { timeout: 1000 });
        const response = JSON.parse(sc.decode(msg.data));
        expect(response).toEqual({
            payload: { result: 'pong' }
        });
    });
});

// ----- microservice:false -----
describe('NATS E2E with provideService + provideClient (microservice:false)', () => {
    const SUBJECT = 'e2e.host.ping';

    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useNatsTransport({ microservice: false, url: NATS_URL, subjects: [SUBJECT], asDefault: true })),
            provideClient(
                withTimeout(),
                withNatsTransport({ url: NATS_URL, microservice: false, asDefault: true }))
        ]
    })
    class NatsE2eHostModule { }

    let ctx: ApplicationContext;
    let nc: NatsConnection;
    const sc = StringCodec();

    before(async () => {
        ctx = await Application.run(NatsE2eHostModule);
        nc = await connect({ servers: NATS_URL });
        
    });
    after(async () => {
        if (nc) await nc.drain();
        if (ctx) await ctx.destroy();
    });

    it('should bootstrap with provideService and provideClient in host mode', () => {
        expect(ctx).toBeDefined();
    });

    it('should handle request in host mode', async () => {
        const msg = await nc.request(SUBJECT, sc.encode(JSON.stringify({
            url: '/test',
            method: 'GET'
        })), { timeout: 1000 });
        const response = JSON.parse(sc.decode(msg.data));
        expect(response).toEqual({
            payload: {
                statusCode: 404,
                statusMessage: 'Not Found'
            }
        });
    });
});

// ----- NATS pattern routing -----
class NatsPatternService {
    @Handle({ cmd: 'echo' })
    echo(@Payload() msg: string) { return msg; }

    @Handle('sensor.message.*')
    topic(@Payload() msg: string) { return msg; }

    @Subscribe('sensor.*.start', Transport.NATS)
    subscribe(@Payload() msg: string) { return msg; }
}

describe('NATS pattern routing', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [NatsPatternService],
        providers: [
            provideService(useRouter(),
                useNatsTransport({ url: 'nats://127.0.0.1:4222' })),
            provideClient(
                withTimeout(),
                withNatsTransport({ url: 'nats://127.0.0.1:4222', microservice: true, asDefault: true }))
        ]
    })
    class NatsPatternModule { }

    let ctx: ApplicationContext;
    let client: NatsClient;

    before(async () => {
        ctx = await Application.run(NatsPatternModule);
        client = ctx.get(NatsClient);
        
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('routes object cmd patterns', async () => {
        const result = await lastValueFrom<string>(client.send({ cmd: 'echo' }, {
            payload: { msg: 'hello' },
            timeout: 50
        }));
        expect(result).toEqual('hello');
    });

    it('routes wildcard topic patterns', async () => {
        const result = await lastValueFrom<string>(client.send('sensor.message.update', {
            payload: { msg: 'world' },
            timeout: 50
        }));
        expect(result).toEqual('world');
    });

    it('routes subscribe patterns with wildcard', async () => {
        const result = await lastValueFrom<string>(client.send('sensor.temp.start', {
            payload: { msg: 'foo' },
            timeout: 50
        }));
        expect(result).toEqual('foo');
    });
});

describe('NATS auth E2E', () => {
    const SUBJECT = 'e2e.auth.ping';
    const authOptions: AuthOptions = { bearerToken: 'secret-token' };

    @Controller('/secure')
    class NatsSecureController {
        @Get('/ping') ping() { return { ok: true }; }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [NatsSecureController],
        providers: [
            provideService(
                useRouter(),
                useAuth(authOptions),
                useNatsTransport({ url: NATS_URL, subjects: [SUBJECT], asDefault: true })
            ),
            provideClient(
                withTimeout(),
                withNatsTransport({ url: NATS_URL, microservice: true, asDefault: true })
            )
        ]
    })
    class NatsAuthModule { }

    let ctx: ApplicationContext;
    let nc: NatsConnection;
    const sc = StringCodec();

    before(async () => {
        ctx = await Application.run(NatsAuthModule);
        nc = await connect({ servers: NATS_URL });
    });

    after(async () => {
        if (nc) await nc.drain();
        if (ctx) await ctx.destroy();
    });

    it('accepts requests with bearer token', async () => {
        const msg = await nc.request(SUBJECT, sc.encode(JSON.stringify({
            url: '/secure/ping',
            method: 'GET',
            headers: { authorization: 'Bearer secret-token' }
        })), { timeout: 1500 });
        const response = JSON.parse(sc.decode(msg.data)) as AuthResultResponse;
        const ok = response.ok
            ?? response.body?.ok
            ?? response.payload?.ok
            ?? response.body?.body?.ok
            ?? response.body?.payload?.ok
            ?? response.payload?.body?.ok
            ?? response.payload?.payload?.ok;
        expect(ok).toBe(true);
    });

    it('rejects requests without bearer token', async () => {
        const msg = await nc.request(SUBJECT, sc.encode(JSON.stringify({
            url: '/secure/ping',
            method: 'GET'
        })), { timeout: 1500 });
        const response = JSON.parse(sc.decode(msg.data)) as AuthResultResponse;
        expect(response.statusCode).toBe(401);
    });
});
