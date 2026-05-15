import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { OIDCService } from '../src/auth/OIDCService';

class OAuth2ServiceStub {
    options?: any;
    code?: string;

    buildAuthorizationUrl(options: any, state?: string): string {
        this.options = options;
        return `https://issuer.example/auth?state=${state ?? ''}`;
    }

    async exchangeAuthorizationCode(code: string, options: any): Promise<any> {
        this.code = code;
        this.options = options;
        return {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            id_token: 'id-token',
            expires_in: 3600,
            token_type: 'Bearer'
        };
    }
}

class SecurityOIDCServiceStub {
    async validateIDToken(idToken: string, _options: any): Promise<any> {
        return { sub: 'user-1', token: idToken, nonce: 'nonce-1' };
    }

    async getUserInfo(accessToken: string, _options: any): Promise<any> {
        return { sub: 'user-1', accessToken };
    }
}

@Suite('OIDC auth facade')
export class OIDCServiceTest {
    @Test('authenticate delegates to shared oauth2 service')
    authenticate() {
        const service = new OIDCService(new OAuth2ServiceStub() as any, new SecurityOIDCServiceStub() as any);
        const challenge = service.authenticate('state-1', 'nonce-1');
        expect(challenge.url).toContain('state=state-1');
        expect(challenge.state).toBe('state-1');
        expect(challenge.nonce).toBe('nonce-1');
    }

    @Test('authenticate callback delegates to shared security services')
    async authenticateCallback() {
        const service = new OIDCService(new OAuth2ServiceStub() as any, new SecurityOIDCServiceStub() as any);
        const result = await service.authenticateCallback('code-1', 'state-1', 'state-1', 'nonce-1');
        expect(result.claims.sub).toBe('user-1');
        expect(result.user.accessToken).toBe('access-token');
        expect(result.tokens.idToken).toBe('id-token');
    }
}
