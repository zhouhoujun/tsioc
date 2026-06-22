import expect = require('expect');
import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useCookie, useRouter } from '@tsdi/service';
import { HttpServer, useHttpTransport } from '@tsdi/http';
import * as http from 'node:http';
import { AuthController } from '../src/controllers/AuthController';
import { OIDCService } from '../src/auth/OIDCService';

class OIDCServiceRuntimeStub {
    authenticate(state?: string, nonce?: string) {
        return {
            url: `https://issuer.example/auth?state=${state ?? 'runtime-state'}`,
            state: state ?? 'runtime-state',
            nonce: nonce ?? 'runtime-nonce'
        };
    }

    async handleCallback(_code: string, _state: string, expectedState: string, expectedNonce: string): Promise<any> {
        return {
            expectedState,
            expectedNonce,
            user: { sub: 'runtime-user', email: 'runtime@example.com' },
            claims: { sub: 'runtime-user' },
            tokens: { accessToken: 'at', refreshToken: 'rt', idToken: 'idt' }
        };
    }

    async createSessionToken(): Promise<string> {
        return 'runtime-session-token';
    }

    async verifySessionToken(token: string): Promise<any> {
        if (token === 'runtime-session-token') {
            return { sub: 'runtime-user', email: 'runtime@example.com', provider: 'issuer' };
        }
        return null;
    }

    get issuer(): string {
        return 'https://issuer.example';
    }

    async refreshAccessToken(refreshToken: string): Promise<any> {
        return { accessToken: `new-${refreshToken}`, refreshToken: 'rt2', idToken: 'idt2' };
    }
}

function requestRuntime(
    port: number,
    path: string,
    options?: {
        method?: string;
        headers?: http.OutgoingHttpHeaders;
        body?: string;
    }
): Promise<{ status: number; body: any; text: string; headers: http.IncomingHttpHeaders; cookies: string[] }> {
    return new Promise((resolve, reject) => {
        const req = http.request({
            host: '127.0.0.1',
            port,
            path,
            method: options?.method ?? 'GET',
            headers: options?.headers
        }, (res) => {
            let text = '';
            res.setEncoding('utf8');
            res.on('data', chunk => text += chunk);
            res.on('end', () => {
                const setCookie = res.headers['set-cookie'];
                resolve({
                    status: res.statusCode ?? 0,
                    body: text ? JSON.parse(text) : null,
                    text,
                    headers: res.headers,
                    cookies: Array.isArray(setCookie) ? setCookie : (setCookie ? [String(setCookie)] : [])
                });
            });
        });
        req.on('error', reject);
        if (options?.body) {
            req.write(options.body);
        }
        req.end();
    });
}

describe('OIDC auth app runtime', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [AuthController],
        providers: [
            { provide: OIDCService, useClass: OIDCServiceRuntimeStub },
            provideService(
                useRouter(),
                useCookie(),
                useHttpTransport({ listenOpts: { port: 0, host: '127.0.0.1' }, asDefault: true })
            )
        ]
    })
    class RuntimeApp { }

    let ctx: ApplicationContext;
    let port: number;

    before(async () => {
        ctx = await Application.run(RuntimeApp);
        const serverRef = ctx.runners.getRef(HttpServer as any) as { instance: { server: http.Server } };
        const address = serverRef.instance.server.address();
        if (!address || typeof address === 'string') {
            throw new Error('Unable to resolve bound port');
        }
        port = address.port;
    });

    after(async () => {
        await ctx?.close();
    });

    it('serves login endpoint with oidc cookies through microservice http runtime', async () => {
        const result = await requestRuntime(port, '/auth/login');

        expect(result.status).toBe(200);
        expect(result.body.url).toContain('https://issuer.example/auth');
        expect(result.cookies.some(cookie => cookie.includes('oidc_state=runtime-state'))).toBe(true);
        expect(result.cookies.some(cookie => cookie.includes('oidc_nonce=runtime-nonce'))).toBe(true);
    });

    it('completes callback and session flow through runtime http endpoints', async () => {
        const login = await requestRuntime(port, '/auth/login');
        const cookieHeader = login.cookies.map(cookie => cookie.split(';')[0]).join('; ');
        const callback = await requestRuntime(port, '/auth/callback?code=code-1&state=runtime-state', {
            headers: { cookie: cookieHeader }
        });

        expect(callback.status).toBe(200);
        expect(callback.body.sessionToken).toBe('runtime-session-token');
        expect(callback.body.user.sub).toBe('runtime-user');
        expect(callback.cookies.some(cookie => cookie.includes('oidc_session=runtime-session-token'))).toBe(true);

        const sessionCookie = callback.cookies.find(cookie => cookie.includes('oidc_session='))?.split(';')[0];
        const session = await requestRuntime(port, '/auth/session', {
            headers: { cookie: sessionCookie }
        });
        expect(session.body.authenticated).toBe(true);
        expect(session.body.user.sub).toBe('runtime-user');

        const userinfo = await requestRuntime(port, '/auth/userinfo', {
            headers: { cookie: sessionCookie }
        });
        expect(userinfo.status).toBe(200);
        expect(userinfo.body.sub).toBe('runtime-user');
    });

    it('returns 401 for missing session and supports bearer token userinfo', async () => {
        const unauthorized = await requestRuntime(port, '/auth/userinfo');
        expect(unauthorized.status).toBe(401);
        expect(unauthorized.body.error).toContain('Not authenticated');

        const authorized = await requestRuntime(port, '/auth/userinfo', {
            headers: { authorization: 'Bearer runtime-session-token' }
        });
        expect(authorized.status).toBe(200);
        expect(authorized.body.sub).toBe('runtime-user');
    });

    it('refreshes tokens and exposes oidc discovery metadata', async () => {
        const refresh = await requestRuntime(port, '/auth/refresh', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'content-length': Buffer.byteLength('{"refreshToken":"rt"}')
            },
            body: '{"refreshToken":"rt"}'
        });
        expect(refresh.status).toBe(200);
        expect(refresh.body.tokens.accessToken).toBe('new-rt');

        const discovery = await requestRuntime(port, '/auth/.well-known/openid-configuration', {
            headers: { host: `127.0.0.1:${port}` }
        });
        expect(discovery.status).toBe(200);
        expect(discovery.body.issuer).toBe('https://issuer.example');
        expect(discovery.body.authorization_endpoint).toBe(`http://127.0.0.1:${port}/auth/login`);
        expect(discovery.body.userinfo_endpoint).toBe(`http://127.0.0.1:${port}/auth/userinfo`);
    });
});
