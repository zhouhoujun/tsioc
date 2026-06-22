import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createInjector, Provider } from '@tsdi/ioc';
import { RequestContext, RestfulRequestAdapter, StatusMessageAdapter } from '@tsdi/common';
import { lastValueFrom, of, take, timeout } from 'rxjs';
import { Authenticator, NoOpenIDException, OAuth2Options, OAuth2Service, OAuthCallback, OAuthInterceptor, OAuthOption, OIDCOptions, OIDCService } from '../src';
import { OAuth2Interceptor } from '../src/oauth2/oauth2.interceptor';
import { OIDCInterceptor } from '../src/oidc/oidc.interceptor';

class AuthenticatorStub extends Authenticator {
    loginCalls: any[] = [];
    async login(_ctx: RequestContext, user: any): Promise<void> {
        this.loginCalls.push(user);
    }
    async logout(_ctx: RequestContext): Promise<void> {
        return;
    }
}

class AdapterStub {
    query: Record<string, any>;
    session?: Record<string, any>;
    response: any = {};
    redirectedTo?: string;
    path: string;
    headers = new Map<string, string>();

    constructor(init?: { path?: string; query?: Record<string, any>; session?: Record<string, any>; headers?: Record<string, string> }) {
        this.path = init?.path ?? '/';
        this.query = init?.query ?? {};
        this.session = init?.session;
        Object.entries(init?.headers ?? {}).forEach(([k, v]) => this.headers.set(k.toLowerCase(), v));
    }

    getHeader(name: string): string | undefined {
        return this.headers.get(name.toLowerCase());
    }

    setHeader(name: string, value: string): this {
        this.headers.set(name.toLowerCase(), value);
        return this;
    }

    redirect(url: string): void {
        this.redirectedTo = url;
    }
}

class ContextStub {
    private readonly values = new Map<any, any>();

    constructor(adapter: AdapterStub, extra: Provider[] = []) {
        const injector = createInjector([
            { provide: RestfulRequestAdapter, useValue: adapter },
            { provide: StatusMessageAdapter, useValue: adapter },
            ...extra
        ]);
        this.values.set(RestfulRequestAdapter, adapter);
        this.values.set(StatusMessageAdapter, adapter);
        this.values.set('injector', injector);
    }

    get(token: any): any {
        if (this.values.has(token)) {
            return this.values.get(token);
        }
        return this.values.get('injector').get(token, null);
    }

    set(token: any, value: any): this {
        this.values.set(token, value);
        return this;
    }
}

class OAuth2InterceptorStub extends OAuth2Interceptor {
    tokenResponse: any = { access_token: 'access-token' };
    userInfo: any = { sub: 'oauth-user' };

    protected async getAccessToken(_code: string, _options: OAuth2Options): Promise<any> {
        return this.tokenResponse;
    }

    protected async getUserInfo(_accessToken: string): Promise<any> {
        return this.userInfo;
    }
}

class OIDCInterceptorStub extends OIDCInterceptor {
    tokenResponse: any = { access_token: 'access-token', id_token: 'id-token' };

    constructor(oidcService: OIDCService) {
        super(oidcService);
    }

    protected async getAccessToken(_code: string, _options: OIDCOptions): Promise<any> {
        return this.tokenResponse;
    }
}

class OIDCServiceStub {
    validated: any[] = [];
    userInfos: any[] = [];

    async validateIDToken(idToken: string, _options: OIDCOptions): Promise<any> {
        this.validated.push(idToken);
        return { sub: 'oidc-user' };
    }

    async getUserInfo(accessToken: string, _options: OIDCOptions): Promise<any> {
        this.userInfos.push(accessToken);
        return { sub: 'oidc-user', email_verified: true };
    }
}

@Suite('OAuth/OIDC security flows')
export class OAuthFlowsTest {
    @Test('oauth2 service builds auth url and handles callback and fetch failures')
    async oauth2ServiceBranches() {
        const service = new OAuth2Service();
        const options = new OAuth2Options(
            'client-id',
            'client-secret',
            'https://issuer.example/auth',
            'https://issuer.example/token',
            'https://issuer.example/profile',
            'https://app.example/callback',
            ['openid', 'profile'],
            'state-1',
            'nonce-1',
            'login',
            'hint@example.com'
        );
        const authUrl = service.buildAuthorizationUrl(options);
        expect(authUrl).toContain('response_type=code');
        expect(authUrl).toContain('client_id=client-id');
        expect(authUrl).toContain('scope=openid+profile');
        expect(authUrl).toContain('state=state-1');
        expect(authUrl).toContain('nonce=nonce-1');
        expect(authUrl).toContain('prompt=login');
        expect(authUrl).toContain('login_hint=hint%40example.com');

        const fetchMod = require('cross-fetch');
        const originalFetch = fetchMod.fetch;
        fetchMod.fetch = async (url: string, init?: any) => {
            if (String(url).includes('/userinfo')) {
                return {
                    ok: true,
                    json: async () => ({ sub: 'user-1' })
                };
            }
            if (String(url).includes('/token')) {
                return {
                    ok: true,
                    json: async () => ({ access_token: 'access-token', receivedBody: String(init.body) })
                };
            }
            return {
                ok: true,
                json: async () => ({ sub: 'user-1' })
            };
        };
        try {
            const ctx = new ContextStub(new AdapterStub({ query: { code: 'code-1' } })) as unknown as RequestContext;
            const user = await service.handleCallback(ctx, options);
            expect(user.sub).toBe('user-1');

            const token = await service.exchangeAuthorizationCode('code-1', options);
            expect(token.access_token).toBe('access-token');
            expect(token.receivedBody).toContain('grant_type=authorization_code');

            const userInfo = await service.fetchUserInfo('access-token', new OAuth2Options(
                'client-id',
                'client-secret',
                'https://issuer.example/auth',
                'https://issuer.example/token',
                '',
                'https://app.example/callback'
            ));
            expect(userInfo.sub).toBe('user-1');
        } finally {
            fetchMod.fetch = originalFetch;
        }

        const fetchMod2 = require('cross-fetch');
        const originalFetch2 = fetchMod2.fetch;
        fetchMod2.fetch = async (url: string) => ({
            ok: false,
            statusText: String(url).includes('/token') ? 'Bad Request' : 'Unauthorized'
        });
        try {
            await expect(service.exchangeAuthorizationCode('code-1', options)).rejects.toThrow('Token request failed: Bad Request');
            await expect(service.fetchUserInfo('access-token', options)).rejects.toThrow('User info request failed: Unauthorized');
            await expect(service.handleCallback(new ContextStub(new AdapterStub()) as unknown as RequestContext, options)).rejects.toThrow('Authorization code not found');
            await expect(service.handleCallback(new ContextStub(new AdapterStub({ query: { code: 'code-1' } })) as unknown as RequestContext, options)).rejects.toThrow('Token request failed: Bad Request');
        } finally {
            fetchMod2.fetch = originalFetch2;
        }
    }

    @Test('oauth2 interceptor handles callback redirect and authenticated pass-through')
    async oauth2InterceptorBranches() {
        const interceptor = new OAuth2InterceptorStub();
        const options = new OAuth2Options(
            'client-id',
            'client-secret',
            'https://issuer.example/auth',
            'https://issuer.example/token',
            'https://issuer.example/profile',
            'https://app.example/callback',
            ['openid']
        );
        const authenticator = new AuthenticatorStub();
        const next = { handle: () => of({ ok: true }) } as any;

        const callbackCtx = new ContextStub(new AdapterStub({ path: '/oauth/callback', query: { code: 'code-1' } }), [
            { provide: OAuth2Options, useValue: options },
            { provide: Authenticator, useValue: authenticator }
        ]) as unknown as RequestContext;
        const callbackResult = await lastValueFrom(interceptor.intercept(callbackCtx, next, undefined));
        expect(callbackResult).toEqual({ ok: true });
        expect(authenticator.loginCalls[0]).toEqual({ sub: 'oauth-user' });

        const authedCtx = new ContextStub(new AdapterStub({ path: '/secure', session: { user: { id: 'u-1' } } }), [
            { provide: OAuth2Options, useValue: options },
            { provide: Authenticator, useValue: authenticator }
        ]) as unknown as RequestContext;
        expect(await lastValueFrom(interceptor.intercept(authedCtx, next, undefined))).toEqual({ ok: true });

        const redirectAdapter = new AdapterStub({ path: '/secure' });
        const redirectCtx = new ContextStub(redirectAdapter, [
            { provide: OAuth2Options, useValue: options },
            { provide: Authenticator, useValue: authenticator }
        ]) as unknown as RequestContext;
        interceptor.intercept(redirectCtx, next, undefined).pipe(take(1), timeout(20)).subscribe({ error: () => void 0 });
        expect(redirectAdapter.redirectedTo).toBe('https://issuer.example/auth?client_id=client-id&redirect_uri=https%3A%2F%2Fapp.example%2Fcallback&response_type=code&scope=openid');

        await expect(lastValueFrom(interceptor.intercept(
            new ContextStub(new AdapterStub({ path: '/oauth/callback' }), [
                { provide: OAuth2Options, useValue: options },
                { provide: Authenticator, useValue: authenticator }
            ]) as unknown as RequestContext,
            next,
            undefined
        ))).rejects.toThrow('No authorization code provided');
    }

    @Test('oidc service validates tokens userinfo normalization and claim failures')
    async oidcServiceBranches() {
        const jwtService = {
            decodeHeader: (_t: string) => ({ kid: 'kid-1' }),
            verify: async (_t: string, _o: any) => ({
                sub: 'user-1',
                exp: Math.floor(Date.now() / 1000) + 60,
                iat: Math.floor(Date.now() / 1000) - 10,
                iss: 'https://issuer.example',
                aud: ['client-id']
            }),
            importKey: (key: any) => `pem:${key.kid}`
        } as any;
        const service = new OIDCService(jwtService);
        const options = new OIDCOptions(
            'client-id',
            'client-secret',
            'https://issuer.example/auth',
            'https://issuer.example/token',
            'https://issuer.example/profile',
            'https://app.example/callback',
            'https://issuer.example',
            'https://issuer.example/jwks'
        );

        const fetchMod = require('cross-fetch');
        const originalFetch = fetchMod.fetch;
        fetchMod.fetch = async (url: string, init?: any) => {
            if (String(url).includes('/jwks')) {
                return { json: async () => ({ keys: [{ kid: 'kid-1', kty: 'RSA' }] }) };
            }
            return {
                ok: true,
                json: async () => ({ id: 'fallback-id', email_verified: undefined, phone_number_verified: undefined, init })
            };
        };
        try {
            const decoded = await service.validateIDToken('id-token', options);
            expect(decoded.sub).toBe('user-1');

            const userInfo = await service.getUserInfo('access-token', options);
            expect(userInfo.sub).toBe('fallback-id');
            expect(userInfo.email_verified).toBe(false);
            expect(userInfo.phone_number_verified).toBe(false);
        } finally {
            fetchMod.fetch = originalFetch;
        }

        const missingJwks = new OIDCService(jwtService);
        await expect(missingJwks.validateIDToken('id-token', new OIDCOptions(
            'client-id',
            'client-secret',
            'https://issuer.example/auth',
            'https://issuer.example/token',
            'https://issuer.example/profile',
            'https://app.example/callback',
            'https://issuer.example'
        ))).rejects.toThrow('JWKS URI not configured');

        const fetchMod2 = require('cross-fetch');
        const originalFetch2 = fetchMod2.fetch;
        fetchMod2.fetch = async () => ({ json: async () => ({ keys: [] }) });
        try {
            await expect(service.validateIDToken('id-token', options)).rejects.toThrow('Public key not found');
        } finally {
            fetchMod2.fetch = originalFetch2;
        }

        const now = Math.floor(Date.now() / 1000);
        const failingJwt = {
            decodeHeader: (_t: string) => ({ kid: 'kid-1' }),
            verify: async (_t: string, _o: any) => ({ sub: 'user-1', exp: now - 10, iat: now - 20, iss: 'https://issuer.example', aud: ['client-id'] }),
            importKey: (key: any) => `pem:${key.kid}`
        } as any;
        const fetchMod3 = require('cross-fetch');
        const originalFetch3 = fetchMod3.fetch;
        fetchMod3.fetch = async () => ({ json: async () => ({ keys: [{ kid: 'kid-1', kty: 'RSA' }] }) });
        try {
            await expect(new OIDCService(failingJwt).validateIDToken('id-token', options)).rejects.toThrow('Token expired');

            failingJwt.verify = async () => ({ sub: 'user-1', exp: now + 60, iat: now + 60, iss: 'https://issuer.example', aud: ['client-id'] });
            await expect(new OIDCService(failingJwt).validateIDToken('id-token', options)).rejects.toThrow('Token issued in the future');

            failingJwt.verify = async () => ({ sub: 'user-1', exp: now + 60, iat: now - 10, iss: 'https://wrong-issuer', aud: ['client-id'] });
            await expect(new OIDCService(failingJwt).validateIDToken('id-token', options)).rejects.toThrow('Invalid issuer');

            failingJwt.verify = async () => ({ sub: 'user-1', exp: now + 60, iat: now - 10, iss: 'https://issuer.example', aud: ['other-client'] });
            await expect(new OIDCService(failingJwt).validateIDToken('id-token', options)).rejects.toThrow('Invalid audience');
        } finally {
            fetchMod3.fetch = originalFetch3;
        }
    }

    @Test('oidc interceptor handles callback and no-code failure')
    async oidcInterceptorBranches() {
        const oidcService = new OIDCServiceStub() as any;
        const interceptor = new OIDCInterceptorStub(oidcService);
        const options = new OIDCOptions(
            'client-id',
            'client-secret',
            'https://issuer.example/auth',
            'https://issuer.example/token',
            'https://issuer.example/profile',
            'https://app.example/callback',
            'https://issuer.example',
            'https://issuer.example/jwks'
        );
        const authenticator = new AuthenticatorStub();
        const next = { handle: () => of({ ok: true }) } as any;

        const ctx = new ContextStub(new AdapterStub({ path: '/oauth/callback', query: { code: 'code-1' } }), [
            { provide: OIDCOptions, useValue: options },
            { provide: Authenticator, useValue: authenticator }
        ]) as unknown as RequestContext;
        expect(await lastValueFrom(interceptor.intercept(ctx, next, undefined))).toEqual({ ok: true });
        expect(oidcService.validated).toEqual(['id-token']);
        expect(oidcService.userInfos).toEqual(['access-token']);
        expect(authenticator.loginCalls[0].sub).toBe('oidc-user');

        const noCodeAdapter = new AdapterStub({ path: '/oauth/callback', query: {} });
        const noCodeCtx = new ContextStub(noCodeAdapter, [
            { provide: OIDCOptions, useValue: options },
            { provide: Authenticator, useValue: authenticator }
        ]) as unknown as RequestContext;
        await expect(lastValueFrom(interceptor.intercept(noCodeCtx, next, undefined))).rejects.toBeInstanceOf(NoOpenIDException);
    }

    @Test('oauth interceptor redirects and validates bearer token via provider userinfo')
    async oauthInterceptorBranches() {
        const fetchMod = require('cross-fetch');
        const originalFetch = global.fetch;
        (global as any).fetch = async (_url: string, _init?: any) => ({
            json: async () => ({ sub: 'oauth-user' })
        });
        try {
            const interceptor = new OAuthInterceptor();
            const option = new OAuthOption(
                'client-id',
                'client-secret',
                'https://issuer.example/auth',
                'https://issuer.example/token',
                'https://app.example/callback',
                ['openid', 'profile']
            );
            const authenticator = new AuthenticatorStub();
            const next = { handle: () => of({ ok: true }) } as any;

            const authedCtx = new ContextStub(new AdapterStub({
                headers: { authorization: 'Bearer access-token' }
            }), [
                { provide: OAuthOption, useValue: option },
                { provide: Authenticator, useValue: authenticator }
            ]) as unknown as RequestContext;
            expect(await lastValueFrom(interceptor.intercept(authedCtx, next, undefined))).toEqual({ ok: true });
            expect(authenticator.loginCalls[0].sub).toBe('oauth-user');

            const redirectAdapter = new AdapterStub();
            const redirectCtx = new ContextStub(redirectAdapter, [
                { provide: OAuthOption, useValue: option },
                { provide: Authenticator, useValue: authenticator }
            ]) as unknown as RequestContext;
            await expect(lastValueFrom(interceptor.intercept(redirectCtx, next, undefined))).rejects.toThrow('Redirecting to authorization');
            expect(redirectAdapter.redirectedTo).toBe('https://issuer.example/auth?client_id=client-id&redirect_uri=https%3A%2F%2Fapp.example%2Fcallback&response_type=code&scope=openid+profile');
        } finally {
            (global as any).fetch = originalFetch;
            void fetchMod;
        }
    }

    @Test('oauth callback exchanges code for tokens')
    async oauthCallback() {
        const callback = new OAuthCallback();
        const option = new OAuthOption(
            'client-id',
            'client-secret',
            'https://issuer.example/auth',
            'https://issuer.example/token',
            'https://app.example/callback',
            ['openid']
        );
        const fetchMod = require('cross-fetch');
        const originalFetch = fetchMod.fetch;
        fetchMod.fetch = async (_url: string, init?: any) => ({
            json: async () => ({ access_token: 'access-token', body: String(init.body) })
        });
        try {
            const ctx = new ContextStub(new AdapterStub({ query: { code: 'code-1' } }), [
                { provide: OAuthOption, useValue: option }
            ]) as unknown as RequestContext;
            const result = await callback.handleCallback(ctx);
            expect(result.access_token).toBe('access-token');
            expect(result.body).toContain('grant_type=authorization_code');
            expect(result.body).toContain('code=code-1');
        } finally {
            fetchMod.fetch = originalFetch;
        }
    }
}
