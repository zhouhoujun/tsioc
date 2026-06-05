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

@Controller('/auth')
export class AuthController {
    constructor(private oidcService: OIDCService) {}

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
        const sessionToken = await this.oidcService.createSessionToken(result.user as unknown as SessionUser);
        cookies.set('oidc_session', sessionToken, { httpOnly: true, sameSite: 'lax', secure: ctx.secure, maxAge: 86400 });
        return { sessionToken, user: result.user };
    }

    @Get('/userinfo')
    async userinfo(@Inject(RestfulRequestAdapter) ctx: RestfulRequestAdapter): Promise<SessionUser | { error: string }> {
        const cookies = getCookies(ctx);
        const token = bearerToken(ctx) || cookies.get('oidc_session');
        if (!token) { ctx.response.statusCode = 401; return { error: 'Not authenticated' }; }
        const user = await this.oidcService.verifySessionToken(token);
        if (!user) { ctx.response.statusCode = 401; return { error: 'Invalid or expired session' }; }
        return user;
    }

    @Get('/session')
    async session(@Inject(RestfulRequestAdapter) ctx: RestfulRequestAdapter): Promise<{ authenticated: boolean; user?: SessionUser }> {
        const cookies = getCookies(ctx);
        const token = bearerToken(ctx) || cookies.get('oidc_session');
        if (!token) return { authenticated: false };
        const user = await this.oidcService.verifySessionToken(token);
        if (!user) return { authenticated: false };
        return { authenticated: true, user };
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
        if (!refreshToken) { ctx.response.statusCode = 400; return { error: 'Refresh token is required' }; }
        try {
            const tokens = await this.oidcService.refreshAccessToken(refreshToken);
            return { tokens: tokens as unknown as Record<string, unknown> };
        } catch (err: unknown) {
            ctx.response.statusCode = 400;
            return { error: err instanceof Error ? err.message : 'Token refresh failed' };
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
            end_session_endpoint: `${base}/auth/logout`,
            response_types_supported: ['code'],
            subject_types_supported: ['public'],
            id_token_signing_alg_values_supported: ['RS256', 'HS256']
        };
    }
}
