import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { OIDCModule, provideOIDC } from '../src';
import { OIDCService, SessionUser } from '../src/auth/OIDCService';

interface TokenResponse {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
    expires_in?: number;
    token_type?: string;
}

class FaultyTokenStub {
    options?: any;
    code?: string;
    nextResponse: TokenResponse = {};

    buildAuthorizationUrl(options: any, state?: string): string {
        this.options = options;
        return `https://issuer.example/auth?state=${state ?? ''}`;
    }

    async exchangeAuthorizationCode(code: string, options: any): Promise<TokenResponse> {
        this.code = code;
        this.options = options;
        return { ...this.nextResponse };
    }
}

class FaultyOIDCStub {
    nextClaims: any = null;
    nextUserInfo: any = null;

    async validateIDToken(_idToken: string, _options: any): Promise<any> {
        return this.nextClaims;
    }

    async getUserInfo(_accessToken: string, _options: any): Promise<any> {
        return this.nextUserInfo;
    }
}

class JWTServiceStub {
    async sign(payload: any, _options: any): Promise<string> {
        return `signed-token-for-${payload.sub}`;
    }

    async verify(token: string, _options: any): Promise<any> {
        if (token === 'invalid-token') return null;
        if (token === 'no-sub-token') return { iss: 'tsioc-oidc-auth' };
        return {
            sub: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
            email_verified: true,
            picture: 'https://example.com/avatar.png',
            provider: 'https://issuer.example'
        };
    }
}

function makeTokenResponse(overrides?: Partial<TokenResponse>): TokenResponse {
    return {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        id_token: 'id-token',
        expires_in: 3600,
        token_type: 'Bearer',
        ...overrides
    };
}

@Suite('OIDC auth facade')
export class OIDCServiceTest {
    private createService(
        oauth2Stub?: any,
        oidcStub?: any
    ): OIDCService {
        return new OIDCService(
            oauth2Stub || {
                buildAuthorizationUrl: (_o: any, s: string) => `https://issuer.example/auth?state=${s ?? ''}`,
                exchangeAuthorizationCode: async () => makeTokenResponse()
            } as any,
            oidcStub || {
                validateIDToken: async (t: string) => ({ sub: 'user-1', token: t, nonce: 'nonce-1', iss: 'https://issuer.example', name: 'Test User', email: 'test@example.com' }),
                getUserInfo: async (at: string) => ({ sub: 'user-1', accessToken: at, name: 'Test User', email: 'test@example.com', email_verified: true, picture: 'https://example.com/avatar.png' })
            } as any,
            new JWTServiceStub() as any
        );
    }

    @Test('returns issuer from options')
    issuer() {
        const service = this.createService();
        expect(typeof service.issuer).toBe('string');
    }

    @Test('authenticate delegates to shared oauth2 service')
    authenticate() {
        const service = this.createService();
        const challenge = service.authenticate('state-1', 'nonce-1');
        expect(challenge.url).toContain('state=state-1');
        expect(challenge.state).toBe('state-1');
        expect(challenge.nonce).toBe('nonce-1');
    }

    @Test('authenticate generates random state and nonce when not provided')
    authenticateWithoutParams() {
        const service = this.createService();
        const challenge = service.authenticate();
        expect(challenge.state).toBeTruthy();
        expect(challenge.nonce).toBeTruthy();
        expect(challenge.state.length).toBe(32);
        expect(challenge.nonce.length).toBe(32);
    }

    @Test('handleCallback returns user and tokens')
    async handleCallback() {
        const service = this.createService();
        const result = await service.handleCallback('code-1', 'state-1', 'state-1', 'nonce-1');
        expect(result.claims.sub).toBe('user-1');
        expect((result.user as any).email).toBe('test@example.com');
        expect(result.tokens.accessToken).toBe('access-token');
        expect(result.tokens.idToken).toBe('id-token');
    }

    @Test('handleCallback throws when code is missing')
    async handleCallbackMissingCode() {
        const service = this.createService();
        await expect(
            service.handleCallback('', 'state-1', 'state-1', 'nonce-1')
        ).rejects.toThrow('Authorization code not found');
    }

    @Test('handleCallback throws on state mismatch')
    async handleCallbackStateMismatch() {
        const service = this.createService();
        await expect(
            service.handleCallback('code-1', 'state-1', 'different-state', 'nonce-1')
        ).rejects.toThrow('Invalid state');
    }

    @Test('handleCallback throws when state is empty')
    async handleCallbackEmptyState() {
        const service = this.createService();
        await expect(
            service.handleCallback('code-1', '', '', 'nonce-1')
        ).rejects.toThrow('Invalid state');
    }

    @Test('handleCallback throws when id_token is missing')
    async handleCallbackMissingIdToken() {
        const oauth2 = new FaultyTokenStub();
        oauth2.nextResponse = makeTokenResponse({ id_token: undefined });
        const service = this.createService(oauth2);
        await expect(
            service.handleCallback('code-1', 'state-1', 'state-1', 'nonce-1')
        ).rejects.toThrow('Missing id_token');
    }

    @Test('handleCallback throws when sub claim is missing')
    async handleCallbackMissingSub() {
        const oidc = new FaultyOIDCStub();
        oidc.nextClaims = { nonce: 'nonce-1', iss: 'https://issuer.example' };
        const service = this.createService(undefined, oidc);
        await expect(
            service.handleCallback('code-1', 'state-1', 'state-1', 'nonce-1')
        ).rejects.toThrow('Missing sub claim');
    }

    @Test('handleCallback throws on nonce mismatch')
    async handleCallbackNonceMismatch() {
        const oidc = new FaultyOIDCStub();
        oidc.nextClaims = { sub: 'user-1', nonce: 'wrong-nonce', iss: 'https://issuer.example' };
        const service = this.createService(undefined, oidc);
        await expect(
            service.handleCallback('code-1', 'state-1', 'state-1', 'expected-nonce')
        ).rejects.toThrow('Invalid nonce');
    }

    @Test('handleCallback falls back to claims when no access token')
    async handleCallbackNoAccessToken() {
        const oauth2 = new FaultyTokenStub();
        oauth2.nextResponse = makeTokenResponse({ access_token: undefined });
        const oidc = new FaultyOIDCStub();
        oidc.nextClaims = { sub: 'user-1', nonce: 'nonce-1', iss: 'https://issuer.example', name: 'Fallback User' };
        const service = this.createService(oauth2, oidc);
        const result = await service.handleCallback('code-1', 'state-1', 'state-1', 'nonce-1');
        expect((result.user as any).name).toBe('Fallback User');
    }

    @Test('createSessionToken generates a JWT')
    async createSessionToken() {
        const service = this.createService();
        const user: SessionUser = {
            sub: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
            emailVerified: true,
            provider: 'https://issuer.example'
        };
        const token = await service.createSessionToken(user);
        expect(token).toBe('signed-token-for-user-1');
    }

    @Test('verifySessionToken returns user for valid token')
    async verifySessionTokenValid() {
        const service = this.createService();
        const user = await service.verifySessionToken('valid-token');
        expect(user).toBeTruthy();
        expect(user?.sub).toBe('user-1');
        expect(user?.email).toBe('test@example.com');
    }

    @Test('verifySessionToken returns null for invalid token')
    async verifySessionTokenInvalid() {
        const service = this.createService();
        const user = await service.verifySessionToken('invalid-token');
        expect(user).toBeNull();
    }

    @Test('verifySessionToken returns null when decoded sub is missing')
    async verifySessionTokenMissingSub() {
        const service = this.createService();
        const user = await service.verifySessionToken('no-sub-token');
        expect(user).toBeNull();
    }

    @Test('refreshAccessToken returns new token set')
    async refreshAccessToken() {
        const service = this.createService();
        const tokens = await service.refreshAccessToken('refresh-token-1');
        expect(tokens.accessToken).toBe('access-token');
        expect(tokens.refreshToken).toBe('refresh-token');
    }

    @Test('refreshAccessToken throws when refresh token is empty')
    async refreshAccessTokenEmpty() {
        const service = this.createService();
        await expect(
            service.refreshAccessToken('')
        ).rejects.toThrow('Refresh token is required');
    }

    @Test('provideOIDC returns full providers and withOptions returns option providers')
    provideModuleShape() {
        const options = {
            clientId: 'client-id',
            clientSecret: 'client-secret',
            authorizationURL: 'https://issuer.example/auth',
            tokenURL: 'https://issuer.example/token',
            profileURL: 'https://issuer.example/profile',
            callbackURL: 'https://app.example/callback',
            issuer: 'https://issuer.example'
        };
        const providers = provideOIDC(options);
        expect(Array.isArray(providers)).toBe(true);
        expect(providers.length).toBeGreaterThan(0);

        const result = OIDCModule.withOptions(options);
        expect(result.module).toBe(OIDCModule);
        expect(Array.isArray(result.providers)).toBe(true);
        expect(result.providers?.length).toBeGreaterThan(0);
        expect((result.providers as any[]).length).toBeLessThan(providers.length);
    }
}
