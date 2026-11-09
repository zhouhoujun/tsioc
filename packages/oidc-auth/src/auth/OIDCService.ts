import { randomBytes, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@tsdi/ioc';
import { OIDCOptions, OIDCService as SecurityOIDCService, OAuth2Service, JWTService } from '@tsdi/security';
import { OIDCAuthModuleOptions } from './options';
import { hashPassword, verifyPassword } from './password';
import {
    AuthUserRecord,
    InMemoryUserStore,
    normalizeEmail,
    normalizeUsername,
    UserStore
} from './UserStore';

export const OIDC_AUTH_MODULE_OPTIONS = 'OIDC_AUTH_MODULE_OPTIONS';

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
    /**
     * Browser friendly session token (same value as `idToken` for local login).
     */
    sessionToken?: string;
}

export interface OIDCAuthResult {
    user: Record<string, unknown>;
    claims: Record<string, unknown>;
    tokens: OIDCTokenSet;
}

export interface SessionUser {
    /**
     * Stable local user id. For OIDC users this is the persisted user id.
     */
    sub: string;
    username?: string;
    name?: string;
    email?: string;
    emailVerified?: boolean;
    picture?: string;
    provider: string;
    roles?: string[];
    raw?: Record<string, unknown>;
}

export interface OIDCLoginCredentials {
    username: string;
    password: string;
}

export interface OIDCRegisterInput extends OIDCLoginCredentials {
    email?: string;
    displayName?: string;
    roles?: string[];
}

export interface OIDCVerifiedToken {
    claims: Record<string, unknown> & { sub: string };
    user: SessionUser;
    tokenType: 'access' | 'session' | 'refresh' | 'unknown';
}

export interface OIDCIntrospectionResult {
    active: boolean;
    sub?: string;
    username?: string;
    email?: string;
    roles?: string[];
    scope?: string;
    tokenType?: string;
    exp?: number;
    iat?: number;
    iss?: string;
    aud?: string | string[];
    reason?: string;
}

@Injectable()
export class OIDCService {
    private readonly options: OIDCOptions;

    constructor(
        private oauth2: OAuth2Service,
        private oidc: SecurityOIDCService,
        private jwt: JWTService,
        @Inject(UserStore, { nullable: true }) private userStore: UserStore | null = new InMemoryUserStore(),
        @Inject(OIDC_AUTH_MODULE_OPTIONS, { nullable: true }) private moduleOptions: OIDCAuthModuleOptions | null = null
    ) {
        this.options = this.buildOptions();
    }

    get issuer(): string {
        return this.options.issuer;
    }

    get tokenIssuer(): string {
        return process.env.OIDC_SESSION_ISSUER
            || this.moduleOptions?.sessionIssuer
            || this.moduleOptions?.jwt?.issuer
            || this.moduleOptions?.issuer
            || 'tsioc-oidc-auth';
    }

    get tokenSecret(): string {
        return this.moduleOptions?.jwt?.secret
            || process.env.OIDC_SESSION_SECRET
            || process.env.JWT_SECRET
            || 'default-secret';
    }

    get tokenAlgorithm(): 'HS256' | 'HS384' | 'HS512' {
        return this.moduleOptions?.jwt?.algorithm ?? 'HS256';
    }

    get allowRegistration(): boolean {
        return this.moduleOptions?.allowRegistration === true
            || process.env.OIDC_ALLOW_REGISTRATION === 'true';
    }

    private buildOptions(): OIDCOptions {
        const auth = this.moduleOptions;
        const env = process.env;
        return new OIDCOptions(
            auth?.clientId || env.OIDC_CLIENT_ID || '',
            auth?.clientSecret || env.OIDC_CLIENT_SECRET || '',
            auth?.authorizationURL || env.OIDC_AUTHORIZATION_URL || '',
            auth?.tokenURL || env.OIDC_TOKEN_URL || '',
            auth?.profileURL || env.OIDC_PROFILE_URL || '',
            auth?.callbackURL || env.OIDC_CALLBACK_URL || '',
            auth?.issuer || env.OIDC_ISSUER || '',
            auth?.jwksURI || env.OIDC_JWKS_URI || '',
            auth?.scope || ['openid', 'profile', 'email']
        );
    }

    // ---------------------------------------------------------------------
    // OIDC authorization code flow
    // ---------------------------------------------------------------------

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
            sub: String(claims.sub),
            username: userInfo.preferred_username ?? claims.preferred_username,
            name: userInfo.name ?? claims.name,
            email: userInfo.email ?? claims.email,
            emailVerified: userInfo.email_verified ?? claims.email_verified ?? false,
            picture: userInfo.picture ?? claims.picture,
            provider: claims.iss ?? this.options.issuer,
            roles: normalizeRoles(userInfo.roles ?? claims.roles ?? claims.groups),
            raw: { ...claims, ...userInfo }
        };

        const persisted = await this.persistOidcUser(user);
        const localTokens = await this.issueTokens(persisted);

        return {
            user: persisted as unknown as Record<string, unknown>,
            claims,
            tokens: {
                ...localTokens,
                // Preserve the provider tokens for callers that need to call
                // provider APIs on behalf of the user.
                accessToken: tokens.access_token ?? localTokens.accessToken,
                refreshToken: tokens.refresh_token ?? localTokens.refreshToken,
                idToken: tokens.id_token ?? localTokens.idToken,
                expiresIn: tokens.expires_in,
                tokenType: tokens.token_type
            }
        };
    }

    // ---------------------------------------------------------------------
    // Local authentication
    // ---------------------------------------------------------------------

    async register(input: OIDCRegisterInput): Promise<OIDCAuthResult> {
        if (!this.allowRegistration) {
            throw new Error('Local registration is disabled');
        }
        const username = normalizeUsername(input?.username);
        const password = input?.password;
        if (!username) {
            throw new Error('Username is required');
        }
        if (typeof password !== 'string' || password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }
        const store = this.requireUserStore();
        if (await store.findByUsername(username)) {
            throw new Error('Username already exists');
        }
        const email = normalizeEmail(input.email);
        if (email && await store.findByEmail(email)) {
            throw new Error('Email already exists');
        }
        const record = await store.create({
            username,
            email,
            passwordHash: await hashPassword(password),
            displayName: input.displayName ?? username,
            roles: normalizeRoles(input.roles),
            provider: 'local',
            emailVerified: false
        });
        return this.authResultFromRecord(record);
    }

    async login(credentials: OIDCLoginCredentials): Promise<OIDCAuthResult> {
        const username = normalizeUsername(credentials?.username);
        if (!username || typeof credentials?.password !== 'string') {
            throw new Error('Invalid username or password');
        }
        const store = this.requireUserStore();
        const record = await store.findByUsername(username) ?? await store.findByEmail(username);
        if (!record?.passwordHash || !(await verifyPassword(credentials.password, record.passwordHash))) {
            throw new Error('Invalid username or password');
        }
        await store.touchLastLogin(record.id);
        return this.authResultFromRecord(record);
    }

    async createLocalUser(input: OIDCRegisterInput): Promise<SessionUser> {
        const username = normalizeUsername(input?.username);
        if (!username) {
            throw new Error('Username is required');
        }
        if (typeof input?.password !== 'string' || input.password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }
        const store = this.requireUserStore();
        const record = await store.create({
            username,
            email: normalizeEmail(input.email),
            passwordHash: await hashPassword(input.password),
            displayName: input.displayName ?? username,
            roles: normalizeRoles(input.roles),
            provider: 'local'
        });
        return this.toSessionUser(record);
    }

    // ---------------------------------------------------------------------
    // Token issuing / verification
    // ---------------------------------------------------------------------

    async createSessionToken(user: SessionUser): Promise<string> {
        return this.jwt.sign(this.toTokenPayload(user), this.signOptions(this.sessionExpiresIn()));
    }

    async verifySessionToken(token: string): Promise<SessionUser | null> {
        try {
            const claims = await this.verifyJwt(token);
            if (!claims?.sub) {
                return null;
            }
            const typ = claims.typ;
            if (typ && typ !== 'session') {
                return null;
            }
            return this.toSessionUserFromClaims(claims);
        } catch {
            return null;
        }
    }

    /**
     * Verify an access token issued by this service.
     * Returns `null` when the token is missing, expired, forged or of another kind.
     */
    async verifyAccessToken(token: string): Promise<OIDCVerifiedToken | null> {
        const claims = await this.verifyJwt(token);
        if (!claims?.sub || claims.typ !== 'access') {
            return null;
        }
        return {
            claims: claims as OIDCVerifiedToken['claims'],
            user: this.toSessionUserFromClaims(claims),
            tokenType: 'access'
        };
    }

    /**
     * Verify either an access token or a browser session token.
     */
    async verifyToken(token: string): Promise<OIDCVerifiedToken | null> {
        const claims = await this.verifyJwt(token);
        if (!claims?.sub) {
            return null;
        }
        const typ = claims.typ;
        if (typ && typ !== 'access' && typ !== 'session' && typ !== 'refresh') {
            return null;
        }
        return {
            claims: claims as OIDCVerifiedToken['claims'],
            user: this.toSessionUserFromClaims(claims),
            tokenType: (typ as OIDCVerifiedToken['tokenType']) ?? 'unknown'
        };
    }

    /**
     * RFC 7662 style token introspection. Always resolves; callers get
     * `active: false` for invalid/expired tokens.
     */
    async introspect(token: string): Promise<OIDCIntrospectionResult> {
        const verified = await this.verifyToken(token);
        if (!verified) {
            return { active: false, reason: 'invalid_token' };
        }
        const claims = verified.claims as Record<string, any>;
        return {
            active: true,
            sub: claims.sub,
            username: verified.user.username,
            email: verified.user.email,
            roles: verified.user.roles,
            scope: typeof claims.scope === 'string' ? claims.scope : undefined,
            tokenType: claims.typ,
            exp: typeof claims.exp === 'number' ? claims.exp : undefined,
            iat: typeof claims.iat === 'number' ? claims.iat : undefined,
            iss: typeof claims.iss === 'string' ? claims.iss : undefined,
            aud: claims.aud
        };
    }

    /**
     * Refresh either a local refresh token or a provider refresh token.
     *
     * Local refresh tokens are JWTs with `typ: "refresh"`; everything else is
     * forwarded to the upstream OAuth2 provider as before.
     */
    async refreshTokens(refreshToken: string): Promise<OIDCTokenSet> {
        if (!refreshToken) {
            throw new Error('Refresh token is required');
        }
        const claims = await this.verifyJwt(refreshToken);
        if (claims?.sub && claims.typ === 'refresh') {
            const store = this.userStore;
            const record = store ? await store.findById(String(claims.sub)) : null;
            const user = record ? this.toSessionUser(record) : this.toSessionUserFromClaims(claims);
            return this.issueTokens(user);
        }
        return this.refreshAccessToken(refreshToken);
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

    async issueTokens(user: SessionUser): Promise<OIDCTokenSet> {
        const payload = this.toTokenPayload(user);
        const [accessToken, refreshToken, sessionToken] = await Promise.all([
            this.jwt.sign({ ...payload, typ: 'access', jti: randomUUID() }, this.signOptions(this.accessExpiresIn())),
            this.jwt.sign({
                sub: user.sub,
                username: user.username,
                provider: user.provider,
                typ: 'refresh',
                jti: randomUUID()
            }, this.signOptions(this.refreshExpiresIn())),
            this.jwt.sign({ ...payload, typ: 'session', jti: randomUUID() }, this.signOptions(this.sessionExpiresIn()))
        ]);
        return {
            accessToken,
            refreshToken,
            idToken: sessionToken,
            sessionToken,
            expiresIn: secondsFromDuration(this.accessExpiresIn()),
            tokenType: 'Bearer'
        };
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private requireUserStore(): UserStore {
        if (!this.userStore) {
            throw new Error('User store is not configured');
        }
        return this.userStore;
    }

    private authResultFromRecord(record: AuthUserRecord): Promise<OIDCAuthResult> {
        const user = this.toSessionUser(record);
        return this.issueTokens(user).then(tokens => ({
            user: user as unknown as Record<string, unknown>,
            claims: this.toTokenPayload(user),
            tokens
        }));
    }

    private toSessionUser(record: AuthUserRecord): SessionUser {
        return {
            sub: record.id,
            username: record.username,
            name: record.displayName ?? record.username,
            email: record.email ?? undefined,
            emailVerified: record.emailVerified ?? false,
            picture: record.picture ?? undefined,
            provider: record.provider,
            roles: normalizeRoles(record.roles)
        };
    }

    private toSessionUserFromClaims(claims: Record<string, any>): SessionUser {
        return {
            sub: String(claims.sub),
            username: claims.username,
            name: claims.name ?? claims.username,
            email: claims.email,
            emailVerified: claims.email_verified ?? false,
            picture: claims.picture,
            provider: claims.provider ?? this.options.issuer,
            roles: normalizeRoles(claims.roles)
        };
    }

    private toTokenPayload(user: SessionUser): Record<string, unknown> {
        return {
            sub: user.sub,
            username: user.username,
            name: user.name,
            email: user.email,
            email_verified: user.emailVerified ?? false,
            picture: user.picture,
            provider: user.provider,
            roles: normalizeRoles(user.roles)
        };
    }

    private async persistOidcUser(user: SessionUser): Promise<SessionUser> {
        const store = this.userStore;
        if (!store) {
            return user;
        }
        const provider = user.provider || this.options.issuer || 'oidc';
        const existing = await store.findByExternal(provider, user.sub);
        if (existing) {
            const updated = await store.update(existing.id, {
                displayName: user.name ?? existing.displayName,
                email: user.email ?? existing.email,
                emailVerified: user.emailVerified ?? existing.emailVerified,
                picture: user.picture ?? existing.picture,
                roles: user.roles?.length ? user.roles : existing.roles
            });
            return this.toSessionUser(updated);
        }

        const email = normalizeEmail(user.email);
        const byEmail = email ? await store.findByEmail(email) : null;
        if (byEmail) {
            const linked = await store.update(byEmail.id, {
                provider,
                externalId: user.sub,
                displayName: user.name ?? byEmail.displayName,
                emailVerified: user.emailVerified ?? byEmail.emailVerified,
                picture: user.picture ?? byEmail.picture,
                roles: user.roles?.length ? user.roles : byEmail.roles
            });
            return this.toSessionUser(linked);
        }

        const username = await this.uniqueUsername(store, email || user.username || `${provider}:${user.sub}`);
        const created = await store.create({
            username,
            email,
            displayName: user.name ?? username,
            provider,
            externalId: user.sub,
            emailVerified: user.emailVerified ?? false,
            picture: user.picture,
            roles: normalizeRoles(user.roles)
        });
        return this.toSessionUser(created);
    }

    private async uniqueUsername(store: UserStore, base: string): Promise<string> {
        const normalized = normalizeUsername(base).replace(/\s+/g, '.');
        const safe = normalized || `user-${randomBytes(4).toString('hex')}`;
        if (!(await store.findByUsername(safe))) {
            return safe;
        }
        for (let i = 1; i < 1000; i++) {
            const candidate = `${safe}-${i}`;
            if (!(await store.findByUsername(candidate))) {
                return candidate;
            }
        }
        return `${safe}-${randomBytes(4).toString('hex')}`;
    }

    private async verifyJwt(token: string): Promise<Record<string, any> | null> {
        if (!token) {
            return null;
        }
        try {
            const claims = await this.jwt.verify(token, {
                publicKey: this.tokenSecret,
                issuer: this.tokenIssuer,
                algorithms: [this.tokenAlgorithm],
                clockTolerance: 30
            });
            return claims && typeof claims === 'object' ? claims as Record<string, any> : null;
        } catch {
            return null;
        }
    }

    private signOptions(expiresIn: string | number): Record<string, unknown> {
        return {
            privateKey: this.tokenSecret,
            expiresIn: expiresIn as unknown as number,
            algorithm: this.tokenAlgorithm,
            issuer: this.tokenIssuer
        };
    }

    private accessExpiresIn(): string | number {
        return resolveDuration(
            this.moduleOptions?.jwt?.accessExpiresIn ?? process.env.OIDC_ACCESS_TOKEN_EXPIRES_IN,
            '1h'
        );
    }

    private refreshExpiresIn(): string | number {
        return resolveDuration(
            this.moduleOptions?.jwt?.refreshExpiresIn ?? process.env.OIDC_REFRESH_TOKEN_EXPIRES_IN,
            '7d'
        );
    }

    private sessionExpiresIn(): string | number {
        return resolveDuration(
            this.moduleOptions?.jwt?.sessionExpiresIn
                ?? this.moduleOptions?.sessionExpiresIn
                ?? process.env.OIDC_SESSION_EXPIRES_IN,
            '24h'
        );
    }
}

function normalizeRoles(value: unknown): string[] {
    if (!value) {
        return [];
    }
    if (Array.isArray(value)) {
        return value.map(item => String(item)).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value.split(/[\s,]+/).filter(Boolean);
    }
    return [];
}

function secondsFromDuration(value: string | number): number | undefined {
    if (typeof value === 'number') {
        return value;
    }
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) {
        return undefined;
    }
    const amount = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
        case 's': return amount;
        case 'm': return amount * 60;
        case 'h': return amount * 3600;
        case 'd': return amount * 86400;
        default: return undefined;
    }
}

function resolveDuration(value: unknown, fallback: string | number): string | number {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
    }
    if (typeof value === 'string' && /^\d+[smhd]?$/.test(value.trim())) {
        return value.trim();
    }
    return fallback;
}
