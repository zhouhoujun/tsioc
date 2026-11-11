import expect = require('expect');
import * as crypto from 'node:crypto';
import * as net from 'node:net';
import * as jwt from 'jsonwebtoken';
import { ApplicationContext } from '@tsdi/core';
import { startGatewayAdminServer } from '../src/server';
import { GatewayAdminAuthOptions } from '../src/auth';

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

function cookieHeader(response: any, name: string): string | undefined {
    const value = response.headers.get('set-cookie');
    if (!value) {
        return undefined;
    }
    const match = String(value).match(new RegExp(`${name}=([^;]+)`));
    return match ? match[1] : undefined;
}

function decodeState(value: string): any {
    return JSON.parse(Buffer.from(value.split('.')[0], 'base64url').toString('utf-8'));
}

interface OidcFixture {
    issuer: string;
    jwk: any;
    privateKey: string;
    tokens?: any;
    signIdToken(nonce: string, email?: string): string;
    fetchImpl: typeof fetch;
}

function createOidcFixture(): OidcFixture {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = {
        ...(publicKey.export({ format: 'jwk' }) as any),
        kid: 'test-key',
        alg: 'RS256',
        use: 'sig'
    };
    const issuer = 'https://idp.example';
    const pem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
    const fixture: OidcFixture = {
        issuer,
        jwk,
        privateKey: pem,
        signIdToken(nonce: string, email = 'admin@example.com') {
            return jwt.sign({
                iss: issuer,
                aud: 'gateway-admin',
                sub: 'user-1',
                email,
                name: 'Admin User',
                groups: ['gateway-admins'],
                nonce
            }, pem, { algorithm: 'RS256', keyid: 'test-key', expiresIn: '5m' });
        },
        fetchImpl: (async (url: any, init: any) => {
            const target = String(url);
            if (target.endsWith('/.well-known/openid-configuration')) {
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return {
                            issuer,
                            authorization_endpoint: `${issuer}/authorize`,
                            token_endpoint: `${issuer}/token`,
                            userinfo_endpoint: `${issuer}/userinfo`,
                            jwks_uri: `${issuer}/jwks`
                        };
                    }
                };
            }
            if (target === `${issuer}/jwks`) {
                return {
                    ok: true,
                    status: 200,
                    async json() { return { keys: [jwk] }; }
                };
            }
            if (target === `${issuer}/token`) {
                const body = new URLSearchParams(String(init?.body || ''));
                const state = body.get('code_verifier') ? 'fixture' : '';
                void state;
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        // The test replaces the token below with a nonce-aware token.
                        return (fixture as any).tokens;
                    }
                };
            }
            if (target === `${issuer}/userinfo`) {
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return { sub: 'user-1', email: 'admin@example.com', name: 'Admin User', groups: ['gateway-admins'] };
                    }
                };
            }
            return { ok: false, status: 404, async json() { return {}; } };
        }) as any
    };
    return fixture;
}

describe('gateway admin auth configuration', () => {
    it('fails fast when authentication is enabled without a session secret', () => {
        expect(() => startGatewayAdminServer({
            uiRoot: false,
            auth: { mode: 'service', authServiceUrl: 'http://auth.internal:3000' }
        })).toThrow('auth.sessionSecret');
        expect(() => startGatewayAdminServer({
            uiRoot: false,
            auth: { mode: 'oidc', issuer: 'https://idp.example', clientId: 'id', clientSecret: 'secret' }
        })).toThrow('auth.sessionSecret');
    });
});

describe('gateway admin OIDC authentication', () => {
    let ctx: ApplicationContext | undefined;
    let base = '';
    let fixture: OidcFixture;
    let sessionCookie: string | undefined;

    before(async () => {
        fixture = createOidcFixture();
        const port = await freePort();
        base = `http://127.0.0.1:${port}`;
        const auth: GatewayAdminAuthOptions = {
            mode: 'oidc',
            issuer: fixture.issuer,
            clientId: 'gateway-admin',
            clientSecret: 'secret',
            redirectUri: `${base}/admin/oidc/callback`,
            sessionSecret: 'test-session-secret',
            allowedEmails: ['admin@example.com'],
            requiredGroups: ['gateway-admins'],
            fetchImpl: fixture.fetchImpl
        };
        ctx = await startGatewayAdminServer({
            host: '127.0.0.1',
            port,
            uiRoot: false,
            auth
        });
    });

    after(async () => {
        await ctx?.close();
    });

    it('rejects admin API requests without a session', async () => {
        const response = await fetch(`${base}/api/gateway-admin/state`);
        expect(response.status).toBe(401);
    });

    it('redirects to the OIDC provider with state, nonce and PKCE', async () => {
        const response = await fetch(`${base}/admin/auth/login?redirect=/admin/`, { redirect: 'manual' });
        expect(response.status).toBe(302);
        const location = new URL(response.headers.get('location')!);
        expect(location.origin + location.pathname).toBe(`${fixture.issuer}/authorize`);
        expect(location.searchParams.get('client_id')).toBe('gateway-admin');
        expect(location.searchParams.get('redirect_uri')).toBe(`${base}/admin/oidc/callback`);
        expect(location.searchParams.get('code_challenge_method')).toBe('S256');
        expect(location.searchParams.get('code_challenge')).toBeTruthy();
        const stateToken = cookieHeader(response, 'tsdi_gateway_admin_state');
        expect(stateToken).toBeTruthy();
        const state = decodeState(stateToken!);
        expect(state.state).toBe(location.searchParams.get('state'));
        expect(state.nonce).toBe(location.searchParams.get('nonce'));
    });

    it('exchanges the callback code and accepts the resulting session', async () => {
        const login = await fetch(`${base}/admin/auth/login?redirect=/admin/`, { redirect: 'manual' });
        const location = new URL(login.headers.get('location')!);
        const stateToken = cookieHeader(login, 'tsdi_gateway_admin_state')!;
        const state = decodeState(stateToken);
        fixture.tokens = {
            access_token: 'access-token',
            id_token: fixture.signIdToken(state.nonce)
        };
        const callback = await fetch(`${base}/admin/oidc/callback?code=code-1&state=${encodeURIComponent(state.state)}`, {
            redirect: 'manual',
            headers: { cookie: `tsdi_gateway_admin_state=${stateToken}` }
        });
        expect(callback.status).toBe(302);
        sessionCookie = cookieHeader(callback, 'tsdi_gateway_admin_session');
        expect(sessionCookie).toBeTruthy();

        const stateResponse = await fetch(`${base}/api/gateway-admin/state`, {
            headers: { cookie: `tsdi_gateway_admin_session=${sessionCookie}` }
        });
        expect(stateResponse.status).toBe(200);
        const body = await stateResponse.json() as any;
        expect(body.auth).toEqual({ enabled: true, mode: 'oidc' });
    });

    it('rejects a tampered session cookie', async () => {
        const response = await fetch(`${base}/api/gateway-admin/state`, {
            headers: { cookie: `tsdi_gateway_admin_session=${sessionCookie}X` }
        });
        expect(response.status).toBe(401);
    });
});

describe('gateway admin auth via a separate oidc-auth service', () => {
    let ctx: ApplicationContext | undefined;
    let base = '';

    function token(roles: string[], issuer = 'tsioc-oidc-auth'): string {
        return jwt.sign({
            iss: issuer,
            sub: 'local-1',
            username: 'admin',
            email: 'admin@example.com',
            name: 'Admin User',
            roles,
            typ: 'session'
        }, 'service-secret', { algorithm: 'HS256', expiresIn: '5m' });
    }

    before(async () => {
        const port = await freePort();
        base = `http://127.0.0.1:${port}`;
        ctx = await startGatewayAdminServer({
            host: '127.0.0.1',
            port,
            uiRoot: false,
            auth: {
                mode: 'service',
                authServiceUrl: 'http://auth.internal:3000',
                sessionSecret: 'service-secret',
                sessionIssuer: 'tsioc-oidc-auth',
                requiredRoles: ['gateway-admins']
            }
        });
    });

    after(async () => {
        await ctx?.close();
    });

    it('requires a session token issued by the separate auth service', async () => {
        const unauthorized = await fetch(`${base}/api/gateway-admin/state`);
        expect(unauthorized.status).toBe(401);

        const authorized = await fetch(`${base}/api/gateway-admin/state`, {
            headers: { cookie: `oidc_session=${token(['gateway-admins'])}` }
        });
        expect(authorized.status).toBe(200);
        const body = await authorized.json() as any;
        expect(body.auth).toEqual({ enabled: true, mode: 'service' });
    });

    it('rejects tokens without the required role or from another issuer', async () => {
        const wrongRole = await fetch(`${base}/api/gateway-admin/state`, {
            headers: { cookie: `oidc_session=${token(['viewers'])}` }
        });
        expect(wrongRole.status).toBe(401);

        const wrongIssuer = await fetch(`${base}/api/gateway-admin/state`, {
            headers: { cookie: `oidc_session=${token(['gateway-admins'], 'other-issuer')}` }
        });
        expect(wrongIssuer.status).toBe(401);
    });

    it('redirects login to the separate auth service', async () => {
        const response = await fetch(`${base}/admin/auth/login?redirect=/admin/rules`, { redirect: 'manual' });
        expect(response.status).toBe(302);
        const location = new URL(response.headers.get('location')!);
        expect(location.origin + location.pathname).toBe('http://auth.internal:3000/auth/login');
        expect(location.searchParams.get('redirect')).toBe('/admin/rules');
    });
});
