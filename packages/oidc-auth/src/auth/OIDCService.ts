import { randomBytes } from 'crypto';
import { Injectable } from '@tsdi/ioc';
import { OIDCOptions, OIDCService as SecurityOIDCService, OAuth2Service, JWTService } from '@tsdi/security';

export interface OIDCAuthChallenge {
    url: string;
    state: string;
    nonce: string;
}

export interface OIDCTokenSet {
    accessToken: string;
    refreshToken?: string;
    idToken: string;
    expiresIn?: number;
    tokenType?: string;
}

export interface OIDCAuthResult {
    user: Record<string, unknown>;
    claims: Record<string, unknown>;
    tokens: OIDCTokenSet;
}

export interface SessionUser {
    sub: string;
    name?: string;
    email?: string;
    emailVerified?: boolean;
    picture?: string;
    provider: string;
    raw?: Record<string, unknown>;
}

@Injectable()
export class OIDCService {
    private readonly options: OIDCOptions;

    constructor(
        private oauth2: OAuth2Service,
        private oidc: SecurityOIDCService,
        private jwt: JWTService
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

    get issuer(): string {
        return this.options.issuer;
    }

    authenticate(state?: string, nonce?: string): OIDCAuthChallenge {
        const challengeState = state || randomBytes(16).toString('hex');
        const challengeNonce = nonce || randomBytes(16).toString('hex');
        const opts = new OIDCOptions(
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
            url: this.oauth2.buildAuthorizationUrl(opts, challengeState),
            state: challengeState,
            nonce: challengeNonce
        };
    }

    async handleCallback(code: string, state: string, expectedState: string, expectedNonce: string): Promise<OIDCAuthResult> {
        if (!code) {
            throw new Error('Authorization code not found');
        }
        if (!state || state !== expectedState) {
            throw new Error('Invalid state parameter');
        }

        const tokens = await this.oauth2.exchangeAuthorizationCode(code, this.options);
        if (!tokens.id_token) {
            throw new Error('Missing id_token in token response');
        }

        const claims = await this.oidc.validateIDToken(tokens.id_token, this.options);
        if (!claims?.sub) {
            throw new Error('Missing sub claim in ID token');
        }

        if (expectedNonce && claims.nonce !== expectedNonce) {
            throw new Error('Invalid nonce claim');
        }

        const userInfo = tokens.access_token
            ? await this.oidc.getUserInfo(tokens.access_token, this.options)
            : claims;

        const user: SessionUser = {
            sub: claims.sub,
            name: userInfo.name ?? claims.name,
            email: userInfo.email ?? claims.email,
            emailVerified: userInfo.email_verified ?? claims.email_verified ?? false,
            picture: userInfo.picture ?? claims.picture,
            provider: claims.iss ?? this.options.issuer,
            raw: { ...claims, ...userInfo }
        };

        return {
            user: user as unknown as Record<string, unknown>,
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

    async createSessionToken(user: SessionUser): Promise<string> {
        const payload = {
            sub: user.sub,
            name: user.name,
            email: user.email,
            email_verified: user.emailVerified,
            picture: user.picture,
            provider: user.provider
        };
        return this.jwt.sign(payload, {
            expiresIn: (process.env.OIDC_SESSION_EXPIRES_IN || '24h') as unknown as number,
            algorithm: 'HS256',
            issuer: process.env.OIDC_SESSION_ISSUER || 'tsioc-oidc-auth'
        });
    }

    async verifySessionToken(token: string): Promise<SessionUser | null> {
        try {
            const decoded = await this.jwt.verify(token, {
                issuer: process.env.OIDC_SESSION_ISSUER || 'tsioc-oidc-auth'
            });
            if (!decoded?.sub) {
                return null;
            }
            return decoded as SessionUser;
        } catch {
            return null;
        }
    }

    async refreshAccessToken(refreshToken: string): Promise<OIDCTokenSet> {
        if (!refreshToken) {
            throw new Error('Refresh token is required');
        }
        const tokens = await this.oauth2.exchangeAuthorizationCode(refreshToken, this.options);
        return {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            idToken: tokens.id_token,
            expiresIn: tokens.expires_in,
            tokenType: tokens.token_type
        };
    }
}
