import expect = require('expect');
import * as http from 'node:http';
import * as net from 'node:net';
import { Application, ApplicationContext } from '@tsdi/core';
import { OIDCService } from '@tsdi/oidc-auth';
import { InMemoryWorkflowDefinitionStore } from '@tsdi/activities/src/visual/workflow-store';
import { createWorkflowAdminModule } from '../src/server';
import { WorkflowSessionGuard } from '../src/auth/session.guard';
import { WorkflowAdminAuthOptions, resolveWorkflowAdminAuthOptions } from '../src/auth/options';

function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = typeof address === 'object' && address ? address.port : 0;
            server.close(() => resolve(port));
        });
    });
}

interface HttpResult {
    status: number;
    headers: http.IncomingHttpHeaders;
    body: any;
}

function request(url: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}): Promise<HttpResult> {
    return new Promise((resolve, reject) => {
        const payload = options.body === undefined
            ? undefined
            : typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        const req = http.request(url, {
            method: options.method || 'GET',
            agent: false,
            headers: {
                connection: 'close',
                ...(payload !== undefined ? {
                    'content-type': 'application/json',
                    'content-length': Buffer.byteLength(payload)
                } : {}),
                ...(options.headers || {})
            }
        }, response => {
            const chunks: Buffer[] = [];
            let finished = false;
            const finish = () => {
                if (finished) {
                    return;
                }
                finished = true;
                const text = Buffer.concat(chunks).toString('utf8');
                let parsed: any = text;
                try { parsed = text ? JSON.parse(text) : undefined; } catch { /* text */ }
                resolve({ status: response.statusCode || 0, headers: response.headers, body: parsed });
            };
            response.on('data', chunk => chunks.push(Buffer.from(chunk)));
            response.on('end', finish);
            response.on('close', finish);
        });
        req.on('error', reject);
        req.end(payload);
    });
}

async function waitForServer(base: string): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < 8000) {
        try {
            const response = await request(`${base}/auth/session`);
            if (response.status > 0) {
                return;
            }
        } catch {
            // retry while the microservice binds
        }
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error('workflow admin HTTP microservice did not start');
}

describe('workflow admin auth defaults', () => {
    it('disables authentication when no env/options enable it', () => {
        const original = process.env.WORKFLOW_ADMIN_AUTH_ENABLED;
        delete process.env.WORKFLOW_ADMIN_AUTH_ENABLED;
        try {
            expect(resolveWorkflowAdminAuthOptions({}).enabled).toBe(false);
        } finally {
            if (original === undefined) {
                delete process.env.WORKFLOW_ADMIN_AUTH_ENABLED;
            } else {
                process.env.WORKFLOW_ADMIN_AUTH_ENABLED = original;
            }
        }
    });
});

describe('workflow admin authentication', () => {
    let ctx: ApplicationContext | undefined;
    let base: string;

    afterEach(async () => {
        await ctx?.close();
        ctx = undefined;
    });

    async function start(auth: WorkflowAdminAuthOptions): Promise<void> {
        const port = await freePort();
        base = `http://127.0.0.1:${port}`;
        ctx = await Application.run(createWorkflowAdminModule({
            host: '127.0.0.1',
            port,
            store: new InMemoryWorkflowDefinitionStore(),
            auth
        }));
        await waitForServer(base);
    }

    it('leaves APIs public when authentication is disabled', async () => {
        await start({ enabled: false });
        const config = await request(`${base}/auth/config`);
        expect(config.body.enabled).toBe(false);

        const token = await request(`${base}/auth/token`);
        expect(token.body).toEqual({ token: '', enabled: false });

        const userinfo = await request(`${base}/auth/userinfo`);
        expect(userinfo.body).toEqual({ user: null });

        const session = await request(`${base}/auth/session`);
        expect(session.body.authenticated).toBe(true);
        const list = await request(`${base}/api/workflows`);
        expect(list.status).toBe(200);
    });

    it('protects APIs and accepts session cookies', async () => {
        await start({
            enabled: true,
            startOidcService: true,
            allowRegistration: true,
            jwt: { secret: 'workflow-admin-test-secret' }
        });

        const config = await request(`${base}/auth/config`);
        expect(config.body.enabled).toBe(true);
        expect(config.body.local).toBe(true);
        const loginPage = await request(`${base}/login.html`);
        expect(loginPage.status).toBe(200);

        const oidc = ctx!.get(OIDCService);
        const guard = new WorkflowSessionGuard(oidc, {
            enabled: true,
            startOidcService: true,
            jwt: { secret: 'workflow-admin-test-secret' }
        });
        expect(guard.canHandle({ url: '/api/workflows' }, { get: () => undefined } as any)).toBe(false);
        expect(guard.canHandle({ url: '/index.html' }, { get: () => undefined } as any)).toBe(true);

        // Local tokens must reference a real user in the store.
        const localUser = await oidc.createLocalUser({
            username: 'tester',
            password: 'tester-pass-123',
            email: 'tester@example.com',
            roles: ['admin']
        });
        const token = await oidc.createSessionToken(localUser);
        const cookie = `oidc_session=${token}`;

        const tokenResponse = await request(`${base}/auth/token`, { headers: { cookie } });
        expect(tokenResponse.body.token).toBe(token);

        const userinfo = await request(`${base}/auth/userinfo`, {
            headers: { authorization: `Bearer ${token}` }
        });
        expect(userinfo.status).toBe(200);
        expect(userinfo.body.user.username).toBe('tester');

        const missingUserinfo = await request(`${base}/auth/userinfo`);
        expect(missingUserinfo.status).toBe(401);

        const session = await request(`${base}/auth/session`, { headers: { cookie } });
        expect(session.body.authenticated).toBe(true);
        expect(session.body.user.username).toBe('tester');

        const authorized = await request(`${base}/api/workflows`, { headers: { cookie } });
        expect(authorized.status).toBe(200);
    });

    it('registers, resolves token+userinfo and keeps the session after a refresh', async () => {
        await start({
            enabled: true,
            startOidcService: true,
            allowRegistration: true,
            jwt: { secret: 'workflow-admin-refresh-secret' }
        });

        const register = await fetch(`${base}/auth/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'fresh-user', password: 'fresh-pass-123' })
        });
        expect(register.status).toBe(200);
        const setCookie = register.headers.get('set-cookie') || '';
        const cookie = setCookie.match(/oidc_session=([^;]+)/)?.[1];
        expect(cookie).toBeTruthy();

        const token = await fetch(`${base}/auth/token`, { headers: { cookie: `oidc_session=${cookie}` } });
        expect(token.status).toBe(200);
        const tokenBody = await token.json() as { token?: string; enabled?: boolean };
        expect(tokenBody.enabled).toBe(true);
        expect(tokenBody.token).toBeTruthy();

        const userinfo = await fetch(`${base}/auth/userinfo`, {
            headers: { authorization: `Bearer ${tokenBody.token}` }
        });
        expect(userinfo.status).toBe(200);
        const userBody = await userinfo.json() as { user?: { username?: string } };
        expect(userBody.user?.username).toBe('fresh-user');

        const api = await fetch(`${base}/api/workflows`, { headers: { cookie: `oidc_session=${cookie}` } });
        expect(api.status).toBe(200);

        // Simulate a browser refresh: the same session cookie must resolve the
        // token and userinfo again (not just once at registration time).
        const refreshedToken = await fetch(`${base}/auth/token`, { headers: { cookie: `oidc_session=${cookie}` } });
        const refreshedBody = await refreshedToken.json() as { token?: string };
        const refreshedUser = await fetch(`${base}/auth/userinfo`, {
            headers: { authorization: `Bearer ${refreshedBody.token}` }
        });
        expect(refreshedUser.status).toBe(200);
        const refreshedUserBody = await refreshedUser.json() as { user?: { username?: string } };
        expect(refreshedUserBody.user?.username).toBe('fresh-user');
    });

    it('verifies bearer tokens from an external OIDC service', async () => {
        await start({
            enabled: true,
            startOidcService: false,
            loginUrl: 'https://auth.example.com/login',
            jwt: { secret: 'external-secret' }
        });
        const config = await request(`${base}/auth/config`);
        expect(config.body.startOidcService).toBe(false);
        expect(config.body.loginUrl).toBe('https://auth.example.com/login');

        const oidc = ctx!.get(OIDCService);
        const access = await oidc.createSessionToken({
            sub: 'external-user',
            username: 'external',
            name: 'External',
            provider: 'oidc',
            roles: ['admin']
        });
        const authorized = await request(`${base}/api/workflows`, {
            headers: { authorization: `Bearer ${access}` }
        });
        expect(authorized.status).toBe(200);
    });
});
