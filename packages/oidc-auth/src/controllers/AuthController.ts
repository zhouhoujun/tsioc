import { Inject } from '@tsdi/ioc';
import { MessageAdapter, RequestContext, RestfulRequestAdapter } from '@tsdi/common';
import { Controller, Get, Post, RequestParam, RequestBody } from '@tsdi/service';
import { OIDCService, SessionUser } from '../auth/OIDCService';

type OIDCContext = RequestContext | RestfulRequestAdapter;

type HeaderSource = {
    request?: { headers?: Record<string, unknown> };
    getHeader?(name: string): string | undefined;
};

function isRequestContext(ctx: OIDCContext): ctx is RequestContext {
    return typeof (ctx as RequestContext).get === 'function';
}

function getRestfulAdapter(ctx: OIDCContext): RestfulRequestAdapter {
    if (!isRequestContext(ctx)) {
        return ctx;
    }
    return ctx.get(RestfulRequestAdapter);
}

function getHeaderValue(ctx: HeaderSource, name: string): string | undefined {
    const adapted = ctx.getHeader?.(name);
    if (adapted != null) {
        return adapted;
    }
    const headers = ctx.request?.headers;
    const value = headers?.[name] ?? headers?.[name.toLowerCase()];
    if (typeof value === 'string') {
        return value;
    }
    if (Array.isArray(value)) {
        return value[0];
    }
    return undefined;
}

function bearerToken(ctx: OIDCContext): string | null {
    const adapter = getRestfulAdapter(ctx);
    const auth = getHeaderValue(adapter, 'authorization');
    if (auth?.startsWith('Bearer ')) {
        return auth.slice(7).trim();
    }
    return null;
}

@Controller('/auth')
export class AuthController {
    constructor(private oidcService: OIDCService) {}

    @Get('/login')
    login(@Inject() ctx: RequestContext): { url: string } {
        const adapter = getRestfulAdapter(ctx);
        const challenge = this.oidcService.authenticate();
        adapter.cookies.set('oidc_state', challenge.state, {
            httpOnly: true,
            sameSite: 'lax',
            secure: adapter.secure,
            maxAge: 600
        });
        adapter.cookies.set('oidc_nonce', challenge.nonce, {
            httpOnly: true,
            sameSite: 'lax',
            secure: adapter.secure,
            maxAge: 600
        });
        return { url: challenge.url };
    }

    @Get('/callback')
    async callback(
        @Inject() ctx: RequestContext,
        @RequestParam('code') code: string,
        @RequestParam('state') state: string
    ): Promise<{ sessionToken: string; user: Record<string, unknown> }> {
        const adapter = getRestfulAdapter(ctx);
        const expectedState = adapter.cookies.get('oidc_state') || '';
        const expectedNonce = adapter.cookies.get('oidc_nonce') || '';

        adapter.cookies.set('oidc_state', '', { maxAge: 0 });
        adapter.cookies.set('oidc_nonce', '', { maxAge: 0 });

        const result = await this.oidcService.handleCallback(code, state, expectedState, expectedNonce);
        const sessionToken = await this.oidcService.createSessionToken(result.user as unknown as SessionUser);

        adapter.cookies.set('oidc_session', sessionToken, {
            httpOnly: true,
            sameSite: 'lax',
            secure: adapter.secure,
            maxAge: 86400
        });

        return {
            sessionToken,
            user: result.user
        };
    }

    @Get('/userinfo')
    async userinfo(@Inject() ctx: RequestContext): Promise<SessionUser | { error: string }> {
        const adapter = getRestfulAdapter(ctx);
        const token = bearerToken(ctx) || adapter.cookies.get('oidc_session');
        if (!token) {
            adapter.response.statusCode = 401;
            return { error: 'Not authenticated' };
        }
        const user = await this.oidcService.verifySessionToken(token);
        if (!user) {
            adapter.response.statusCode = 401;
            return { error: 'Invalid or expired session' };
        }
        return user;
    }

    @Get('/session')
    async session(@Inject() ctx: RequestContext): Promise<{ authenticated: boolean; user?: SessionUser }> {
        const adapter = getRestfulAdapter(ctx);
        const token = bearerToken(ctx) || adapter.cookies.get('oidc_session');
        if (!token) {
            return { authenticated: false };
        }
        const user = await this.oidcService.verifySessionToken(token);
        if (!user) {
            return { authenticated: false };
        }
        return { authenticated: true, user };
    }

    @Get('/logout')
    logout(@Inject() ctx: RequestContext): { status: string } {
        const adapter = getRestfulAdapter(ctx);
        adapter.cookies.set('oidc_session', '', { maxAge: 0 });
        adapter.cookies.set('oidc_state', '', { maxAge: 0 });
        adapter.cookies.set('oidc_nonce', '', { maxAge: 0 });
        return { status: 'ok' };
    }

    @Post('/refresh')
    async refresh(
        @Inject() ctx: RequestContext,
        @RequestBody() body: { refreshToken: string }
    ): Promise<{ tokens: Record<string, unknown> } | { error: string }> {
        const adapter = getRestfulAdapter(ctx);
        const refreshToken = body?.refreshToken;
        if (!refreshToken) {
            adapter.response.statusCode = 400;
            return { error: 'Refresh token is required' };
        }
        try {
            const tokens = await this.oidcService.refreshAccessToken(refreshToken);
            return { tokens: tokens as unknown as Record<string, unknown> };
        } catch (err: unknown) {
            adapter.response.statusCode = 400;
            return { error: err instanceof Error ? err.message : 'Token refresh failed' };
        }
    }

    @Get('/.well-known/openid-configuration')
    openidConfiguration(@Inject() ctx: RequestContext): Record<string, unknown> {
        const adapter = getRestfulAdapter(ctx);
        const host = getHeaderValue(adapter, 'host') || 'localhost';
        const proto = adapter.secure ? 'https' : 'http';
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
