import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST, Transport } from '@tsdi/common';
import { AuthOptions, provideService, useAuth, useRouter, Controller, Get, Post, RouteMapping, RequestBody, Handle, Subscribe, Payload } from '@tsdi/service';
import { useAmqpTransport } from '../src/server';
import { withAmqpTransport, AmqpClient } from '../src/client';
import { provideClient, withTimeout } from '@tsdi/client';
import * as amqp from 'amqplib';
import expect = require('expect');
import { lastValueFrom } from 'rxjs';

interface AmqpAuthResponse {
    payload?: { ok?: boolean; error?: string; statusCode?: number };
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

const AMQP_URL = 'amqp://127.0.0.1:5672?frameMax=16384';

describe('AMQP E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useAmqpTransport({ url: AMQP_URL, asDefault: true })),
            provideClient(
                withTimeout(),
                withAmqpTransport({ url: AMQP_URL, microservice: true, asDefault: true }))
        ]
    })
    class AmqpMsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(AmqpMsModule);
        
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should get AmqpClient via ctx.get()', () => { expect(ctx.get(AmqpClient)).toBeDefined(); });
    it('should bootstrap AMQP with microservice:true', () => { expect(ctx).toBeDefined(); });
});

describe('AMQP E2E microservice:false', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useAmqpTransport({ microservice: false, url: AMQP_URL, asDefault: true })),
            provideClient(
                withTimeout(),
                withAmqpTransport({ url: AMQP_URL, microservice: false, asDefault: true }))
        ]
    })
    class AmqpHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(AmqpHostModule);
        
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap AMQP with microservice:false', () => { expect(ctx).toBeDefined(); });
});

describe('AMQP @Controller', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [TestController],
        providers: [provideService(useRouter(),
            useAmqpTransport({ url: AMQP_URL, asDefault: true }))]
    })
    class AmqpCtrlModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(AmqpCtrlModule);
        
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @Controller', () => { expect(ctx).toBeDefined(); });
});

describe('AMQP @RouteMapping', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [RouteCtrl],
        providers: [provideService(useRouter(),
            useAmqpTransport({ url: AMQP_URL, asDefault: true }))]
    })
    class AmqpRouteModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(AmqpRouteModule);
        
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @RouteMapping', () => { expect(ctx).toBeDefined(); });
});

// ----- AMQP E2E request/response via native client -----
describe('AMQP E2E with provideService + provideClient (microservice:true)', () => {
    const ROUTING_KEY = 'e2e.microservice';

    @Controller('/e2e')
    class AmqpE2eController {
        @Get('/ping') ping() { return { result: 'pong' }; }
        @Post('/echo') echo(@RequestBody() body: any) { return { received: body }; }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [AmqpE2eController],
        providers: [
            provideService(useRouter(),
                useAmqpTransport({ url: AMQP_URL, routingKey: ROUTING_KEY, asDefault: true })),
            provideClient(
                withTimeout(),
                withAmqpTransport({ url: AMQP_URL, microservice: true, asDefault: true }))
        ]
    })
    class AmqpE2eModule { }

    let ctx: ApplicationContext;
    let connection: amqp.Connection;
    let channel: amqp.Channel;

    before(async () => {
        ctx = await Application.run(AmqpE2eModule);
        connection = await amqp.connect(AMQP_URL);
        channel = await connection.createChannel();
        
    });
    after(async () => {
        if (channel) await channel.close();
        if (connection) await connection.close();
        if (ctx) await ctx.destroy();
    });

    it('should bootstrap with provideService and provideClient', () => {
        expect(ctx).toBeDefined();
    });

    it('should handle message and respond via AMQP RPC', async () => {
        const q = await channel.assertQueue('', { exclusive: true });
        const corrId = 'test-' + Date.now();

        const result = await new Promise<any>((resolve, reject) => {
            channel.consume(q.queue, (msg) => {
                if (msg && msg.properties.correlationId === corrId) {
                    try {
                        resolve(JSON.parse(msg.content.toString()));
                    } catch {
                        resolve(msg.content.toString());
                    }
                }
            }, { noAck: true });

            channel.publish('tsdi', ROUTING_KEY, Buffer.from(JSON.stringify({
                url: '/e2e/ping',
                method: 'GET'
            })), {
                replyTo: q.queue,
                correlationId: corrId
            });

            setTimeout(() => reject(new Error('Timeout')), 1000);
        });

        expect(result).toBeDefined();
        expect(result).toBeDefined();
    });

    it('should preserve request method in envelope', async () => {
        const client = ctx.get(AmqpClient);
        const result = await lastValueFrom(client.send('/e2e/echo', { method: 'POST', payload: { value: 'hello' } }));
        expect(result.received).toEqual({ value: 'hello' });
    });
});

// ----- microservice:false -----
describe('AMQP E2E with provideService + provideClient (microservice:false)', () => {
    const ROUTING_KEY = 'e2e.host.microservice';

    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useAmqpTransport({ microservice: false, url: AMQP_URL, routingKey: ROUTING_KEY, asDefault: true })),
            provideClient(
                withTimeout(),
                withAmqpTransport({ url: AMQP_URL, microservice: false, asDefault: true }))
        ]
    })
    class AmqpE2eHostModule { }

    let ctx: ApplicationContext;
    let connection: amqp.Connection;
    let channel: amqp.Channel;

    before(async () => {
        ctx = await Application.run(AmqpE2eHostModule);
        connection = await amqp.connect(AMQP_URL);
        channel = await connection.createChannel();
        
    });
    after(async () => {
        if (channel) await channel.close();
        if (connection) await connection.close();
        if (ctx) await ctx.destroy();
    });

    it('should bootstrap with provideService and provideClient in host mode', () => {
        expect(ctx).toBeDefined();
    });

    it('should handle request in host mode', async () => {
        const q = await channel.assertQueue('', { exclusive: true });
        const corrId = 'host-' + Date.now();

        const result = await new Promise<any>((resolve, reject) => {
            channel.consume(q.queue, (msg) => {
                if (msg && msg.properties.correlationId === corrId) {
                    try { resolve(JSON.parse(msg.content.toString())); } catch { resolve(msg.content.toString()); }
                }
            }, { noAck: true });

            channel.publish('tsdi', ROUTING_KEY, Buffer.from(JSON.stringify({
                url: '/test',
                method: 'GET'
            })), {
                replyTo: q.queue,
                correlationId: corrId
            });

            setTimeout(() => reject(new Error('Timeout')), 1000);
        });

        expect(result).toBeDefined();
    });
});

// ----- AMQP pattern routing -----
class AmqpPatternService {
    @Handle({ cmd: 'echo' })
    echo(@Payload() msg: string) { return msg; }

    @Handle('sensor.message.*')
    topic(@Payload() msg: string) { return msg; }

    @Subscribe('sensor.*.start', Transport.AMQP)
    subscribe(@Payload() msg: string) { return msg; }
}

describe('AMQP pattern routing', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [AmqpPatternService],
        providers: [
            provideService(useRouter(),
                useAmqpTransport({
                    url: AMQP_URL
                })),
            provideClient(
                withTimeout(),
                withAmqpTransport({ url: AMQP_URL, microservice: true, asDefault: true }))
        ]
    })
    class AmqpPatternModule { }

    let ctx: ApplicationContext;
    let client: AmqpClient;

    before(async () => {
        ctx = await Application.run(AmqpPatternModule);
        client = ctx.get(AmqpClient);
        
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('routes object cmd patterns', async () => {
        const result = await lastValueFrom<string>(client.send({ cmd: 'echo' }, { payload: { msg: 'hello' }, timeout: 50 }));
        expect(result).toEqual('hello');
    });

    it('routes wildcard topic patterns', async () => {
        const result = await lastValueFrom<string>(client.send('sensor.message.update', { payload: { msg: 'world' }, timeout: 500 }));
        expect(result).toEqual('world');
    });

    it('routes subscribe patterns with wildcard', async () => {
        const result = await lastValueFrom<string>(client.send('sensor.temp.start', { payload: { msg: 'foo' }, timeout: 50 }));
        expect(result).toEqual('foo');
    });
});

describe('AMQP pattern routing with custom routingKey', () => {
    const ROUTING_KEY = 'custom.pattern.route';

    @Module({
        imports: [LoggerModule],
        declarations: [AmqpPatternService],
        providers: [
            provideService(useRouter(),
                useAmqpTransport({
                    url: AMQP_URL,
                    routingKey: ROUTING_KEY
                })),
            provideClient(
                withTimeout(),
                withAmqpTransport({
                    url: AMQP_URL,
                    routingKey: ROUTING_KEY,
                    microservice: true,
                    asDefault: true
                }))
        ]
    })
    class AmqpPatternRoutingKeyModule { }

    let ctx: ApplicationContext;
    let client: AmqpClient;

    before(async () => {
        ctx = await Application.run(AmqpPatternRoutingKeyModule);
        client = ctx.get(AmqpClient);
        
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('routes object cmd patterns with custom routingKey', async () => {
        const result = await lastValueFrom<string>(client.send({ cmd: 'echo' }, { payload: { msg: 'hello' }, timeout: 50 }));
        expect(result).toEqual('hello');
    });
});

if (process.env.TSIO_TEST_AMQP) describe('AMQP auth E2E', () => {
    const ROUTING_KEY = 'e2e.auth.ping';
    const authOptions: AuthOptions = { bearerToken: 'secret-token' };

    @Controller('/secure')
    class AmqpSecureController {
        @Get('/ping')
        ping() { return { ok: true }; }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [AmqpSecureController],
        providers: [
            provideService(
                useRouter(),
                useAuth(authOptions),
                useAmqpTransport({ url: AMQP_URL, routingKey: ROUTING_KEY, asDefault: true })
            ),
            provideClient(
                withTimeout(),
                withAmqpTransport({ url: AMQP_URL, microservice: true, asDefault: true })
            )
        ]
    })
    class AmqpAuthModule { }

    let ctx: ApplicationContext;
    let connection: amqp.Connection;
    let channel: amqp.Channel;

    before(async () => {
        ctx = await Application.run(AmqpAuthModule);
        connection = await amqp.connect(AMQP_URL);
        channel = await connection.createChannel();
    });

    after(async () => {
        if (channel) await channel.close();
        if (connection) await connection.close();
        if (ctx) await ctx.destroy();
    });

    function requestAuth(payload: Record<string, unknown>): Promise<AmqpAuthResponse> {
        return new Promise(async (resolve, reject) => {
            const replyQueue = await channel.assertQueue('', { exclusive: true });
            const correlationId = `auth-${Date.now()}`;
            const timer = setTimeout(() => reject(new Error('Timeout')), 1500);

            await channel.consume(replyQueue.queue, (msg) => {
                if (!msg || msg.properties.correlationId !== correlationId) {
                    return;
                }
                clearTimeout(timer);
                resolve(JSON.parse(msg.content.toString()) as AmqpAuthResponse);
            }, { noAck: true });

            channel.publish('tsdi', ROUTING_KEY, Buffer.from(JSON.stringify(payload)), {
                replyTo: replyQueue.queue,
                correlationId
            });
        });
    }

    it('accepts requests with bearer token', async () => {
        const result = await requestAuth({
            url: '/secure/ping',
            method: 'GET',
            headers: { authorization: 'Bearer secret-token' }
        });
        expect(result.payload?.ok).toBe(true);
    });

    it('rejects requests without bearer token', async () => {
        const result = await requestAuth({
            url: '/secure/ping',
            method: 'GET'
        });
        expect(result.payload?.statusCode).toBe(401);
        expect(result.payload?.error).toContain('Unauthorized');
    });
});
