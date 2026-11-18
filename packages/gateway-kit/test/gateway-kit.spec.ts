import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { GatewayRouter } from '../src/router';
import { GatewayRateLimiter } from '../src/rate-limit';
import { gatewayErrorBody, sendGatewayError } from '../src/error';
import { applyGatewayCorsHeaders, handleGatewayCorsPreflight } from '../src/cors';
import { serveGatewayStaticFile, resolveGatewayStaticPath } from '../src/static';
import { buildGatewayOpenApi } from '../src/openapi';

@Suite('gateway kit router')
export class GatewayKitRouterTest {
    @Test('matches params and prefers static segments over params and wildcards')
    specificity() {
        const router = new GatewayRouter<string>();
        router.add({ method: 'GET', path: '/api/sessions/*', handler: 'wildcard' });
        router.add({ method: 'GET', path: '/api/sessions/:id', handler: 'param' });
        router.add({ method: 'GET', path: '/api/sessions/active', handler: 'static' });

        expect(router.match('GET', '/api/sessions/active')?.route.handler).toEqual('static');
        expect(router.match('GET', '/api/sessions/s1')).toEqual({
            route: expect.objectContaining({ handler: 'param' }),
            params: { id: 's1' }
        });
        expect(router.match('GET', '/api/sessions/s1/messages')?.params['*']).toEqual('s1/messages');
    }

    @Test('honours methods, explicit priority and declaration order')
    priority() {
        const router = new GatewayRouter<string>();
        router.add({ method: 'GET', path: '/a/:x', handler: 'first' });
        router.add({ method: 'GET', path: '/a/:y', handler: 'second' });
        router.add({ method: 'POST', path: '/a/:x', handler: 'post' });
        router.add({ method: 'GET', path: '/a/b', handler: 'boosted', priority: 100000 });

        expect(router.match('GET', '/a/b')?.route.handler).toEqual('boosted');
        expect(router.match('GET', '/a/c')?.route.handler).toEqual('first');
        expect(router.match('POST', '/a/c')?.route.handler).toEqual('post');
        expect(router.match('DELETE', '/a/c')).toEqual(null);
    }
}

@Suite('gateway kit rate limiter')
export class GatewayKitRateLimitTest {
    @Test('allows within the window and reports retry-after when blocked')
    window() {
        const limiter = new GatewayRateLimiter({ limit: 2, windowMs: 60000 });
        try {
            expect(limiter.check('ip').allowed).toEqual(true);
            expect(limiter.check('ip').allowed).toEqual(true);
            const blocked = limiter.check('ip');
            expect(blocked.allowed).toEqual(false);
            expect(blocked.count).toEqual(2);
            expect(blocked.reason).toEqual('limit');
            expect(limiter.retryAfterSeconds(blocked)).toBeGreaterThanOrEqual(1);
            expect(limiter.check('other').allowed).toEqual(true);
        } finally {
            limiter.dispose();
        }
    }

    @Test('uses the shared store when configured')
    async sharedStore() {
        const counts = new Map<string, number>();
        const limiter = new GatewayRateLimiter({ limit: 1, windowMs: 60000 }, {
            store: {
                increment: async (key: string) => {
                    const count = (counts.get(key) || 0) + 1;
                    counts.set(key, count);
                    return { count, resetAt: Date.now() + 60000 };
                }
            }
        });
        try {
            expect((await limiter.checkShared('route:ip')).allowed).toEqual(true);
            expect((await limiter.checkShared('route:ip')).allowed).toEqual(false);
        } finally {
            limiter.dispose();
        }
    }
}

@Suite('gateway kit error envelopes and cors')
export class GatewayKitErrorCorsTest {
    @Test('keeps the legacy string body and supports the structured envelope')
    envelopes() {
        expect(gatewayErrorBody(404, 'not found', { extra: { path: '/x' } }))
            .toEqual({ error: 'not found', path: '/x' });
        expect(gatewayErrorBody(429, 'slow down', { legacy: false })).toEqual({
            error: { code: 'rate_limited', message: 'slow down', type: 'rate_limited' }
        });
        const headers: Record<string, any> = {};
        let status = 0;
        sendGatewayError({ writeHead: (code: number) => { status = code; }, end: () => undefined } as any, 401, 'no', {
            legacy: false, errorTypeHeader: true
        });
        expect(status).toEqual(401);
        void headers;
    }

    @Test('writes CORS headers and answers preflight')
    corsHeaders() {
        const headers: Record<string, any> = {};
        applyGatewayCorsHeaders({ setHeader: (name: string, value: string) => { headers[name] = value; } } as any, { origins: ['https://a.example'] });
        expect(headers['Access-Control-Allow-Origin']).toEqual('https://a.example');
        expect(headers['Access-Control-Allow-Methods']).toContain('POST');

        let status = 0;
        let ended = false;
        const handled = handleGatewayCorsPreflight('OPTIONS', {
            setHeader: (name: string, value: string) => { headers[name] = value; },
            writeHead: (code: number) => { status = code; },
            end: () => { ended = true; }
        } as any);
        expect(handled).toEqual(true);
        expect(status).toEqual(204);
        expect(ended).toEqual(true);
        expect(handleGatewayCorsPreflight('GET', { writeHead: () => undefined, end: () => undefined } as any)).toEqual(false);
    }
}

@Suite('gateway kit static files and openapi')
export class GatewayKitStaticOpenApiTest {
    @Test('serves index.html, nested assets and refuses traversal')
    async staticFiles() {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gateway-kit-static-'));
        try {
            fs.writeFileSync(path.join(root, 'index.html'), '<html>ok</html>');
            fs.mkdirSync(path.join(root, 'assets'));
            fs.writeFileSync(path.join(root, 'assets', 'app.js'), 'console.log(1)');
            expect(resolveGatewayStaticPath(root, '/../../etc/passwd')).toEqual(null);
            expect(resolveGatewayStaticPath(root, '/')).toContain('index.html');

            const writes: any[] = [];
            const res = {
                writeHead: (code: number, headers: any) => { writes.push({ code, headers }); },
                end: (body: any) => { writes.push({ body }); }
            } as any;
            expect(await serveGatewayStaticFile({ method: 'GET' } as any, res, root, '/')).toEqual('served');
            expect(await serveGatewayStaticFile({ method: 'GET' } as any, res, root, '/assets/app.js')).toEqual('served');
            expect(await serveGatewayStaticFile({ method: 'GET' } as any, res, root, '/missing.js')).toEqual('missing');
            expect(writes[0].headers['Content-Type']).toContain('text/html');
            expect(writes[2].headers['Content-Type']).toContain('javascript');
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }

    @Test('derives OpenAPI paths, params and security from routes')
    openapi() {
        const document = buildGatewayOpenApi([
            { method: 'GET', path: '/health', auth: false },
            { method: 'GET', path: '/api/sessions/:id' }
        ], { title: 'Kit', version: '1.0.0', description: 'test' });
        expect(document.openapi).toEqual('3.1.0');
        expect(document.paths['/api/sessions/{id}'].get.parameters[0]).toEqual({
            name: 'id', in: 'path', required: true, schema: { type: 'string' }
        });
        expect(document.paths['/health'].get.security).toBeUndefined();
        expect(document.paths['/api/sessions/{id}'].get.security).toEqual([{ bearerAuth: [] }]);
    }

    @Test('prefix routes match longer paths and honour host/accept predicates')
    prefixAndPredicates() {
        const router = new GatewayRouter<string>();
        router.add({ method: 'GET', path: '/api/users', handler: 'prefix', matchMode: 'prefix' });
        router.add({ method: 'GET', path: '/api/users/:id', handler: 'param' });

        expect(router.match('GET', '/api/users/1')?.route.handler).toEqual('param');
        expect(router.match('GET', '/api/users/1/profile')).toEqual({
            route: expect.objectContaining({ handler: 'prefix' }),
            params: { '*': '1/profile' }
        });

        const canary = new GatewayRouter<string>();
        canary.add({ method: 'GET', path: '/api/a', handler: 'canary', hosts: ['a.example'] });
        expect(canary.match('GET', '/api/a', { host: 'b.example' })).toEqual(null);
        expect(canary.match('GET', '/api/a', { host: 'a.example' })?.route.handler).toEqual('canary');
        expect(canary.match('GET', '/api/a', { accept: () => false })).toEqual(null);
        expect(canary.match('GET', '/api/a', { accept: () => true })?.route.handler).toEqual('canary');
    }
}

@Suite('gateway kit robustness')
export class GatewayKitRobustnessTest {
    @Test('malformed percent-encoding cannot escape the static root')
    malformedPath() {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gateway-kit-static-'));
        try {
            expect(resolveGatewayStaticPath(root, '/%E0%A4%A')).toEqual(null);
            expect(resolveGatewayStaticPath(root, '/assets/%ZZ')).toEqual(null);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }

    @Test('rejections expose per-dimension reset times')
    resetAtPerReason() {
        const quota = new GatewayRateLimiter({ quota: { limit: 1, windowMs: 60000 } });
        try {
            expect(quota.check('k').allowed).toEqual(true);
            const blocked = quota.check('k');
            expect(blocked.allowed).toEqual(false);
            expect(blocked.reason).toEqual('quota');
            expect(blocked.resetAt).toBeGreaterThan(Date.now() + 55_000);
        } finally {
            quota.dispose();
        }
        const throttle = new GatewayRateLimiter({ throttle: { minIntervalMs: 60000 } });
        try {
            expect(throttle.check('k').allowed).toEqual(true);
            const blocked = throttle.check('k');
            expect(blocked.allowed).toEqual(false);
            expect(blocked.reason).toEqual('throttle');
            expect(blocked.retryAfterMs).toBeGreaterThan(55_000);
            expect(blocked.resetAt).toBeGreaterThan(Date.now() + 55_000);
        } finally {
            throttle.dispose();
        }
    }
}
