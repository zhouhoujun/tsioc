import { Controller, Get, Post, RequestParam, RequestBody, RestfulRequestContext } from '@tsdi/service';
import { OIDCService, SessionUser } from '../auth/OIDCService';

function getHeader(ctx: RestfulRequestContext, name: string): string | undefined {
    const headers = ctx.request.headers as Record<string, unknown> | undefined;
    if (!headers) return undefined;
    const val = headers[name];
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val[0];
    return undefined;
}

function bearerToken(ctx: RestfulRequestContext): string | null {
    const auth = getHeader(ctx, 'authorization');
    if (auth?.startsWith('Bearer ')) {
        return auth.slice(7).trim();
    }
    return null;
}

@Controller('/auth')
export class AuthController {
    constructor(private oidcService: OIDCService) {}

    @Get('/login')
    login(ctx: RestfulRequestContext): { url: string } {
        const challenge = this.oidcService.authenticate();
        ctx.cookies.set('oidc_state', challenge.state, {
            httpOnly: true,
            sameSite: 'lax',
            secure: ctx.secure,
            maxAge: 600000
        });
        ctx.cookies.set('oidc_nonce', challenge.nonce, {
            httpOnly: true,
            sameSite: 'lax',
            secure: ctx.secure,
            maxAge: 600000
        });
        return { url: challenge.url };
    }

    @Get('/callback')
    async callback(
        ctx: RestfulRequestContext,
        @RequestParam('code') code: string,
        @RequestParam('state') state: string
    ): Promise<{ sessionToken: string; user: Record<string, unknown> }> {
        const expectedState = ctx.cookies.get('oidc_state') || '';
        const expectedNonce = ctx.cookies.get('oidc_nonce') || '';

        ctx.cookies.set('oidc_state', '', { maxAge: 0 });
        ctx.cookies.set('oidc_nonce', '', { maxAge: 0 });

        const result = await this.oidcService.handleCallback(code, state, expectedState, expectedNonce);
        const sessionToken = await this.oidcService.createSessionToken(result.user as unknown as SessionUser);

        ctx.cookies.set('oidc_session', sessionToken, {
            httpOnly: true,
            sameSite: 'lax',
            secure: ctx.secure,
            maxAge: 86400000
        });

        return {
            sessionToken,
            user: result.user
        };
    }

    @Get('/userinfo')
    async userinfo(ctx: RestfulRequestContext): Promise<SessionUser | { error: string }> {
        const token = bearerToken(ctx) || ctx.cookies.get('oidc_session');
        if (!token) {
            ctx.response.statusCode = 401;
            return { error: 'Not authenticated' };
        }
        const user = await this.oidcService.verifySessionToken(token);
        if (!user) {
            ctx.response.statusCode = 401;
            return { error: 'Invalid or expired session' };
        }
        return user;
    }

    @Get('/session')
    async session(ctx: RestfulRequestContext): Promise<{ authenticated: boolean; user?: SessionUser }> {
        const token = bearerToken(ctx) || ctx.cookies.get('oidc_session');
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
    logout(ctx: RestfulRequestContext): { status: string } {
        ctx.cookies.set('oidc_session', '', { maxAge: 0 });
        ctx.cookies.set('oidc_state', '', { maxAge: 0 });
        ctx.cookies.set('oidc_nonce', '', { maxAge: 0 });
        return { status: 'ok' };
    }

    @Post('/refresh')
    async refresh(
        ctx: RestfulRequestContext,
        @RequestBody() body: { refreshToken: string }
    ): Promise<{ tokens: Record<string, unknown> } | { error: string }> {
        const refreshToken = body?.refreshToken;
        if (!refreshToken) {
            ctx.response.statusCode = 400;
            return { error: 'Refresh token is required' };
        }
        try {
            const tokens = await this.oidcService.refreshAccessToken(refreshToken);
            return { tokens: tokens as unknown as Record<string, unknown> };
        } catch (err: unknown) {
            ctx.response.statusCode = 400;
            return { error: err instanceof Error ? err.message : 'Token refresh failed' };
        }
    }

    @Get('/.well-known/openid-configuration')
    openidConfiguration(ctx: RestfulRequestContext): Record<string, unknown> {
        const host = getHeader(ctx, 'host') || 'localhost';
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
