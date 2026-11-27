import expect = require('expect');
import { createInjector } from '@tsdi/ioc';
import { createRequestContext } from '@tsdi/common';
import { HTTP_RESPONSE, HttpMessageAdapter } from '@tsdi/http-microservice';
import { GatewayInterceptor } from '../src/gateway.interceptor';
import { GatewayRuntime } from '../src/gateway.runtime';
import { GatewayRetryBudget } from '../src/retry-budget';

describe('GatewayRetryBudget', () => {
    it('limits retries relative to successes with a guaranteed floor', () => {
        let now = 0;
        const budget = new GatewayRetryBudget({ ratio: 0.5, ttlMs: 1000, minRetriesPerSec: 0 }, () => now);
        expect(budget.allow()).toBe(false);
        budget.recordSuccess();
        expect(budget.allow()).toBe(false);
        budget.recordSuccess();
        expect(budget.allow()).toBe(true);
        budget.recordRetry();
        expect(budget.allow()).toBe(false);

        now = 1001;
        expect(budget.allow()).toBe(false); // new window, no successes yet
        const withFloor = new GatewayRetryBudget({ ratio: 0, ttlMs: 1000, minRetriesPerSec: 1 }, () => now);
        expect(withFloor.allow()).toBe(true);
        withFloor.recordRetry();
        expect(withFloor.allow()).toBe(false);
    });

    function request(path = '/api/test') {
        return {
            url: path,
            method: 'GET',
            headers: {},
            getHeader() { return undefined; },
            socket: { remoteAddress: '127.0.0.1' }
        } as any;
    }

    function context() {
        const adapter = {
            setHeader() { return this; },
            setStatus() { return this; },
            setPayload() { return this; },
            sendResponse() { return; }
        };
        const ctx = createRequestContext(createInjector());
        ctx.set(HttpMessageAdapter, adapter as any);
        ctx.set(HTTP_RESPONSE, {} as any);
        return ctx;
    }

    function call(interceptor: GatewayInterceptor): Promise<any> {
        return new Promise((resolve, reject) => {
            interceptor.intercept(request(), { handle: () => null } as any, context()).subscribe({ next: resolve, error: reject });
        });
    }

    it('does not retry when the budget is exhausted', async () => {
        const original = globalThis.fetch;
        let calls = 0;
        globalThis.fetch = (async () => {
            calls += 1;
            throw Object.assign(new Error('upstream down'), { code: 'ECONNREFUSED' });
        }) as any;
        try {
            const interceptor = new GatewayInterceptor({
                routes: [{
                    path: '/api',
                    service: 'api',
                    targetUrl: 'http://api.internal',
                    loadBalance: { retries: 2, retryBudget: { ratio: 0, minRetriesPerSec: 0 } }
                }]
            }, null as any, null as any, new GatewayRuntime(), null as any, null as any);
            await expect(call(interceptor)).rejects.toThrow(/upstream down/);
            expect(calls).toBe(1);
        } finally {
            globalThis.fetch = original;
        }
    });

    it('retries while the budget has capacity', async () => {
        const original = globalThis.fetch;
        let calls = 0;
        globalThis.fetch = (async () => {
            calls += 1;
            if (calls === 1) {
                throw Object.assign(new Error('transient'), { code: 'ECONNRESET' });
            }
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
                routes: [{
                    path: '/api',
                    service: 'api',
                    targetUrl: 'http://api.internal',
                    loadBalance: { retries: 1, retryBudget: { ratio: 0, minRetriesPerSec: 1 } }
                }]
            }, null as any, null as any, new GatewayRuntime(), null as any, null as any);
            await call(interceptor);
            expect(calls).toBe(2);
        } finally {
            globalThis.fetch = original;
        }
    });
});
