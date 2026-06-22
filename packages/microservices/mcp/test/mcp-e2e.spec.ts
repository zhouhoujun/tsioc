import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST } from '@tsdi/common';
import { AuthOptions, provideService, useAuth, useRouter, Controller, Get, Post, RouteMapping, RequestBody } from '@tsdi/service';
import { useMcpTransport } from '../src/server';
import { withMcpTransport, McpClient } from '../src/client';
import { provideClient } from '@tsdi/client';
import * as http from 'node:http';
import expect = require('expect');

interface JsonRpcResponse<T = unknown> {
    jsonrpc: '2.0';
    result?: T;
    error?: { code: number; message: string };
    id: number | null;
}

interface McpResultBody {
    ok?: boolean;
    statusCode?: number;
    statusMessage?: string;
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

const PORTS = { ms: 21400, host: 21401, ctrl: 21402, route: 21403, e2e: 21410, hostE2e: 21411 };

// ----- microservice:true -----
describe('MCP E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useMcpTransport({ listenOpts: { port: PORTS.ms, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withMcpTransport({ url: `http://127.0.0.1:${PORTS.ms}`, microservice: true, asDefault: true }))
        ]
    })
    class McpMsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(McpMsModule);
        
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
            provideService(useRouter(),
                useMcpTransport({ microservice: false, listenOpts: { port: PORTS.host, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withMcpTransport({ url: `http://127.0.0.1:${PORTS.host}`, microservice: false, asDefault: true }))
        ]
    })
    class McpHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(McpHostModule);
        
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
            provideService(useRouter(),
                useMcpTransport({ listenOpts: { port: PORTS.e2e, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withMcpTransport({ url: `http://127.0.0.1:${PORTS.e2e}`, microservice: true, asDefault: true }))
        ]
    })
    class McpE2eModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(McpE2eModule);
        
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    function sendJsonRpc<T>(method: string, params?: unknown, headers: Record<string, string> = {}): Promise<JsonRpcResponse<T>> {
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
                    'Content-Length': Buffer.byteLength(body),
                    ...headers
                }
            };
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    resolve(JSON.parse(data) as JsonRpcResponse<T>);
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
        const res = await sendJsonRpc<{ result: string }>('api.mcp.ping');
        expect(res).toBeDefined();
        expect(res.jsonrpc).toBe('2.0');
    });
});

// ----- microservice:false full e2e -----
describe('MCP E2E with provideService + provideClient (microservice:false)', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useMcpTransport({ microservice: false, listenOpts: { port: PORTS.hostE2e, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withMcpTransport({ url: `http://127.0.0.1:${PORTS.hostE2e}`, microservice: false, asDefault: true }))
        ]
    })
    class McpE2eHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(McpE2eHostModule);
        
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    function sendJsonRpc<T>(method: string, params?: unknown, headers: Record<string, string> = {}): Promise<JsonRpcResponse<T>> {
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
                    'Content-Length': Buffer.byteLength(body),
                    ...headers
                }
            };
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    resolve(JSON.parse(data) as JsonRpcResponse<T>);
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

describe('MCP auth E2E', () => {
    const AUTH_PORT = 21420;
    const authOptions: AuthOptions = { bearerToken: 'secret-token' };

    @Controller('/secure')
    class McpSecureController {
        @Get('/ping')
        ping() { return { ok: true }; }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [McpSecureController],
        providers: [
            provideService(
                useRouter(),
                useAuth(authOptions),
                useMcpTransport({ microservice: false, listenOpts: { port: AUTH_PORT, host: '127.0.0.1' }, asDefault: true })
            ),
            provideClient(
                withMcpTransport({ url: `http://127.0.0.1:${AUTH_PORT}`, microservice: false, asDefault: true })
            )
        ]
    })
    class McpAuthModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(McpAuthModule);
    });

    after(async () => { if (ctx) await ctx.destroy(); });

    function sendJsonRpc<T>(method: string, params?: unknown, headers: Record<string, string> = {}): Promise<JsonRpcResponse<T>> {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify({
                jsonrpc: '2.0',
                method,
                params,
                id: 1
            });
            const req = http.request({
                hostname: '127.0.0.1',
                port: AUTH_PORT,
                path: '/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                    ...headers
                }
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(JSON.parse(data) as JsonRpcResponse<T>));
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }

    it('accepts requests with bearer token', async () => {
        const result = await sendJsonRpc<McpResultBody>('secure.ping', undefined, {
            Authorization: 'Bearer secret-token'
        });
        expect(result.result?.statusCode).toBe(404);
        expect(result.result?.statusMessage).toContain('Not Found');
    });

    it('rejects requests without bearer token', async () => {
        const result = await sendJsonRpc('secure.ping');
        expect(result.error?.code).toBe(401);
        expect(result.error?.message).toContain('Unauthorized');
    });
});
