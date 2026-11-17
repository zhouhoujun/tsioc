import expect = require('expect');
import { GatewayWebhook } from '../src/gateway.webhook';

describe('GatewayWebhook', () => {
    const request = {
        url: '/api/users',
        method: 'POST',
        headers: { 'x-request-id': 'req-1' },
        query: { page: '1' },
        body: { hello: 'world' }
    } as any;

    const response = { status: 200, statusText: 'OK', payload: { ok: true } } as any;

    function route(webhook: any) {
        return { path: '/api/users', service: 'users-service', webhook } as any;
    }

    it('posts request/response envelopes with custom headers and method', async () => {
        const calls: Array<{ url: string; init: any }> = [];
        const webhook = new GatewayWebhook(() => (async (url: any, init: any) => {
            calls.push({ url: String(url), init });
            return { ok: true, status: 204 } as any;
        }) as any);

        await webhook.dispatch(route({
            enabled: true,
            url: 'https://hooks.example.com/notify',
            method: 'PATCH',
            async: false,
            headers: { 'x-signature': 'abc' }
        }), request, response);

        expect(calls.length).toBe(1);
        expect(calls[0].url).toBe('https://hooks.example.com/notify');
        expect(calls[0].init.method).toBe('PATCH');
        expect(calls[0].init.headers['content-type']).toBe('application/json');
        expect(calls[0].init.headers['x-signature']).toBe('abc');
        const body = JSON.parse(calls[0].init.body);
        expect(body.request).toMatchObject({ url: '/api/users', method: 'POST' });
        expect(body.response).toEqual(response);
    });

    it('skips when disabled or onSuccess does not match', async () => {
        let calls = 0;
        const webhook = new GatewayWebhook(() => (async () => { calls += 1; return {} as any; }) as any);
        await webhook.dispatch(route({ enabled: false, url: 'https://hooks.example.com' }), request, response);
        await webhook.dispatch(route({ enabled: true, url: 'https://hooks.example.com', onSuccess: true }), request,
            { status: 500, statusText: 'ERR', payload: null } as any);
        expect(calls).toBe(0);
    });

    it('retries failures and then throws for synchronous dispatch', async () => {
        let calls = 0;
        const webhook = new GatewayWebhook(() => (async () => {
            calls += 1;
            throw new Error('webhook down');
        }) as any);

        await expect(webhook.dispatch(route({
            enabled: true,
            url: 'https://hooks.example.com',
            async: false,
            retries: 2
        }), request, response)).rejects.toThrow('webhook down');
        expect(calls).toBe(3);
    });

    it('swallows failures for asynchronous dispatch', async () => {
        const webhook = new GatewayWebhook(() => (async () => {
            throw new Error('webhook down');
        }) as any);
        await expect(webhook.dispatch(route({
            enabled: true,
            url: 'https://hooks.example.com',
            async: true
        }), request, response)).resolves.toBeUndefined();
        await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('aborts attempts after the timeout', async () => {
        const webhook = new GatewayWebhook(() => ((async (_url: any, init: any) => new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => {
                reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
            });
        })) as any));

        await expect(webhook.dispatch(route({
            enabled: true,
            url: 'https://hooks.example.com',
            async: false,
            timeoutMs: 20
        }), request, response)).rejects.toThrow(/aborted/);
    });

    it('enforces an opt-in host allowlist with wildcard support', async () => {
        let calls = 0;
        const webhook = new GatewayWebhook(() => (async () => { calls += 1; return {} as any; }) as any);

        await expect(webhook.dispatch(route({
            enabled: true,
            url: 'http://169.254.169.254/latest/meta-data',
            async: false,
            allowedHosts: ['hooks.example.com']
        }), request, response)).rejects.toThrow(/not in the allowlist/);
        expect(calls).toBe(0);

        await webhook.dispatch(route({
            enabled: true,
            url: 'https://api.hooks.example.com/notify',
            async: false,
            allowedHosts: ['*.example.com']
        }), request, response);
        expect(calls).toBe(1);
    });

    it('disables redirect following and rejects non-http protocols when allowlisted', async () => {
        const calls: Array<{ init: any }> = [];
        const webhook = new GatewayWebhook(() => (async (_url: any, init: any) => {
            calls.push({ init });
            return {} as any;
        }) as any);

        await webhook.dispatch(route({
            enabled: true,
            url: 'https://hooks.example.com/notify',
            async: false,
            allowedHosts: ['hooks.example.com']
        }), request, response);
        expect(calls[0].init.redirect).toBe('manual');

        await expect(webhook.dispatch(route({
            enabled: true,
            url: 'file:///etc/passwd',
            async: false,
            allowedHosts: ['hooks.example.com']
        }), request, response)).rejects.toThrow(/protocol 'file:' is not allowed/);
        expect(calls.length).toBe(1);
    });
});
