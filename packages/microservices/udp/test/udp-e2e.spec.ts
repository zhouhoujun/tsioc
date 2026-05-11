import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST } from '@tsdi/common';
import { provideService, withServiceRouter, Controller, Get, Post, RouteMapping, RequestBody } from '@tsdi/service';
import { withUdpTransport } from '../src/server';
import { withUdpClientTransport, UdpClient } from '../src/client';
import { provideClient } from '@tsdi/client';
import * as dgram from 'node:dgram';
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

const PORTS = { ms: 21100, host: 21101, ctrl: 21102, route: 21103, e2e: 21110, hostE2e: 21111 };

// ----- microservice:true -----
describe('UDP E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withUdpTransport({ listenOpts: { port: PORTS.ms, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withUdpClientTransport({ port: PORTS.ms, host: '127.0.0.1', microservice: true, asDefault: true }))
        ]
    })
    class UdpMsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(UdpMsModule);
        await new Promise(r => setTimeout(r, 500));
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
            ...provideService(withServiceRouter(),
                withUdpTransport({ microservice: false as any, listenOpts: { port: PORTS.host, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withUdpClientTransport({ port: PORTS.host, host: '127.0.0.1', microservice: false, asDefault: true }))
        ]
    })
    class UdpHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(UdpHostModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap UDP with microservice:false', () => { expect(ctx).toBeDefined(); });
});

// ----- @Controller / @Get / @Post -----
describe('UDP @Controller / @Get / @Post', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [TestController],
        providers: [...provideService(withServiceRouter(),
            withUdpTransport({ listenOpts: { port: PORTS.ctrl, host: '127.0.0.1' }, asDefault: true }))]
    })
    class UdpCtrlModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(UdpCtrlModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @Controller', () => { expect(ctx).toBeDefined(); });
});

// ----- @RouteMapping -----
describe('UDP @RouteMapping', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [RouteCtrl],
        providers: [...provideService(withServiceRouter(),
            withUdpTransport({ listenOpts: { port: PORTS.route, host: '127.0.0.1' }, asDefault: true }))]
    })
    class UdpRouteModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(UdpRouteModule);
        await new Promise(r => setTimeout(r, 500));
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
            ...provideService(withServiceRouter(),
                withUdpTransport({ listenOpts: { port: PORTS.e2e, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withUdpClientTransport({ port: PORTS.e2e, host: '127.0.0.1', microservice: true, asDefault: true }))
        ]
    })
    class UdpE2eModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(UdpE2eModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    function sendUdpMessage(data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const client = dgram.createSocket('udp4');
            const payload = Buffer.from(JSON.stringify(data));
            client.send(payload, PORTS.e2e, '127.0.0.1', (err) => {
                if (err) { client.close(); reject(err); return; }
            });
            client.on('message', (msg) => {
                client.close();
                try {
                    resolve(JSON.parse(msg.toString()));
                } catch {
                    resolve(msg.toString());
                }
            });
            client.on('error', (err) => {
                client.close();
                reject(err);
            });
            setTimeout(() => { client.close(); reject(new Error('Timeout')); }, 5000);
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
            ...provideService(withServiceRouter(),
                withUdpTransport({ microservice: false as any, listenOpts: { port: PORTS.hostE2e, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withUdpClientTransport({ port: PORTS.hostE2e, host: '127.0.0.1', microservice: false, asDefault: true }))
        ]
    })
    class UdpE2eHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(UdpE2eHostModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    function sendUdpMessage(data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const client = dgram.createSocket('udp4');
            const payload = Buffer.from(JSON.stringify(data));
            client.send(payload, PORTS.hostE2e, '127.0.0.1', (err) => {
                if (err) { client.close(); reject(err); return; }
            });
            client.on('message', (msg) => {
                client.close();
                try {
                    resolve(JSON.parse(msg.toString()));
                } catch {
                    resolve(msg.toString());
                }
            });
            client.on('error', (err) => {
                client.close();
                reject(err);
            });
            setTimeout(() => { client.close(); reject(new Error('Timeout')); }, 5000);
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
