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

    it('reports the current session for the route guard', async () => {
        const response = await fetch(`${base}/api/gateway-admin/session`);
        expect(response.status).toBe(200);
        const session = await response.json() as any;
        expect(session.authenticated).toBe(true);
        expect(session.authEnabled).toBe(false);
        expect(session.user).toBeNull();
    });

    it('serves the built browser UI under the configured prefix', async () => {
        const response = await fetch(`${base}/admin/index.html`);
        expect(response.status).toBe(200);
        const html = await response.text();
        expect(html).toContain('gateway-admin-app');
        expect(html).toContain('main.js');
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
