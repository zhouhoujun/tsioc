import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AuthController } from '../src/controllers/AuthController';
import { SessionUser, OIDCTokenSet } from '../src/auth/OIDCService';

class OIDCServiceStub {
    authResult: any = {
        user: { sub: 'user-1', email: 'test@example.com' },
        claims: { sub: 'user-1' },
        tokens: {
            accessToken: 'at',
            refreshToken: 'rt',
            idToken: 'idt',
            expiresIn: 3600,
            tokenType: 'Bearer'
        }
    };
    sessionUser: SessionUser = { sub: 'user-1', email: 'test@example.com', provider: 'issuer' };
    sessionToken: string = 'session-token-jwt';
    refreshTokens: OIDCTokenSet = { accessToken: 'new-at', refreshToken: 'new-rt', idToken: 'new-idt' };
    shouldThrowOnRefresh = false;

    authenticate(state?: string, nonce?: string) {
        return {
            url: `https://issuer.example/auth?state=${state ?? 's1'}`,
            state: state ?? 's1',
            nonce: nonce ?? 'n1'
        };
    }

    async handleCallback(_code: string, _state: string, expectedState: string, expectedNonce: string): Promise<any> {
        return {
            ...this.authResult,
            expectedState,
            expectedNonce
        };
    }

    async createSessionToken(_user: SessionUser): Promise<string> {
        return this.sessionToken;
    }

    async verifySessionToken(token: string): Promise<SessionUser | null> {
        if (token === this.sessionToken) {
            return this.sessionUser;
        }
        return null;
    }

    get issuer(): string {
        return 'https://issuer.example';
    }

    async refreshAccessToken(_refreshToken: string): Promise<OIDCTokenSet> {
        if (this.shouldThrowOnRefresh) {
            throw new Error('Provider refresh failed');
        }
        return this.refreshTokens;
    }
}

function createContext() {
    const store = new Map<string, string>();
    const resHeaders: Record<string, string> = {};
    let statusCode = 200;

    return {
        secure: false,
        response: {
            get statusCode() { return statusCode; },
            set statusCode(v: number) { statusCode = v; },
            getHeader: (name: string) => resHeaders[name],
            setHeader: (name: string, value: string) => { resHeaders[name] = value; }
        },
        request: {
            headers: {} as Record<string, unknown>
        },
        cookies: {
            set(name: string, value?: string, _opts?: any) {
                if (typeof value === 'undefined' || (_opts?.maxAge === 0)) {
                    store.delete(name);
                    return;
                }
                store.set(name, value);
            },
            get(name: string) {
                return store.get(name);
            }
        }
    } as any;
}

@Suite('OIDC auth controller')
export class AuthControllerTest {
    @Test('login stores state and nonce cookies')
    login() {
        const controller = new AuthController(new OIDCServiceStub() as any);
        const ctx = createContext();
        const result = controller.login(ctx);
        expect(result.url).toContain('state=s1');
        expect(ctx.cookies.get('oidc_state')).toBe('s1');
        expect(ctx.cookies.get('oidc_nonce')).toBe('n1');
    }

    @Test('callback reads and clears cookies, returns session token')
    async callback() {
        const controller = new AuthController(new OIDCServiceStub() as any);
        const ctx = createContext();
        ctx.cookies.set('oidc_state', 's1');
        ctx.cookies.set('oidc_nonce', 'n1');
        const result = await controller.callback(ctx, 'code-1', 'state-1');
        expect(result.sessionToken).toBe('session-token-jwt');
        expect((result.user as any).sub).toBe('user-1');
        expect(ctx.cookies.get('oidc_state')).toBe(undefined);
        expect(ctx.cookies.get('oidc_nonce')).toBe(undefined);
        expect(ctx.cookies.get('oidc_session')).toBe('session-token-jwt');
    }

    @Test('callback uses empty string when cookies are missing')
    async callbackNoCookies() {
        const stub = new OIDCServiceStub();
        stub.authResult = {
            user: { sub: 'anon' },
            claims: { sub: 'anon' },
            tokens: { accessToken: 'at', refreshToken: 'rt', idToken: 'idt' },
        };
        const controller = new AuthController(stub as any);
        const ctx = createContext();
        const result = await controller.callback(ctx, 'code-1', 'state-1');
        expect(result.sessionToken).toBe('session-token-jwt');
    }

    @Test('userinfo returns 401 when no token')
    async userinfoUnauthorized() {
        const controller = new AuthController(new OIDCServiceStub() as any);
        const ctx = createContext();
        const result = await controller.userinfo(ctx);
        expect(ctx.response.statusCode).toBe(401);
        expect((result as any).error).toContain('Not authenticated');
    }

    @Test('userinfo returns user data for valid session cookie')
    async userinfoWithSessionCookie() {
        const controller = new AuthController(new OIDCServiceStub() as any);
        const ctx = createContext();
        ctx.cookies.set('oidc_session', 'session-token-jwt');
        const result = await controller.userinfo(ctx);
        expect((result as SessionUser).sub).toBe('user-1');
        expect((result as SessionUser).email).toBe('test@example.com');
    }

    @Test('userinfo returns user data for valid Bearer token')
    async userinfoWithBearerToken() {
        const controller = new AuthController(new OIDCServiceStub() as any);
        const ctx = createContext();
        ctx.request.headers['authorization'] = 'Bearer session-token-jwt';
        const result = await controller.userinfo(ctx);
        expect((result as SessionUser).sub).toBe('user-1');
    }

    @Test('userinfo returns 401 for expired session token')
    async userinfoExpiredToken() {
        const controller = new AuthController(new OIDCServiceStub() as any);
        const ctx = createContext();
        ctx.cookies.set('oidc_session', 'expired-token');
        const result = await controller.userinfo(ctx);
        expect(ctx.response.statusCode).toBe(401);
        expect((result as any).error).toContain('Invalid or expired');
    }

    @Test('session returns authenticated:false when no token')
    async sessionUnauthenticated() {
        const controller = new AuthController(new OIDCServiceStub() as any);
        const ctx = createContext();
        const result = await controller.session(ctx);
        expect(result.authenticated).toBe(false);
    }

    @Test('session returns authenticated:true with valid token')
    async sessionAuthenticated() {
        const controller = new AuthController(new OIDCServiceStub() as any);
        const ctx = createContext();
        ctx.cookies.set('oidc_session', 'session-token-jwt');
        const result = await controller.session(ctx);
        expect(result.authenticated).toBe(true);
        expect(result.user?.sub).toBe('user-1');
    }

    @Test('session returns authenticated:false with invalid token')
    async sessionInvalidToken() {
        const controller = new AuthController(new OIDCServiceStub() as any);
        const ctx = createContext();
        ctx.cookies.set('oidc_session', 'wrong-token');
        const result = await controller.session(ctx);
        expect(result.authenticated).toBe(false);
    }

    @Test('logout clears all cookies')
    logout() {
        const controller = new AuthController(new OIDCServiceStub() as any);
        const ctx = createContext();
        ctx.cookies.set('oidc_session', 'session-token-jwt');
        ctx.cookies.set('oidc_state', 's1');
        ctx.cookies.set('oidc_nonce', 'n1');
        const result = controller.logout(ctx);
        expect(result.status).toBe('ok');
        expect(ctx.cookies.get('oidc_session')).toBe(undefined);
        expect(ctx.cookies.get('oidc_state')).toBe(undefined);
        expect(ctx.cookies.get('oidc_nonce')).toBe(undefined);
    }

    @Test('refresh returns 400 when no refresh token')
    async refreshMissingToken() {
        const controller = new AuthController(new OIDCServiceStub() as any);
        const ctx = createContext();
        const result = await controller.refresh(ctx, {} as any);
        expect(ctx.response.statusCode).toBe(400);
        expect((result as any).error).toBeTruthy();
    }

    @Test('refresh returns 400 when refresh token is empty string')
    async refreshEmptyToken() {
        const controller = new AuthController(new OIDCServiceStub() as any);
        const ctx = createContext();
        await controller.refresh(ctx, { refreshToken: '' });
        expect(ctx.response.statusCode).toBe(400);
    }

    @Test('refresh returns new tokens on success')
    async refreshSuccess() {
        const controller = new AuthController(new OIDCServiceStub() as any);
        const ctx = createContext();
        const result = await controller.refresh(ctx, { refreshToken: 'rt' });
        expect((result as any).tokens.accessToken).toBe('new-at');
    }

    @Test('refresh handles provider error')
    async refreshProviderError() {
        const stub = new OIDCServiceStub();
        stub.shouldThrowOnRefresh = true;
        const controller = new AuthController(stub as any);
        const ctx = createContext();
        const result = await controller.refresh(ctx, { refreshToken: 'rt' });
        expect(ctx.response.statusCode).toBe(400);
        expect((result as any).error).toContain('Provider refresh failed');
    }

    @Test('userinfo prefers Bearer token over session cookie')
    async userinfoPrefersBearer() {
        const controller = new AuthController(new OIDCServiceStub() as any);
        const ctx = createContext();
        ctx.request.headers['authorization'] = 'Bearer session-token-jwt';
        ctx.cookies.set('oidc_session', 'old-cookie-token');
        const result = await controller.userinfo(ctx);
        expect((result as SessionUser).sub).toBe('user-1');
    }

    @Test('userinfo ignores malformed authorization header')
    async userinfoMalformedAuth() {
        const stub = new OIDCServiceStub();
        stub.sessionToken = 'cookie-only-token';
        const controller = new AuthController(stub as any);
        const ctx = createContext();
        ctx.request.headers['authorization'] = 'Basic dGVzdDp0ZXN0';
        ctx.cookies.set('oidc_session', 'cookie-only-token');
        const result = await controller.userinfo(ctx);
        expect((result as SessionUser).sub).toBe('user-1');
    }

    @Test('openid configuration uses localhost when no host header')
    openidConfigurationDefaultHost() {
        const controller = new AuthController(new OIDCServiceStub() as any);
        const ctx = createContext();
        const result = controller.openidConfiguration(ctx);
        expect(result.issuer).toBe('https://issuer.example');
        expect(result.authorization_endpoint).toContain('localhost');
    }

    @Test('openid configuration returns well-known metadata')
    openidConfiguration() {
        const controller = new AuthController(new OIDCServiceStub() as any);
        const ctx = createContext();
        ctx.request.headers['host'] = 'auth.example.com';
        const result = controller.openidConfiguration(ctx);
        expect(result.issuer).toBe('https://issuer.example');
        expect(result.authorization_endpoint).toContain('auth.example.com');
        expect(result.token_endpoint).toContain('/auth/callback');
        expect(result.userinfo_endpoint).toContain('/auth/userinfo');
    }
}
