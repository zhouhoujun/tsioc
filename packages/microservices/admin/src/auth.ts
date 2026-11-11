import * as crypto from 'node:crypto';
import { Observable, EMPTY, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Inject, Injectable, Optional, token } from '@tsdi/ioc';
import {
    ForbiddenException,
    RequestContext,
    RequestHandler,
    RequestInterceptor,
    RestfulRequestAdapter,
    UnauthorizedException,
    REQUEST
} from '@tsdi/common';
import {
    getServiceInterceptorsToken,
    makeServiceFeature,
    ServiceFeatureFn,
    ServiceFeatureKind
} from '@tsdi/service';
import { JWTService } from '@tsdi/security';
import { HttpRequestMessage } from '@tsdi/http-microservice';

export const GATEWAY_ADMIN_AUTH_OPTIONS = token<GatewayAdminAuthOptions>('GATEWAY_ADMIN_AUTH_OPTIONS');
export const GATEWAY_ADMIN_AUTH_USER = token<any>('GATEWAY_ADMIN_AUTH_USER');

export function validateGatewayAdminAuth(options?: GatewayAdminAuthOptions | false): void {
    if (!options || options.mode === 'none' || options.mode === undefined) {
        return;
    }
    if (!options.sessionSecret) {
        throw new Error('Gateway admin authentication requires auth.sessionSecret');
    }
    if (options.mode === 'oidc') {
        const provider = options.provider && typeof options.provider === 'object' ? options.provider : undefined;
        if ((!options.issuer && !provider?.issuer) || !options.clientId || !options.clientSecret) {
            throw new Error('Gateway admin OIDC requires issuer, clientId and clientSecret');
        }
    }
    if (options.mode === 'oauth2') {
        const provider = options.provider && typeof options.provider === 'object' ? options.provider : undefined;
        if ((!options.authorizationURL && !provider?.authorizationEndpoint)
            || (!options.tokenURL && !provider?.tokenEndpoint)
            || !options.clientId || !options.clientSecret) {
            throw new Error('Gateway admin OAuth2 requires authorizationURL, tokenURL, clientId and clientSecret');
        }
    }
    if (options.mode === 'service' && !options.authServiceUrl && !options.loginUrl) {
        throw new Error('Gateway admin service auth requires auth.authServiceUrl or auth.loginUrl');
    }
}

export interface OidcProviderEndpoints {
    /** Provider issuer (used for ID token `iss` validation). */
    issuer?: string;
    authorizationEndpoint?: string;
    tokenEndpoint?: string;
    userinfoEndpoint?: string;
    jwksUri?: string;
    endSessionEndpoint?: string;
}

export interface GatewayAdminAuthOptions {
    /**
     * `none` keeps the local admin open. `oidc` enables authorization-code +
     * PKCE login and protects `/api/gateway-admin/*`.
     */
    mode?: 'none' | 'oidc' | 'oauth2' | 'service';
    /**
     * Configure the OIDC provider. `'oidc'` uses issuer discovery; an object
     * lets deployments point at explicit provider endpoints.
     */
    provider?: 'oidc' | OidcProviderEndpoints;
    /** OIDC issuer URL (discovery via /.well-known/openid-configuration). */
    issuer?: string;
    clientId?: string;
    clientSecret?: string;
    /** OAuth2 authorization endpoint (mode=oauth2). */
    authorizationURL?: string;
    /** OAuth2 token endpoint (mode=oauth2). */
    tokenURL?: string;
    /** OAuth2 userinfo/profile endpoint (mode=oauth2). */
    profileURL?: string;
    /** Enable PKCE for OAuth2. Default true. */
    pkce?: boolean;
    /** Default: `<public origin>/admin/oidc/callback`. */
    redirectUri?: string;
    /** Default: `openid profile email`. */
    scopes?: string[];
    /** HMAC secret for signed session/state cookies, and for `service` token verification. */
    sessionSecret?: string;
    /**
     * Separate `@tsdi/oidc-auth` service base URL. Used by `mode: 'service'`
     * for login/logout and as the default token issuer source.
     */
    authServiceUrl?: string;
    /** Expected issuer for `mode: 'service'` tokens. */
    sessionIssuer?: string;
    /** Session cookie name for `mode: 'service'`. Default `oidc_session`. */
    sessionCookie?: string;
    /** External login URL for `mode: 'service'`. Default `<authServiceUrl>/auth/login`. */
    loginUrl?: string;
    /** External logout URL for `mode: 'service'`. Default `<authServiceUrl>/auth/logout`. */
    logoutUrl?: string;
    /** Required local roles for `mode: 'service'`. */
    requiredRoles?: string[];
    /** Session lifetime. Default 8 hours. */
    sessionTtlMs?: number;
    /** Login route. Default `/admin/auth/login`. */
    loginPath?: string;
    /** Callback route. Default `/admin/oidc/callback`. */
    callbackPath?: string;
    /** Logout route. Default `/admin/auth/logout`. */
    logoutPath?: string;
    /** Protected API prefix. Default `/api/gateway-admin`. */
    apiPrefix?: string;
    /** Email allowlist. */
    allowedEmails?: string[];
    /** Email domain allowlist (example.com). */
    allowedDomains?: string[];
    /** Required group names from the userinfo/ID token `groups` claim. */
    requiredGroups?: string[];
    /** Additional claim checks. String requires equality; array requires any overlap. */
    requiredClaims?: Record<string, string | string[]>;
    /** Force Secure cookies (otherwise derived from the request protocol). */
    secureCookies?: boolean;
    /** Injectable fetch for proxies/tests. */
    fetchImpl?: typeof fetch;
    /** Optional public path users return to after login. Default `/admin/`. */
    defaultReturnTo?: string;
}

interface OidcDiscovery {
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    userinfo_endpoint?: string;
    jwks_uri: string;
    end_session_endpoint?: string;
}

interface BrowserSession {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
    groups?: string[];
    exp: number;
}

const STATE_COOKIE = 'tsdi_gateway_admin_state';
const SESSION_COOKIE = 'tsdi_gateway_admin_session';
const STATE_TTL_SECONDS = 300;

function base64url(input: Buffer | string): string {
    return Buffer.from(input).toString('base64url');
}

function fromBase64url(value: string): Buffer {
    return Buffer.from(value, 'base64url');
}

function sign(secret: string, value: string): string {
    return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function encodeSigned(secret: string, value: any): string {
    const payload = base64url(JSON.stringify(value));
    return `${payload}.${sign(secret, payload)}`;
}

function decodeSigned<T = any>(secret: string, tokenValue?: string): T | undefined {
    if (!tokenValue) {
        return undefined;
    }
    const [payload, signature] = String(tokenValue).split('.');
    if (!payload || !signature) {
        return undefined;
    }
    const expected = sign(secret, payload);
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
        return undefined;
    }
    try {
        return JSON.parse(fromBase64url(payload).toString('utf-8')) as T;
    } catch {
        return undefined;
    }
}

function randomValue(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('base64url');
}

function sha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('base64url');
}

function localReturnPath(value: string | undefined, fallback = '/admin/'): string {
    return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}

@Injectable()
export class GatewayAdminAuthService {
    private readonly options: GatewayAdminAuthOptions;
    private discoveryCache?: { value: OidcDiscovery; expiresAt: number };
    private jwksCache?: { keys: any[]; expiresAt: number };
    private readonly fetchImpl: typeof fetch;

    constructor(
        @Optional() @Inject(GATEWAY_ADMIN_AUTH_OPTIONS) options?: GatewayAdminAuthOptions,
        @Optional() private jwt?: JWTService
    ) {
        this.options = options ?? { mode: 'none' };
        this.fetchImpl = this.options.fetchImpl ?? ((globalThis as any).fetch?.bind(globalThis));
        validateGatewayAdminAuth(this.options);
    }

    get enabled(): boolean {
        return this.options.mode === 'oidc' || this.options.mode === 'oauth2' || this.options.mode === 'service';
    }

    get oidcEnabled(): boolean {
        return this.options.mode === 'oidc';
    }

    get oauth2Enabled(): boolean {
        return this.options.mode === 'oauth2';
    }

    get serviceEnabled(): boolean {
        return this.options.mode === 'service';
    }

    get loginPath(): string {
        return this.options.loginPath ?? '/admin/auth/login';
    }

    get callbackPath(): string {
        return this.options.callbackPath ?? '/admin/oidc/callback';
    }

    get logoutPath(): string {
        return this.options.logoutPath ?? '/admin/auth/logout';
    }

    get apiPrefix(): string {
        return this.options.apiPrefix ?? '/api/gateway-admin';
    }

    async authenticate(context: RequestContext): Promise<any | undefined> {
        if (!this.enabled) {
            return { anonymous: true };
        }
        const request = context.get(REQUEST) as HttpRequestMessage;
        const session = this.serviceEnabled
            ? await this.verifyServiceSession(request)
            : this.readSession(request);
        if (!session) {
            return undefined;
        }
        context.set(GATEWAY_ADMIN_AUTH_USER, session);
        return session;
    }

    async login(context: RequestContext): Promise<void> {
        const request = context.get(REQUEST) as HttpRequestMessage;
        if (this.serviceEnabled) {
            const adapter = context.get(RestfulRequestAdapter);
            const query = adapter?.query ?? {};
            const returnTo = localReturnPath(query.redirect, this.options.defaultReturnTo ?? '/admin/');
            const base = this.options.loginUrl
                || (this.options.authServiceUrl ? `${this.options.authServiceUrl.replace(/\/+$/, '')}/auth/login` : '');
            if (!base) {
                throw new Error('Gateway admin service auth requires auth.loginUrl or auth.authServiceUrl');
            }
            const url = new URL(base);
            url.searchParams.set('redirect', returnTo);
            adapter?.redirect(url.toString());
            return;
        }
        if (this.oauth2Enabled) {
            const endpoints = this.oauth2Endpoints();
            const adapter = context.get(RestfulRequestAdapter);
            const query = adapter?.query ?? {};
            const state = randomValue();
            const verifier = randomValue();
            const returnTo = localReturnPath(query.redirect, this.options.defaultReturnTo ?? '/admin/');
            this.setCookie(request, STATE_COOKIE, encodeSigned(this.options.sessionSecret!, {
                state,
                nonce: '',
                verifier,
                returnTo,
                exp: Date.now() + STATE_TTL_SECONDS * 1000
            }), {
                path: this.callbackPath,
                maxAge: STATE_TTL_SECONDS,
                httpOnly: true,
                sameSite: 'Lax',
                secure: this.secure(request)
            });
            const url = new URL(endpoints.authorizationURL);
            url.searchParams.set('response_type', 'code');
            url.searchParams.set('client_id', this.options.clientId!);
            url.searchParams.set('redirect_uri', this.resolveRedirectUri(request));
            url.searchParams.set('scope', (this.options.scopes ?? ['profile', 'email']).join(' '));
            url.searchParams.set('state', state);
            if (this.options.pkce !== false) {
                url.searchParams.set('code_challenge', sha256(verifier));
                url.searchParams.set('code_challenge_method', 'S256');
            }
            adapter?.redirect(url.toString());
            return;
        }
        const discovery = await this.discovery();
        const state = randomValue();
        const nonce = randomValue();
        const verifier = randomValue();
        const redirectUri = this.resolveRedirectUri(request);
        const adapter = context.get(RestfulRequestAdapter);
        const query = adapter?.query ?? {};
        const returnTo = localReturnPath(query.redirect, this.options.defaultReturnTo ?? '/admin/');
        this.setCookie(request, STATE_COOKIE, encodeSigned(this.options.sessionSecret!, {
            state,
            nonce,
            verifier,
            returnTo,
            exp: Date.now() + STATE_TTL_SECONDS * 1000
        }), {
            path: this.callbackPath,
            maxAge: STATE_TTL_SECONDS,
            httpOnly: true,
            sameSite: 'Lax',
            secure: this.secure(request)
        });
        const url = new URL(discovery.authorization_endpoint);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('client_id', this.options.clientId!);
        url.searchParams.set('redirect_uri', redirectUri);
        url.searchParams.set('scope', (this.options.scopes ?? ['openid', 'profile', 'email']).join(' '));
        url.searchParams.set('state', state);
        url.searchParams.set('nonce', nonce);
        url.searchParams.set('code_challenge', sha256(verifier));
        url.searchParams.set('code_challenge_method', 'S256');
        adapter?.redirect(url.toString());
    }

    async callback(context: RequestContext): Promise<void> {
        if (this.oauth2Enabled) {
            return this.oauth2Callback(context);
        }
        if (!this.oidcEnabled) {
            throw new UnauthorizedException('OIDC callback is not enabled');
        }
        const request = context.get(REQUEST) as HttpRequestMessage;
        const adapter = context.get(RestfulRequestAdapter);
        const query = adapter?.query ?? {};
        const stateCookie = decodeSigned<any>(this.options.sessionSecret!, this.getCookie(request, STATE_COOKIE));
        if (!stateCookie || stateCookie.exp < Date.now() || stateCookie.state !== query.state) {
            throw new UnauthorizedException('Invalid or expired OIDC state');
        }
        if (!query.code) {
            throw new UnauthorizedException('Missing OIDC authorization code');
        }
        const discovery = await this.discovery();
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code: query.code,
            client_id: this.options.clientId!,
            client_secret: this.options.clientSecret!,
            redirect_uri: this.resolveRedirectUri(request),
            code_verifier: stateCookie.verifier
        });
        const tokenResponse = await this.fetchImpl(discovery.token_endpoint, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
            body: body.toString()
        });
        if (!tokenResponse.ok) {
            throw new UnauthorizedException(`OIDC token exchange failed: HTTP ${tokenResponse.status}`);
        }
        const tokens = await tokenResponse.json() as any;
        if (!tokens.id_token) {
            throw new UnauthorizedException('OIDC token response has no id_token');
        }
        const claims = await this.verifyIdToken(tokens.id_token, stateCookie.nonce);
        let user: any = claims;
        if (tokens.access_token && discovery.userinfo_endpoint) {
            try {
                const userInfo = await this.fetchImpl(discovery.userinfo_endpoint, {
                    headers: { authorization: `Bearer ${tokens.access_token}`, accept: 'application/json' }
                });
                if (userInfo.ok) {
                    user = { ...claims, ...(await userInfo.json() as any) };
                }
            } catch {
                // Userinfo is optional; the verified ID token is authoritative.
            }
        }
        this.authorize(user);
        const session: BrowserSession = {
            sub: String(user.sub || ''),
            email: user.email,
            name: user.name || user.preferred_username || user.email,
            picture: user.picture,
            groups: this.groupsOf(user),
            exp: Date.now() + (this.options.sessionTtlMs ?? 8 * 60 * 60 * 1000)
        };
        this.setCookie(request, SESSION_COOKIE, encodeSigned(this.options.sessionSecret!, session), {
            path: '/',
            maxAge: Math.floor((this.options.sessionTtlMs ?? 8 * 60 * 60 * 1000) / 1000),
            httpOnly: true,
            sameSite: 'Lax',
            secure: this.secure(request)
        });
        this.setCookie(request, STATE_COOKIE, '', {
            path: this.callbackPath,
            maxAge: 0,
            httpOnly: true,
            sameSite: 'Lax',
            secure: this.secure(request)
        });
        adapter?.redirect(localReturnPath(stateCookie.returnTo, this.options.defaultReturnTo ?? '/admin/'));
    }

    private oauth2Endpoints(): { authorizationURL: string; tokenURL: string; profileURL?: string } {
        const provider = this.explicitProvider();
        const authorizationURL = this.options.authorizationURL || provider?.authorizationEndpoint;
        const tokenURL = this.options.tokenURL || provider?.tokenEndpoint;
        const profileURL = this.options.profileURL || provider?.userinfoEndpoint;
        if (!authorizationURL || !tokenURL) {
            throw new Error('Gateway admin OAuth2 endpoints are not configured');
        }
        return { authorizationURL, tokenURL, profileURL };
    }

    private async oauth2Callback(context: RequestContext): Promise<void> {
        const request = context.get(REQUEST) as HttpRequestMessage;
        const adapter = context.get(RestfulRequestAdapter);
        const query = adapter?.query ?? {};
        const stateCookie = decodeSigned<any>(this.options.sessionSecret!, this.getCookie(request, STATE_COOKIE));
        if (!stateCookie || stateCookie.exp < Date.now() || stateCookie.state !== query.state) {
            throw new UnauthorizedException('Invalid or expired OAuth2 state');
        }
        if (!query.code) {
            throw new UnauthorizedException('Missing OAuth2 authorization code');
        }
        const endpoints = this.oauth2Endpoints();
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code: query.code,
            client_id: this.options.clientId!,
            client_secret: this.options.clientSecret!,
            redirect_uri: this.resolveRedirectUri(request)
        });
        if (this.options.pkce !== false) {
            body.set('code_verifier', stateCookie.verifier);
        }
        const tokenResponse = await this.fetchImpl(endpoints.tokenURL, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
            body: body.toString()
        });
        if (!tokenResponse.ok) {
            throw new UnauthorizedException(`OAuth2 token exchange failed: HTTP ${tokenResponse.status}`);
        }
        const tokens = await tokenResponse.json() as any;
        if (!tokens.access_token) {
            throw new UnauthorizedException('OAuth2 token response has no access_token');
        }
        let user: any = {};
        if (endpoints.profileURL) {
            const profile = await this.fetchImpl(endpoints.profileURL, {
                headers: { authorization: `Bearer ${tokens.access_token}`, accept: 'application/json' }
            });
            if (!profile.ok) {
                throw new UnauthorizedException(`OAuth2 profile request failed: HTTP ${profile.status}`);
            }
            user = await profile.json() as any;
        }
        this.authorize(user);
        const session: BrowserSession = {
            sub: String(user.sub || user.id || user.username || ''),
            email: user.email,
            name: user.name || user.displayName || user.username || user.email,
            picture: user.picture || user.avatar_url,
            groups: this.groupsOf(user),
            exp: Date.now() + (this.options.sessionTtlMs ?? 8 * 60 * 60 * 1000)
        };
        this.setCookie(request, SESSION_COOKIE, encodeSigned(this.options.sessionSecret!, session), {
            path: '/',
            maxAge: Math.floor((this.options.sessionTtlMs ?? 8 * 60 * 60 * 1000) / 1000),
            httpOnly: true,
            sameSite: 'Lax',
            secure: this.secure(request)
        });
        this.setCookie(request, STATE_COOKIE, '', {
            path: this.callbackPath,
            maxAge: 0,
            httpOnly: true,
            sameSite: 'Lax',
            secure: this.secure(request)
        });
        adapter?.redirect(localReturnPath(stateCookie.returnTo, this.options.defaultReturnTo ?? '/admin/'));
    }

    logout(context: RequestContext): void {
        const request = context.get(REQUEST) as HttpRequestMessage;
        if (this.oidcEnabled) {
            this.setCookie(request, SESSION_COOKIE, '', {
                path: '/',
                maxAge: 0,
                httpOnly: true,
                sameSite: 'Lax',
                secure: this.secure(request)
            });
        }
        const logoutUrl = this.options.logoutUrl
            || (this.options.authServiceUrl ? `${this.options.authServiceUrl.replace(/\/+$/, '')}/auth/logout` : undefined);
        context.get(RestfulRequestAdapter)?.redirect(logoutUrl || this.options.defaultReturnTo || '/admin/');
    }

    getSession(context: RequestContext): BrowserSession | undefined {
        return context.get(GATEWAY_ADMIN_AUTH_USER, undefined) as BrowserSession | undefined;
    }

    private async verifyServiceSession(request: HttpRequestMessage): Promise<BrowserSession | undefined> {
        const cookieName = this.options.sessionCookie || 'oidc_session';
        const header = this.header(request, 'authorization');
        const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : this.getCookie(request, cookieName);
        if (!token || !this.jwt) {
            return undefined;
        }
        try {
            const claims = await this.jwt.verify(token, {
                issuer: this.options.sessionIssuer || 'tsioc-oidc-auth',
                algorithms: ['HS256', 'HS384', 'HS512'],
                publicKey: this.options.sessionSecret,
                clockTolerance: 60
            }) as any;
            if (claims.typ && claims.typ !== 'session' && claims.typ !== 'access') {
                return undefined;
            }
            const user = {
                sub: String(claims.sub || ''),
                email: claims.email,
                name: claims.name || claims.username || claims.email,
                roles: claims.roles || [],
                groups: claims.roles || []
            };
            this.authorize(user);
            return {
                sub: user.sub,
                email: user.email,
                name: user.name,
                groups: this.groupsOf(user),
                exp: Number(claims.exp ? claims.exp * 1000 : Date.now() + 60_000)
            };
        } catch {
            return undefined;
        }
    }

    private readSession(request: HttpRequestMessage): BrowserSession | undefined {
        const session = decodeSigned<BrowserSession>(this.options.sessionSecret!, this.getCookie(request, SESSION_COOKIE));
        if (!session || session.exp <= Date.now()) {
            return undefined;
        }
        return session;
    }

    private explicitProvider(): OidcProviderEndpoints | undefined {
        return this.options.provider && typeof this.options.provider === 'object'
            ? this.options.provider
            : undefined;
    }

    private async discovery(): Promise<OidcDiscovery> {
        if (this.discoveryCache && this.discoveryCache.expiresAt > Date.now()) {
            return this.discoveryCache.value;
        }
        const explicit = this.explicitProvider();
        if (explicit?.authorizationEndpoint && explicit?.tokenEndpoint && explicit?.jwksUri) {
            const value: OidcDiscovery = {
                issuer: explicit.issuer || this.options.issuer || '',
                authorization_endpoint: explicit.authorizationEndpoint,
                token_endpoint: explicit.tokenEndpoint,
                userinfo_endpoint: explicit.userinfoEndpoint,
                jwks_uri: explicit.jwksUri,
                end_session_endpoint: explicit.endSessionEndpoint
            };
            this.discoveryCache = { value, expiresAt: Date.now() + 10 * 60 * 1000 };
            return value;
        }
        const issuer = String(this.options.issuer || explicit?.issuer).replace(/\/+$/, '');
        const response = await this.fetchImpl(`${issuer}/.well-known/openid-configuration`, {
            headers: { accept: 'application/json' }
        });
        if (!response.ok) {
            throw new Error(`OIDC discovery failed: HTTP ${response.status}`);
        }
        const value = await response.json() as OidcDiscovery;
        this.discoveryCache = { value, expiresAt: Date.now() + 10 * 60 * 1000 };
        return value;
    }

    private async verifyIdToken(idToken: string, nonce: string): Promise<any> {
        if (!this.jwt) {
            throw new Error('JWTService is required for OIDC ID token verification');
        }
        const header = this.jwt.decodeHeader(idToken);
        const keys = await this.jwks();
        const jwk = keys.find(key => !header.kid || key.kid === header.kid) ?? keys[0];
        if (!jwk) {
            throw new Error('OIDC JWKS has no usable key');
        }
        const publicKey = this.jwt.importKey(jwk);
        const expectedIssuer = this.explicitProvider()?.issuer || this.options.issuer;
        const claims = await this.jwt.verify(idToken, {
            issuer: expectedIssuer,
            audience: this.options.clientId,
            algorithms: [header.alg || 'RS256'],
            publicKey,
            clockTolerance: 60
        });
        if (nonce && claims.nonce !== nonce) {
            throw new UnauthorizedException('OIDC nonce mismatch');
        }
        return claims;
    }

    private async jwks(): Promise<any[]> {
        if (this.jwksCache && this.jwksCache.expiresAt > Date.now()) {
            return this.jwksCache.keys;
        }
        const discovery = await this.discovery();
        const response = await this.fetchImpl(discovery.jwks_uri, { headers: { accept: 'application/json' } });
        if (!response.ok) {
            throw new Error(`OIDC JWKS failed: HTTP ${response.status}`);
        }
        const body = await response.json() as { keys?: any[] };
        const keys = body.keys ?? [];
        this.jwksCache = { keys, expiresAt: Date.now() + 10 * 60 * 1000 };
        return keys;
    }

    private authorize(user: any): void {
        const email = String(user?.email || '').toLowerCase();
        const emails = (this.options.allowedEmails ?? []).map(value => value.toLowerCase());
        if (emails.length && !emails.includes(email)) {
            throw new ForbiddenException('Email is not allowed to access the gateway admin');
        }
        const domains = (this.options.allowedDomains ?? []).map(value => value.toLowerCase());
        if (domains.length && !domains.some(domain => email.endsWith(`@${domain}`))) {
            throw new ForbiddenException('Email domain is not allowed to access the gateway admin');
        }
        const groups = this.groupsOf(user);
        const requiredGroups = this.options.requiredGroups ?? [];
        if (requiredGroups.length && !requiredGroups.every(group => groups.includes(group))) {
            throw new ForbiddenException('OIDC group membership is required for the gateway admin');
        }
        const roles = Array.isArray(user?.roles) ? user.roles.map(String) : [];
        const requiredRoles = this.options.requiredRoles ?? [];
        if (requiredRoles.length && !requiredRoles.every(role => roles.includes(role))) {
            throw new ForbiddenException('Required role is missing for the gateway admin');
        }
        Object.entries(this.options.requiredClaims ?? {}).forEach(([key, expected]) => {
            const actual = user?.[key];
            const actualList = Array.isArray(actual) ? actual.map(String) : [String(actual ?? '')];
            const expectedList = Array.isArray(expected) ? expected.map(String) : [String(expected)];
            const ok = Array.isArray(expected)
                ? expectedList.some(value => actualList.includes(value))
                : actualList.includes(expectedList[0]);
            if (!ok) {
                throw new ForbiddenException(`OIDC claim '${key}' is required for the gateway admin`);
            }
        });
    }

    private groupsOf(user: any): string[] {
        const groups = user?.groups ?? user?.roles ?? [];
        if (Array.isArray(groups)) {
            return groups.map(String);
        }
        return String(groups || '').split(/[\s,]+/).filter(Boolean);
    }

    private resolveRedirectUri(request: HttpRequestMessage): string {
        if (this.options.redirectUri) {
            return this.options.redirectUri;
        }
        const host = this.header(request, 'x-forwarded-host') || this.header(request, 'host') || 'localhost';
        const proto = this.header(request, 'x-forwarded-proto') || (this.secure(request) ? 'https' : 'http');
        return `${proto}://${host}${this.callbackPath}`;
    }

    private getCookie(request: HttpRequestMessage, name: string): string | undefined {
        return request.cookies?.get(name);
    }

    private setCookie(request: HttpRequestMessage, name: string, value: string, options: Record<string, any>): void {
        request.cookies?.set(name, value, options as any);
    }

    private header(request: HttpRequestMessage, name: string): string | undefined {
        const value = request.headers?.[name];
        return Array.isArray(value) ? value[0] : value;
    }

    private secure(request: HttpRequestMessage): boolean {
        if (this.options.secureCookies !== undefined) {
            return this.options.secureCookies;
        }
        const proto = this.header(request, 'x-forwarded-proto');
        if (proto) {
            return proto.split(',')[0].trim() === 'https';
        }
        return !!(request.socket as any)?.encrypted;
    }
}

/**
 * Protects admin API calls and implements login/callback/logout routes.
 */
@Injectable()
export class GatewayAdminAuthInterceptor implements RequestInterceptor<HttpRequestMessage, any, RequestContext> {
    constructor(private auth: GatewayAdminAuthService) { }

    intercept(
        input: HttpRequestMessage,
        next: RequestHandler<HttpRequestMessage, any, RequestContext>,
        context: RequestContext
    ): Observable<any> {
        if (!this.auth.enabled) {
            return next.handle(input, context);
        }
        const path = String(input.url || '').split('?')[0] || '/';
        if (path === this.auth.loginPath) {
            return from(this.auth.login(context)).pipe(mergeMap(() => {
                this.finishRedirect(context);
                return EMPTY;
            }));
        }
        if (path === this.auth.callbackPath) {
            return from(this.auth.callback(context)).pipe(mergeMap(() => {
                this.finishRedirect(context);
                return EMPTY;
            }));
        }
        if (path === this.auth.logoutPath) {
            this.auth.logout(context);
            this.finishRedirect(context);
            return EMPTY;
        }
        if (path === `${this.auth.apiPrefix}/session`) {
            return from(this.auth.authenticate(context)).pipe(
                mergeMap(user => {
                    if (!user) {
                        throw new UnauthorizedException('Sign in is required for the gateway admin', 401);
                    }
                    this.writeJson(context, 200, {
                        authenticated: true,
                        user,
                        authEnabled: true
                    });
                    return EMPTY;
                })
            );
        }
        if (!path.startsWith(this.auth.apiPrefix)) {
            return next.handle(input, context);
        }
        return from(this.auth.authenticate(context)).pipe(
            mergeMap(user => {
                if (!user) {
                    throw new UnauthorizedException('Sign in is required for the gateway admin', 401);
                }
                return next.handle(input, context);
            })
        );
    }

    private finishRedirect(context: RequestContext): void {
        const adapter = context.get(RestfulRequestAdapter);
        adapter?.sendResponse('');
    }

    private writeJson(context: RequestContext, status: number, body: any): void {
        const adapter = context.get(RestfulRequestAdapter) as any;
        if (!adapter) {
            return;
        }
        adapter.setStatus(status);
        adapter.setHeader('content-type', 'application/json');
        adapter.setPayload(body);
        adapter.sendResponse(body);
    }
}

/**
 * Register OIDC protection for the microservice admin.
 */
export function useGatewayAdminAuth(
    options: GatewayAdminAuthOptions
): ServiceFeatureFn<ServiceFeatureKind.Interceptors> {
    return (config) => makeServiceFeature(
        ServiceFeatureKind.Interceptors,
        [
            { provide: GATEWAY_ADMIN_AUTH_OPTIONS, useValue: options },
            JWTService,
            GatewayAdminAuthService,
            GatewayAdminAuthInterceptor,
            {
                provide: getServiceInterceptorsToken(config),
                useExisting: GatewayAdminAuthInterceptor,
                multi: true,
                multiOrder: -350
            } as any
        ],
        config
    );
}
