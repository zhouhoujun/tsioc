import expect = require('expect');
import * as net from 'node:net';
import * as path from 'node:path';
import { ApplicationContext } from '@tsdi/core';
import { startGatewayAdminServer } from '../src/server';

function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = address && typeof address === 'object' ? address.port : 0;
            server.close(error => error ? reject(error) : resolve(port));
        });
    });
}

describe('gateway admin standalone server', () => {
    let ctx: ApplicationContext | undefined;
    let base = '';

    before(async () => {
        const port = await freePort();
        base = `http://127.0.0.1:${port}`;
        ctx = await startGatewayAdminServer({
            host: '127.0.0.1',
            port,
            prefix: '/admin',
            uiRoot: path.resolve(__dirname, '../web'),
            routes: [{ path: '/api/demo', service: 'demo-service' }]
        });
    });

    after(async () => {
        await ctx?.close();
    });

    it('serves the admin state API', async () => {
        const response = await fetch(`${base}/api/gateway-admin/state`);
        expect(response.status).toBe(200);
        const state = await response.json() as any;
        expect(state.routes).toEqual([{ path: '/api/demo', service: 'demo-service' }]);
        expect(state.services).toEqual(['demo-service']);
    });

    it('lists discovered service endpoints for the overview', async () => {
        const response = await fetch(`${base}/api/gateway-admin/services`);
        expect(response.status).toBe(200);
        const body = await response.json() as Array<{ name: string; endpoints: unknown[] }>;
        expect(body.map(item => item.name)).toContain('demo-service');
        const demo = body.find(item => item.name === 'demo-service');
        expect(demo?.endpoints).toEqual([]);
    });

    it('exposes runtime diagnostics for the overview', async () => {
        const response = await fetch(`${base}/api/gateway-admin/diagnostics`);
        expect(response.status).toBe(200);
        const body = await response.json() as {
            cacheEntries: number;
            activeRequests: number;
            circuits: unknown[];
            bulkheads: unknown[];
        };
        expect(body.cacheEntries).toBe(0);
        expect(body.activeRequests).toBe(0);
        expect(Array.isArray(body.circuits)).toBe(true);
        expect(Array.isArray(body.bulkheads)).toBe(true);
    });

    it('applies gateway config transactionally with versioning and dry-run', async () => {
        const current = await (await fetch(`${base}/api/gateway-admin/config`)).json() as { version: number };
        const dryRun = await fetch(`${base}/api/gateway-admin/config/apply`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                dryRun: true,
                routes: [{ path: '/api/orders', service: 'orders-service' }]
            })
        });
        expect(dryRun.status).toBe(200);
        const preview = await dryRun.json() as { applied: boolean; version: number; diff: { routes: { added: string[] } } };
        expect(preview.applied).toBe(false);
        expect(preview.version).toBe(current.version);
        expect(preview.diff.routes.added).toContain('/api/orders:orders-service');

        const applied = await fetch(`${base}/api/gateway-admin/config/apply`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                expectedVersion: current.version,
                routes: [{ path: '/api/orders', service: 'orders-service' }]
            })
        });
        expect(applied.status).toBe(200);
        const result = await applied.json() as { applied: boolean; version: number };
        expect(result.applied).toBe(true);
        expect(result.version).toBe(current.version + 1);

        const state = await (await fetch(`${base}/api/gateway-admin/state`)).json() as { routes: Array<{ path: string }> };
        expect(state.routes.map(route => route.path)).toContain('/api/orders');

        const conflict = await fetch(`${base}/api/gateway-admin/config/apply`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                expectedVersion: current.version,
                routes: [{ path: '/api/stale', service: 'stale-service' }]
            })
        });
        expect(conflict.status).toBe(409);

        const invalid = await fetch(`${base}/api/gateway-admin/config/apply`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ routes: [{ path: 'bad', service: 's' }] })
        });
        expect(invalid.status).toBe(400);

        await fetch(`${base}/api/gateway-admin/routes`, { method: 'DELETE' });
    });

    it('rolls back gateway config to a historical version', async () => {
        const first = await (await fetch(`${base}/api/gateway-admin/config`)).json() as { version: number };
        await fetch(`${base}/api/gateway-admin/config/apply`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                expectedVersion: first.version,
                routes: [{ path: '/api/rollback-a', service: 'a' }]
            })
        });
        await fetch(`${base}/api/gateway-admin/config/apply`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ routes: [{ path: '/api/rollback-b', service: 'b' }] })
        });

        const rollback = await fetch(`${base}/api/gateway-admin/config/rollback`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ version: first.version + 1 })
        });
        expect(rollback.status).toBe(200);
        const result = await rollback.json() as { version: number };
        expect(result.version).toBe(first.version + 3);

        const state = await (await fetch(`${base}/api/gateway-admin/state`)).json() as { routes: Array<{ path: string }> };
        expect(state.routes.map(route => route.path)).toContain('/api/rollback-a');
        expect(state.routes.map(route => route.path)).not.toContain('/api/rollback-b');

        const history = await (await fetch(`${base}/api/gateway-admin/config/history`)).json() as Array<{ version: number }>;
        expect(history[0].version).toBe(result.version);

        await fetch(`${base}/api/gateway-admin/routes`, { method: 'DELETE' });
    });

    it('previews which route matches a request', async () => {
        const response = await fetch(`${base}/api/gateway-admin/match`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ method: 'GET', path: '/api/demo/users' })
        });
        expect(response.status).toBe(200);
        const match = await response.json() as {
            matchedBy: string;
            route?: { path?: string; service?: string };
        };
        expect(match.matchedBy).toBe('route');
        expect(match.route?.path).toBe('/api/demo');
        expect(match.route?.service).toBe('demo-service');
    });

    it('does not expose an auth session endpoint', async () => {
        const response = await fetch(`${base}/api/gateway-admin/session`);
        expect(response.status).toBe(404);
    });

    it('serves the built browser UI under the configured prefix', async () => {
        const response = await fetch(`${base}/admin/index.html`);
        expect(response.status).toBe(200);
        const html = await response.text();
        expect(html).toContain('gateway-admin-app');
        expect(html).toContain('main.js');
        expect(html).toContain('__TSDI_ADMIN_SESSION__');
        expect(html).toContain('"authEnabled":false');
    });

    it('serves the login page used by the route guard', async () => {
        const response = await fetch(`${base}/admin/login.html`);
        expect(response.status).toBe(200);
        const html = await response.text();
        expect(html).toContain('Sign in with SSO');
        expect(html).toContain('/admin/auth/login');
    });

    it('redirects the server root to the admin UI', async () => {
        const response = await fetch(`${base}/`, { redirect: 'manual' });
        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe('/admin/');
    });

    it('serves the admin API without the UI when --no-ui is used', async () => {
        const port = await freePort();
        const apiOnly = await startGatewayAdminServer({
            host: '127.0.0.1',
            port,
            uiRoot: false
        });
        try {
            const state = await fetch(`http://127.0.0.1:${port}/api/gateway-admin/state`);
            expect(state.status).toBe(200);
            const ui = await fetch(`http://127.0.0.1:${port}/admin/index.html`);
            expect(ui.status).toBe(404);
        } finally {
            await apiOnly.close();
        }
    });
});
