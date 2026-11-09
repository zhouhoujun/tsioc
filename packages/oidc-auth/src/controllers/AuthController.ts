import { Inject } from '@tsdi/ioc';
import { RestfulRequestAdapter } from '@tsdi/common';
import { Controller, Get, Post, RequestParam, RequestBody } from '@tsdi/service';
import { OIDCService, SessionUser } from '../auth/OIDCService';

function getHeaderValue(ctx: any, name: string): string | undefined {
    const adapted = typeof ctx.getHeader === 'function' ? ctx.getHeader(name) : undefined;
    if (adapted != null) return typeof adapted === 'string' ? adapted : undefined;
    const headers = ctx.request?.headers as Record<string, unknown> | undefined;
    const raw = headers?.[name.toLowerCase()] ?? headers?.[name];
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) return raw[0];
    return undefined;
}

function bearerToken(ctx: any): string | null {
    const auth = getHeaderValue(ctx, 'authorization');
    if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
    return null;
}

function getCookies(ctx: any): { get(name: string): string | undefined; set(name: string, value?: string, opts?: Record<string, any>): void } {
    return ctx.cookies || { get: () => undefined, set: () => undefined };
}

function setResponseStatus(ctx: any, status: number): void {
    if (typeof ctx?.setStatus === 'function') {
        ctx.setStatus(status);
        return;
    }
    if ('status' in (ctx ?? {})) {
        ctx.status = status;
    }
    if (ctx?.response) {
        ctx.response.statusCode = status;
    }
}

function sessionTokenOf(tokens: { idToken?: string; sessionToken?: string }): string {
    return tokens.sessionToken || '';
}

@Controller('/auth')
export class AuthController {
    constructor(private oidcService: OIDCService) {}

    // -----------------------------------------------------------------
    // OIDC authorization code flow
    // -----------------------------------------------------------------

    @Get('/login')
    login(@Inject(RestfulRequestAdapter) ctx: RestfulRequestAdapter): { url: string } {
        const cookies = getCookies(ctx);
        const challenge = this.oidcService.authenticate();
        cookies.set('oidc_state', challenge.state, { httpOnly: true, sameSite: 'lax', secure: ctx.secure, maxAge: 600 });
        cookies.set('oidc_nonce', challenge.nonce, { httpOnly: true, sameSite: 'lax', secure: ctx.secure, maxAge: 600 });
        return { url: challenge.url };
    }

    @Get('/callback')
    async callback(
        @Inject(RestfulRequestAdapter) ctx: RestfulRequestAdapter,
        @RequestParam('code') code: string,
        @RequestParam('state') state: string
    ): Promise<{ sessionToken: string; user: Record<string, unknown> }> {
        const cookies = getCookies(ctx);
        const expectedState = cookies.get('oidc_state') || '';
        const expectedNonce = cookies.get('oidc_nonce') || '';
        cookies.set('oidc_state', '', { maxAge: 0 });
        cookies.set('oidc_nonce', '', { maxAge: 0 });
        const result = await this.oidcService.handleCallback(code, state, expectedState, expectedNonce);
        const sessionToken = sessionTokenOf(result.tokens) || await this.oidcService.createSessionToken(result.user as unknown as SessionUser);
        cookies.set('oidc_session', sessionToken, { httpOnly: true, sameSite: 'lax', secure: ctx.secure, maxAge: 86400 });
        return { sessionToken, user: result.user };
    }

    // -----------------------------------------------------------------
    // Local username/password authentication
    // -----------------------------------------------------------------

    @Post('/login')
    async loginLocal(
        @Inject(RestfulRequestAdapter) ctx: RestfulRequestAdapter,
        @RequestBody() body: { username?: string; password?: string }
    ): Promise<Record<string, unknown>> {
        try {
            const result = await this.oidcService.login({
                username: body?.username ?? '',
                password: body?.password ?? ''
            });
            const sessionToken = sessionTokenOf(result.tokens);
            getCookies(ctx).set('oidc_session', sessionToken, {
                httpOnly: true,
                sameSite: 'lax',
                secure: ctx.secure,
                maxAge: 86400
            });
            return {
                sessionToken,
                accessToken: result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken,
                expiresIn: result.tokens.expiresIn,
                tokenType: result.tokens.tokenType,
                user: result.user
            };
        } catch (err: unknown) {
            setResponseStatus(ctx, 401);
            return { error: errorMessage(err, 'Invalid username or password') };
        }
    }

    @Post('/register')
    async register(
        @Inject(RestfulRequestAdapter) ctx: RestfulRequestAdapter,
        @RequestBody() body: { username?: string; password?: string; email?: string; displayName?: string; roles?: string[] }
    ): Promise<Record<string, unknown>> {
        try {
            const result = await this.oidcService.register({
                username: body?.username ?? '',
                password: body?.password ?? '',
                email: body?.email,
                displayName: body?.displayName,
                roles: body?.roles
            });
            const sessionToken = sessionTokenOf(result.tokens);
            getCookies(ctx).set('oidc_session', sessionToken, {
                httpOnly: true,
                sameSite: 'lax',
                secure: ctx.secure,
                maxAge: 86400
            });
            return {
                sessionToken,
                accessToken: result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken,
                expiresIn: result.tokens.expiresIn,
                tokenType: result.tokens.tokenType,
                user: result.user
            };
        } catch (err: unknown) {
            const message = errorMessage(err, 'Registration failed');
            setResponseStatus(ctx, /disabled/i.test(message) ? 403 : 400);
            return { error: message };
        }
    }

    // -----------------------------------------------------------------
    // Session / verification endpoints
    // -----------------------------------------------------------------

    @Get('/userinfo')
    async userinfo(@Inject(RestfulRequestAdapter) ctx: RestfulRequestAdapter): Promise<SessionUser | { error: string }> {
        const verified = await this.verifyRequestToken(ctx);
        if (!verified) {
            const token = bearerToken(ctx) || getCookies(ctx).get('oidc_session');
            if (!token) { setResponseStatus(ctx, 401); return { error: 'Not authenticated' }; }
            setResponseStatus(ctx, 401);
            return { error: 'Invalid or expired session' };
        }
        return verified;
    }

    @Get('/session')
    async session(@Inject(RestfulRequestAdapter) ctx: RestfulRequestAdapter): Promise<{ authenticated: boolean; user?: SessionUser }> {
        const user = await this.verifyRequestToken(ctx);
        if (!user) return { authenticated: false };
        return { authenticated: true, user };
    }

    /**
     * Verify a bearer/access token and return the verified identity.
     */
    @Get('/verify')
    async verify(@Inject(RestfulRequestAdapter) ctx: RestfulRequestAdapter): Promise<Record<string, unknown>> {
        const token = bearerToken(ctx) || getCookies(ctx).get('oidc_session');
        if (!token) {
            setResponseStatus(ctx, 401);
            return { valid: false, error: 'Not authenticated' };
        }
        const verified = await this.verifyAnyToken(token);
        if (!verified) {
            setResponseStatus(ctx, 401);
            return { valid: false, error: 'Invalid or expired token' };
        }
        return {
            valid: true,
            tokenType: verified.tokenType,
            user: verified.user,
            claims: verified.claims
        };
    }

    /**
     * RFC 7662 style introspection endpoint. Invalid tokens return 200 with
     * `active: false` instead of leaking a different error shape.
     */
    @Post('/introspect')
    async introspect(
        @Inject(RestfulRequestAdapter) ctx: RestfulRequestAdapter,
        @RequestBody() body: { token?: string }
    ): Promise<Record<string, unknown>> {
        const token = body?.token || bearerToken(ctx) || getCookies(ctx).get('oidc_session') || '';
        return (await this.oidcService.introspect(token)) as unknown as Record<string, unknown>;
    }

    @Get('/logout')
    logout(@Inject(RestfulRequestAdapter) ctx: RestfulRequestAdapter): { status: string } {
        const cookies = getCookies(ctx);
        cookies.set('oidc_session', '', { maxAge: 0 });
        cookies.set('oidc_state', '', { maxAge: 0 });
        cookies.set('oidc_nonce', '', { maxAge: 0 });
        return { status: 'ok' };
    }

    @Post('/refresh')
    async refresh(
        @Inject(RestfulRequestAdapter) ctx: RestfulRequestAdapter,
        @RequestBody() body: { refreshToken: string }
    ): Promise<{ tokens: Record<string, unknown> } | { error: string }> {
        const refreshToken = body?.refreshToken;
        if (!refreshToken) { setResponseStatus(ctx, 400); return { error: 'Refresh token is required' }; }
        try {
            const service = this.oidcService as OIDCService & {
                refreshTokens?(token: string): Promise<{ [key: string]: unknown }>;
            };
            const tokens = typeof service.refreshTokens === 'function'
                ? await service.refreshTokens(refreshToken)
                : await this.oidcService.refreshAccessToken(refreshToken);
            return { tokens: tokens as unknown as Record<string, unknown> };
        } catch (err: unknown) {
            setResponseStatus(ctx, 400);
            return { error: errorMessage(err, 'Token refresh failed') };
        }
    }

    @Get('/.well-known/openid-configuration')
    openidConfiguration(@Inject(RestfulRequestAdapter) ctx: RestfulRequestAdapter): Record<string, unknown> {
        const host = getHeaderValue(ctx, 'host') || 'localhost';
        const proto = ctx.secure ? 'https' : 'http';
        const base = `${proto}://${host}`;
        return {
            issuer: this.oidcService.issuer || base,
            authorization_endpoint: `${base}/auth/login`,
            token_endpoint: `${base}/auth/callback`,
            userinfo_endpoint: `${base}/auth/userinfo`,
            introspection_endpoint: `${base}/auth/introspect`,
            registration_endpoint: `${base}/auth/register`,
            end_session_endpoint: `${base}/auth/logout`,
            response_types_supported: ['code'],
            grant_types_supported: ['authorization_code', 'refresh_token', 'password'],
            subject_types_supported: ['public'],
            scopes_supported: ['openid', 'profile', 'email'],
            token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
            id_token_signing_alg_values_supported: ['RS256', 'HS256']
        };
    }

    private async verifyRequestToken(ctx: any): Promise<SessionUser | null> {
        const token = bearerToken(ctx) || getCookies(ctx).get('oidc_session');
        if (!token) {
            return null;
        }
        const verified = await this.verifyAnyToken(token);
        return verified?.user ?? null;
    }

    private async verifyAnyToken(token: string): Promise<{
        user: SessionUser;
        claims: Record<string, unknown>;
        tokenType: string;
    } | null> {
        const service = this.oidcService as OIDCService & {
            verifyToken?(value: string): Promise<{ user: SessionUser; claims: Record<string, unknown>; tokenType: string } | null>;
        };
        if (typeof service.verifyToken === 'function') {
            const verified = await service.verifyToken(token);
            if (!verified || verified.tokenType === 'refresh') {
                return null;
            }
            return verified;
        }
        const user = await service.verifySessionToken(token);
        return user ? { user, claims: user as unknown as Record<string, unknown>, tokenType: 'session' } : null;
    }
}

function errorMessage(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
}
