import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST } from '@tsdi/common';
import { provideService, withServiceRouter, Controller, Get, Post, RouteMapping, RequestBody } from '@tsdi/service';
import { withMcpTransport } from '../src/server';
import { withMcpClientTransport, McpClient } from '../src/client';
import { provideClient } from '@tsdi/client';
import * as http from 'node:http';
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

const PORTS = { ms: 21400, host: 21401, ctrl: 21402, route: 21403, e2e: 21410, hostE2e: 21411 };

// ----- microservice:true -----
describe('MCP E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withMcpTransport({ listenOpts: { port: PORTS.ms, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withMcpClientTransport({ url: `http://127.0.0.1:${PORTS.ms}`, microservice: true, asDefault: true }))
        ]
    })
    class McpMsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(McpMsModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should get McpClient via ctx.get()', () => { expect(ctx.get(McpClient)).toBeDefined(); });
    it('should bootstrap MCP with microservice:true', () => { expect(ctx).toBeDefined(); });
});

// ----- microservice:false -----
describe('MCP E2E microservice:false', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withMcpTransport({ microservice: false as any, listenOpts: { port: PORTS.host, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withMcpClientTransport({ url: `http://127.0.0.1:${PORTS.host}`, microservice: false, asDefault: true }))
        ]
    })
    class McpHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(McpHostModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap MCP with microservice:false', () => { expect(ctx).toBeDefined(); });
});

// ----- MCP E2E Request/Response -----
describe('MCP E2E with provideService + provideClient (microservice:true)', () => {
    @Controller('/api/mcp')
    class McpDataController {
        @Get('/ping') ping() { return { result: 'pong' }; }
        @Post('/echo') echo(@RequestBody() body: any) { return { received: body }; }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [McpDataController],
        providers: [
            ...provideService(withServiceRouter(),
                withMcpTransport({ listenOpts: { port: PORTS.e2e, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withMcpClientTransport({ url: `http://127.0.0.1:${PORTS.e2e}`, microservice: true, asDefault: true }))
        ]
    })
    class McpE2eModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(McpE2eModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    function sendJsonRpc(method: string, params?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify({
                jsonrpc: '2.0',
                method,
                params,
                id: 1
            });
            const options = {
                hostname: '127.0.0.1',
                port: PORTS.e2e,
                path: '/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            };
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch {
                        resolve(data);
                    }
                });
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }

    it('should bootstrap with provideService and provideClient', () => {
        expect(ctx).toBeDefined();
    });

    it('should handle JSON-RPC request via HTTP POST', async () => {
        const res = await sendJsonRpc('api.mcp.ping');
        expect(res).toBeDefined();
        expect(res.jsonrpc).toBe('2.0');
    });
});

// ----- microservice:false full e2e -----
describe('MCP E2E with provideService + provideClient (microservice:false)', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            ...provideService(withServiceRouter(),
                withMcpTransport({ microservice: false as any, listenOpts: { port: PORTS.hostE2e, host: '127.0.0.1' }, asDefault: true })),
            ...provideClient(
                withMcpClientTransport({ url: `http://127.0.0.1:${PORTS.hostE2e}`, microservice: false, asDefault: true }))
        ]
    })
    class McpE2eHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(McpE2eHostModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    function sendJsonRpc(method: string, params?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify({
                jsonrpc: '2.0',
                method,
                params,
                id: 1
            });
            const options = {
                hostname: '127.0.0.1',
                port: PORTS.hostE2e,
                path: '/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            };
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch {
                        resolve(data);
                    }
                });
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }

    it('should bootstrap with provideService and provideClient in host mode', () => {
        expect(ctx).toBeDefined();
    });

    it('should handle JSON-RPC in host mode', async () => {
        const res = await sendJsonRpc('test.method');
        expect(res).toBeDefined();
        expect(res.jsonrpc).toBe('2.0');
    });
});
