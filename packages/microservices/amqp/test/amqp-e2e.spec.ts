import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST } from '@tsdi/common';
import { provideService, withServiceRouter, Controller, Get, Post, RouteMapping, RequestBody, Handle, Subscribe, Payload } from '@tsdi/service';
import { withAmqpTransport } from '../src/server';
import { withAmqpClientTransport, AmqpClient } from '../src/client';
import { provideClient } from '@tsdi/client';
import * as amqp from 'amqplib';
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

const AMQP_URL = 'amqp://127.0.0.1:5672?frameMax=16384';

describe('AMQP E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(withServiceRouter(),
                withAmqpTransport({ url: AMQP_URL, asDefault: true })),
            provideClient(
                withAmqpClientTransport({ url: AMQP_URL, microservice: true, asDefault: true }))
        ]
    })
    class AmqpMsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(AmqpMsModule);
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should get AmqpClient via ctx.get()', () => { expect(ctx.get(AmqpClient)).toBeDefined(); });
    it('should bootstrap AMQP with microservice:true', () => { expect(ctx).toBeDefined(); });
});

describe('AMQP E2E microservice:false', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(withServiceRouter(),
                withAmqpTransport({ microservice: false as any, url: AMQP_URL, asDefault: true })),
            provideClient(
                withAmqpClientTransport({ url: AMQP_URL, microservice: false, asDefault: true }))
        ]
    })
    class AmqpHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(AmqpHostModule);
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap AMQP with microservice:false', () => { expect(ctx).toBeDefined(); });
});

describe('AMQP @Controller', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [TestController],
        providers: [provideService(withServiceRouter(),
            withAmqpTransport({ url: AMQP_URL, asDefault: true }))]
    })
    class AmqpCtrlModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(AmqpCtrlModule);
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @Controller', () => { expect(ctx).toBeDefined(); });
});

describe('AMQP @RouteMapping', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [RouteCtrl],
        providers: [provideService(withServiceRouter(),
            withAmqpTransport({ url: AMQP_URL, asDefault: true }))]
    })
    class AmqpRouteModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(AmqpRouteModule);
        await new Promise(r => setTimeout(r, 1000));
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
    }

    @Module({
        imports: [LoggerModule],
        declarations: [AmqpE2eController],
        providers: [
            provideService(withServiceRouter(),
                withAmqpTransport({ url: AMQP_URL, routingKey: ROUTING_KEY, asDefault: true })),
            provideClient(
                withAmqpClientTransport({ url: AMQP_URL, microservice: true, asDefault: true }))
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
        await new Promise(r => setTimeout(r, 1000));
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

            setTimeout(() => reject(new Error('Timeout')), 10000);
        });

        expect(result).toBeDefined();
        expect(result).toBeDefined();
    });

    it('should preserve request method in envelope', async () => {
        const client = ctx.get(AmqpClient);
        const result = await lastValueFrom(client.send('/e2e/echo', { method: 'POST', payload: { value: 'hello' } }));
        expect(result.payload.received).toEqual({ value: 'hello' });
    });
});

// ----- microservice:false -----
describe('AMQP E2E with provideService + provideClient (microservice:false)', () => {
    const ROUTING_KEY = 'e2e.host.microservice';

    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(withServiceRouter(),
                withAmqpTransport({ microservice: false as any, url: AMQP_URL, routingKey: ROUTING_KEY, asDefault: true })),
            provideClient(
                withAmqpClientTransport({ url: AMQP_URL, microservice: false, asDefault: true }))
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
        await new Promise(r => setTimeout(r, 1000));
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

            setTimeout(() => reject(new Error('Timeout')), 10000);
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

    @Subscribe('sensor.*.start', undefined as any)
    subscribe(@Payload() msg: string) { return msg; }
}

describe('AMQP pattern routing', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [AmqpPatternService],
        providers: [
            provideService(withServiceRouter(),
                withAmqpTransport({
                    url: AMQP_URL
                })),
            provideClient(
                withAmqpClientTransport({ url: AMQP_URL, microservice: true, asDefault: true }))
        ]
    })
    class AmqpPatternModule { }

    let ctx: ApplicationContext;
    let client: AmqpClient;

    before(async () => {
        ctx = await Application.run(AmqpPatternModule);
        client = ctx.get(AmqpClient);
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('routes object cmd patterns', async () => {
        const result = await lastValueFrom(client.send({ cmd: 'echo' }, { payload: { msg: 'hello' } }));
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

describe('AMQP pattern routing with custom routingKey', () => {
    const ROUTING_KEY = 'custom.pattern.route';

    @Module({
        imports: [LoggerModule],
        declarations: [AmqpPatternService],
        providers: [
            provideService(withServiceRouter(),
                withAmqpTransport({
                    url: AMQP_URL,
                    routingKey: ROUTING_KEY
                })),
            provideClient(
                withAmqpClientTransport({
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
        await new Promise(r => setTimeout(r, 1000));
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('routes object cmd patterns with custom routingKey', async () => {
        const result = await lastValueFrom(client.send({ cmd: 'echo' }, { payload: { msg: 'hello' } }));
        expect(result.payload).toEqual('hello');
    });
});
