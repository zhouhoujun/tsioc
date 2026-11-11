import expect = require('expect');
import * as http from 'node:http';
import * as net from 'node:net';
import { Application, ApplicationContext } from '@tsdi/core';
import { OIDCService } from '@tsdi/oidc-auth';
import { InMemoryWorkflowDefinitionStore } from '@tsdi/activities/src/visual/workflow-store';
import { createWorkflowAdminModule } from '../src/server';
import { WorkflowSessionGuard } from '../src/auth/session.guard';
import { WorkflowAdminAuthOptions } from '../src/auth/options';

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

        const token = await oidc.createSessionToken({
            sub: 'test-user',
            username: 'tester',
            name: 'Tester',
            provider: 'local',
            roles: ['admin']
        });
        const cookie = `oidc_session=${token}`;

        const session = await request(`${base}/auth/session`, { headers: { cookie } });
        expect(session.body.authenticated).toBe(true);
        expect(session.body.user.username).toBe('tester');

        const authorized = await request(`${base}/api/workflows`, { headers: { cookie } });
        expect(authorized.status).toBe(200);
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
