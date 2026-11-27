import expect = require('expect');
import { of } from 'rxjs';
import { createInjector } from '@tsdi/ioc';
import { createRequestContext } from '@tsdi/common';
import { HTTP_RESPONSE, HttpMessageAdapter } from '@tsdi/http-microservice';
import { GatewayInterceptor } from '../src/gateway.interceptor';
import { GatewayRuntime } from '../src/gateway.runtime';
import { GATEWAY_LOCAL_PATHS } from '../src/gateway.options';

describe('Gateway excludePaths', () => {
    function createContext() {
        const adapter = {
            setHeader() { return this; },
            setStatus() { return this; },
            setPayload() { return this; },
            sendResponse() { return; }
        };
        const context = createRequestContext(createInjector());
        context.set(HttpMessageAdapter, adapter as any);
        context.set(HTTP_RESPONSE, {} as any);
        return context;
    }

    function request(path: string) {
        const headers = {};
        return {
            url: path,
            method: 'GET',
            headers,
            getHeader(name: string) {
                return (headers as any)[name];
            },
            socket: { remoteAddress: '127.0.0.1' }
        } as any;
    }

    function call(interceptor: GatewayInterceptor, path: string): Promise<any> {
        return new Promise((resolve, reject) => {
            interceptor.intercept(request(path), { handle: () => of('local') } as any, createContext())
                .subscribe({ next: resolve, error: reject });
        });
    }

    it('keeps excluded admin paths local even when a broad /api route exists', async () => {
        const original = globalThis.fetch;
        let fetches = 0;
        globalThis.fetch = (async () => {
            fetches += 1;
            return {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/json' }),
                async json() { return { upstream: true }; },
                async text() { return '{"upstream":true}'; }
            } as any;
        }) as any;
        try {
            const interceptor = new GatewayInterceptor({
                routes: [{ path: '/api', service: 'api', targetUrl: 'http://api.internal' }],
                excludePaths: ['/api/gateway-admin', '/admin']
            }, null as any, null as any, new GatewayRuntime(), null as any, null as any);

            await expect(call(interceptor, '/api/gateway-admin/state')).resolves.toBe('local');
            await expect(call(interceptor, '/admin/')).resolves.toBe('local');
            expect(fetches).toBe(0);

            await expect(call(interceptor, '/api/users')).resolves.not.toBe('local');
            expect(fetches).toBe(1);
        } finally {
            globalThis.fetch = original;
        }
    });

    it('also honours paths registered through GATEWAY_LOCAL_PATHS', async () => {
        const injector = {
            get: (token: any, fallback: any) => token === GATEWAY_LOCAL_PATHS
                ? [['/api/gateway-admin'], '/admin']
                : fallback
        } as any;
        const interceptor = new GatewayInterceptor({
            routes: [{ path: '/api', service: 'api', targetUrl: 'http://api.internal' }]
        }, null as any, null as any, new GatewayRuntime(), null as any, injector);

        await expect(call(interceptor, '/api/gateway-admin/state')).resolves.toBe('local');
        await expect(call(interceptor, '/admin/')).resolves.toBe('local');
    });

    it('matches excludePaths on path segment boundaries only', async () => {
        const original = globalThis.fetch;
        let fetches = 0;
        globalThis.fetch = (async () => {
            fetches += 1;
            return {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/json' }),
                async json() { return { ok: true }; },
                async text() { return '{"ok":true}'; }
            } as any;
        }) as any;
        try {
            const interceptor = new GatewayInterceptor({
                routes: [{ path: '/api', service: 'api', targetUrl: 'http://api.internal' }],
                excludePaths: ['/api/admin']
            }, null as any, null as any, new GatewayRuntime(), null as any, null as any);

            await expect(call(interceptor, '/api/admin')).resolves.toBe('local');
            await expect(call(interceptor, '/api/admin/doctor')).resolves.toBe('local');
            await expect(call(interceptor, '/api/admin2')).resolves.not.toBe('local');
            expect(fetches).toBe(1);
        } finally {
            globalThis.fetch = original;
        }
    });
});
