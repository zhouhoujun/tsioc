import { randomBytes } from 'crypto';
import { Injectable } from '@tsdi/ioc';
import { OIDCOptions, OIDCService as SecurityOIDCService, OAuth2Service } from '@tsdi/security';

export interface OIDCAuthChallenge {
    url: string;
    state: string;
    nonce: string;
}

@Injectable()
export class OIDCService {
    private readonly options: OIDCOptions;

    constructor(
        private oauth2: OAuth2Service,
        private oidc: SecurityOIDCService
    ) {
        this.options = new OIDCOptions(
            process.env.OIDC_CLIENT_ID || '',
            process.env.OIDC_CLIENT_SECRET || '',
            process.env.OIDC_AUTHORIZATION_URL || '',
            process.env.OIDC_TOKEN_URL || '',
            process.env.OIDC_PROFILE_URL || '',
            process.env.OIDC_CALLBACK_URL || '',
            process.env.OIDC_ISSUER || '',
            process.env.OIDC_JWKS_URI || '',
            ['openid', 'profile', 'email']
        );
    }

    authenticate(state?: string, nonce?: string): OIDCAuthChallenge {
        const challengeState = state || randomBytes(16).toString('hex');
        const challengeNonce = nonce || randomBytes(16).toString('hex');
        const options = new OIDCOptions(
            this.options.clientId,
            this.options.clientSecret,
            this.options.authorizationURL,
            this.options.tokenURL,
            this.options.profileURL,
            this.options.callbackURL,
            this.options.issuer,
            this.options.jwksURI,
            this.options.scope,
            challengeState,
            challengeNonce,
            this.options.prompt,
            this.options.loginHint
        );
        return {
            url: this.oauth2.buildAuthorizationUrl(options, challengeState),
            state: challengeState,
            nonce: challengeNonce
        };
    }

    async authenticateCallback(code: string, state: string, expectedState: string, expectedNonce: string): Promise<any> {
        if (!code) {
            throw new Error('Authorization code not found');
        }
        if (!state || state !== expectedState) {
            throw new Error('Invalid state');
        }
        const tokens = await this.oauth2.exchangeAuthorizationCode(code, this.options);
        if (!tokens.id_token) {
            throw new Error('Missing id token');
        }
        const claims = await this.oidc.validateIDToken(tokens.id_token, this.options);
        if (!claims?.sub) {
            throw new Error('Missing subject claim');
        }
        if (expectedNonce && claims.nonce !== expectedNonce) {
            throw new Error('Invalid nonce');
        }
        const user = tokens.access_token ? await this.oidc.getUserInfo(tokens.access_token, this.options) : claims;
        return {
            user,
            claims,
            tokens: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                idToken: tokens.id_token,
                expiresIn: tokens.expires_in,
                tokenType: tokens.token_type
            }
        };
    }
}
