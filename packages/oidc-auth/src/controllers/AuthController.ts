import { Inject } from '@tsdi/ioc';
import { RequestContext } from '@tsdi/common';
import { HTTP_COOKIES, HTTP_RESPONSE } from '@tsdi/http';
import { Controller, Get, Post, RequestParam, RequestBody } from '@tsdi/service';
import { OIDCService, SessionUser } from '../auth/OIDCService';

function getAdapter(ctx: any): any {
    return typeof ctx?.getMessageAdapter === 'function' ? ctx.getMessageAdapter() : null;
}

function getCookies(ctx: any): { get(name: string): string | undefined; set(name: string, value?: string, opts?: Record<string, any>): void } {
    if (typeof ctx?.get === 'function') {
        const cookies = ctx.get(HTTP_COOKIES as any);
        if (cookies) {
            return cookies;
        }
    }
    if (ctx?.cookies) {
        return ctx.cookies;
    }
    const header = getHeader(ctx, 'cookie') ?? '';
    const response = getResponse(ctx);
    return {
        get: (name: string) => parseCookieHeader(header)[name],
        set: (name: string, value = '', opts: Record<string, any> = {}) => {
            const serialized = serializeCookie(name, value, opts);
            const current = response?.getHeader?.('set-cookie');
            const nextValue = Array.isArray(current)
                ? [...current, serialized]
                : current != null
                    ? [String(current), serialized]
                    : [serialized];
            response?.setHeader?.('set-cookie', nextValue);
        }
    };
}

function parseCookieHeader(header: string): Record<string, string> {
    return header.split(';').reduce((cookies, entry) => {
        const [rawName, ...rest] = entry.split('=');
        const name = rawName?.trim();
        if (!name) {
            return cookies;
        }
        cookies[name] = decodeURIComponent(rest.join('=').trim());
        return cookies;
    }, {} as Record<string, string>);
}

function serializeCookie(name: string, value: string, opts: Record<string, any>): string {
    const segments = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
    if (opts.maxAge != null) {
        segments.push(`Max-Age=${opts.maxAge}`);
    }
    segments.push(`Path=${opts.path ?? '/'}`);
    if (opts.httpOnly) {
        segments.push('HttpOnly');
    }
    if (opts.secure) {
        segments.push('Secure');
    }
    if (opts.sameSite) {
        segments.push(`SameSite=${opts.sameSite}`);
    }
    return segments.join('; ');
}

function getResponse(ctx: any): any {
    if (typeof ctx?.get === 'function') {
        return ctx.get(HTTP_RESPONSE as any) ?? getAdapter(ctx)?.response;
    }
    return ctx.response;
}

function isSecure(ctx: any): boolean {
    const adapter = getAdapter(ctx);
    if (adapter) {
        return !!adapter.secure;
    }
    return !!ctx.secure;
}

function getHeader(ctx: any, name: string): string | undefined {
    const adapter = getAdapter(ctx);
    const adapted = adapter?.getHeader?.(name);
    if (adapted != null) {
        return String(adapted);
    }
    const headers = ctx?.request?.headers as Record<string, unknown> | undefined;
    if (!headers) {
        return undefined;
    }
    const val = headers[name];
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val[0];
    return undefined;
}

function bearerToken(ctx: any): string | null {
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
    login(@Inject(RequestContext) ctx: RequestContext): { url: string } {
        const challenge = this.oidcService.authenticate();
        const cookies = getCookies(ctx);
        cookies.set('oidc_state', challenge.state, {
            httpOnly: true,
            sameSite: 'lax',
            secure: isSecure(ctx),
            maxAge: 600
        });
        cookies.set('oidc_nonce', challenge.nonce, {
            httpOnly: true,
            sameSite: 'lax',
            secure: isSecure(ctx),
            maxAge: 600
        });
        return { url: challenge.url };
    }

    @Get('/callback')
    async callback(
        @Inject(RequestContext) ctx: RequestContext,
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

        cookies.set('oidc_session', sessionToken, {
            httpOnly: true,
            sameSite: 'lax',
            secure: isSecure(ctx),
            maxAge: 86400
        });

        return {
            sessionToken,
            user: result.user
        };
    }

    @Get('/userinfo')
    async userinfo(@Inject(RequestContext) ctx: RequestContext): Promise<SessionUser | { error: string }> {
        const cookies = getCookies(ctx);
        const response = getResponse(ctx);
        const token = bearerToken(ctx) || cookies.get('oidc_session');
        if (!token) {
            response.statusCode = 401;
            return { error: 'Not authenticated' };
        }
        const user = await this.oidcService.verifySessionToken(token);
        if (!user) {
            response.statusCode = 401;
            return { error: 'Invalid or expired session' };
        }
        return user;
    }

    @Get('/session')
    async session(@Inject(RequestContext) ctx: RequestContext): Promise<{ authenticated: boolean; user?: SessionUser }> {
        const cookies = getCookies(ctx);
        const token = bearerToken(ctx) || cookies.get('oidc_session');
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
    logout(@Inject(RequestContext) ctx: RequestContext): { status: string } {
        const cookies = getCookies(ctx);
        cookies.set('oidc_session', '', { maxAge: 0 });
        cookies.set('oidc_state', '', { maxAge: 0 });
        cookies.set('oidc_nonce', '', { maxAge: 0 });
        return { status: 'ok' };
    }

    @Post('/refresh')
    async refresh(
        @Inject(RequestContext) ctx: RequestContext,
        @RequestBody() body: { refreshToken: string }
    ): Promise<{ tokens: Record<string, unknown> } | { error: string }> {
        const response = getResponse(ctx);
        const refreshToken = body?.refreshToken;
        if (!refreshToken) {
            response.statusCode = 400;
            return { error: 'Refresh token is required' };
        }
        try {
            const tokens = await this.oidcService.refreshAccessToken(refreshToken);
            return { tokens: tokens as unknown as Record<string, unknown> };
        } catch (err: unknown) {
            response.statusCode = 400;
            return { error: err instanceof Error ? err.message : 'Token refresh failed' };
        }
    }

    @Get('/.well-known/openid-configuration')
    openidConfiguration(@Inject(RequestContext) ctx: RequestContext): Record<string, unknown> {
        const host = getHeader(ctx, 'host') || 'localhost';
        const proto = isSecure(ctx) ? 'https' : 'http';
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
