import { Inject } from '@tsdi/ioc';
import { RedirectResult } from '@tsdi/service';
import { Controller, Get, Post, RequestBody, RequestParam } from '@tsdi/service';
import { RestfulRequestAdapter } from '@tsdi/common';
import { OIDCService, SessionUser } from '@tsdi/oidc-auth';
import { WORKFLOW_ADMIN_AUTH_OPTIONS, WorkflowAdminAuthOptions } from './options';

function adapterOf(input: any): any {
    return input;
}

function cookiesOf(ctx: any): any {
    return ctx?.cookies || { get: () => undefined, set: () => undefined };
}

function bearer(ctx: any): string | undefined {
    const header = typeof ctx?.getHeader === 'function' ? ctx.getHeader('authorization') : undefined;
    return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
}

function status(ctx: any, value: number): void {
    if (typeof ctx?.setStatus === 'function') {
        ctx.setStatus(value);
    } else if ('status' in (ctx || {})) {
        ctx.status = value;
    } else if (ctx?.response) {
        ctx.response.statusCode = value;
    }
}

async function currentUser(oidc: OIDCService, ctx: any): Promise<SessionUser | null> {
    const token = bearer(ctx) || cookiesOf(ctx).get('oidc_session');
    if (!token) {
        return null;
    }
    return await oidc.verifySessionToken(token)
        ?? (await oidc.verifyAccessToken(token))?.user
        ?? null;
}

@Controller('/auth')
export class WorkflowAuthController {
    constructor(
        private readonly oidc: OIDCService,
        @Inject(WORKFLOW_ADMIN_AUTH_OPTIONS) private readonly options: WorkflowAdminAuthOptions
    ) { }

    @Get('/config')
    config() {
        return {
            enabled: this.options.enabled === true,
            startOidcService: this.options.startOidcService !== false,
            local: this.options.enabled === true && this.options.startOidcService !== false,
            provider: !!(this.options.clientId && this.options.authorizationURL && this.options.tokenURL),
            allowRegistration: this.options.allowRegistration === true,
            loginUrl: this.options.loginUrl
        };
    }

    @Get('/session')
    async session(@Inject(RestfulRequestAdapter) ctx: RestfulRequestAdapter) {
        if (!this.options.enabled) {
            return { authenticated: true };
        }
        const user = await currentUser(this.oidc, adapterOf(ctx));
        if (!user) {
            status(ctx, 401);
            return { authenticated: false };
        }
        return { authenticated: true, user };
    }

    @Get('/login')
    async login(@Inject(RestfulRequestAdapter) ctx: RestfulRequestAdapter) {
        if (!this.options.enabled) {
            return { url: '/' };
        }
        if (this.options.loginUrl) {
            return { url: this.options.loginUrl };
        }
        if (this.options.startOidcService === false) {
            status(ctx, 404);
            return { error: 'OIDC service is external; configure WORKFLOW_ADMIN_LOGIN_URL' };
        }
        const challenge = this.oidc.authenticate();
        const cookies = cookiesOf(ctx);
        cookies.set('oidc_state', challenge.state, { httpOnly: true, sameSite: 'lax', secure: ctx.secure, maxAge: 600 });
        cookies.set('oidc_nonce', challenge.nonce, { httpOnly: true, sameSite: 'lax', secure: ctx.secure, maxAge: 600 });
        return { url: challenge.url };
    }

    @Get('/callback')
    async callback(
        @Inject(RestfulRequestAdapter) ctx: RestfulRequestAdapter,
        @RequestParam('code') code: string,
        @RequestParam('state') state: string
    ): Promise<RedirectResult> {
        if (!this.options.enabled || this.options.startOidcService === false) {
            status(ctx, 404);
            return new RedirectResult('/login.html');
        }
        const cookies = cookiesOf(ctx);
        const expectedState = cookies.get('oidc_state') || '';
        const expectedNonce = cookies.get('oidc_nonce') || '';
        cookies.set('oidc_state', '', { maxAge: 0 });
        cookies.set('oidc_nonce', '', { maxAge: 0 });
        try {
            const result = await this.oidc.handleCallback(code, state, expectedState, expectedNonce);
            const sessionToken = result.tokens.sessionToken || await this.oidc.createSessionToken(result.user as unknown as SessionUser);
            cookies.set('oidc_session', sessionToken, { httpOnly: true, sameSite: 'lax', secure: ctx.secure, maxAge: 86400 });
            return new RedirectResult('/');
        } catch {
            return new RedirectResult('/login.html?error=auth');
        }
    }

    @Post('/login')
    async loginLocal(
        @Inject(RestfulRequestAdapter) ctx: RestfulRequestAdapter,
        @RequestBody() body: { username?: string; password?: string }
    ) {
        if (!this.options.enabled || this.options.startOidcService === false) {
            status(ctx, 404);
            return { error: 'Local login is disabled' };
        }
        try {
            const result = await this.oidc.login({ username: body?.username || '', password: body?.password || '' });
            const sessionToken = result.tokens.sessionToken || await this.oidc.createSessionToken(result.user as unknown as SessionUser);
            cookiesOf(ctx).set('oidc_session', sessionToken, { httpOnly: true, sameSite: 'lax', secure: ctx.secure, maxAge: 86400 });
            return { authenticated: true, user: result.user };
        } catch (error) {
            status(ctx, 401);
            return { error: (error as Error).message || 'Invalid username or password' };
        }
    }

    @Post('/register')
    async register(
        @Inject(RestfulRequestAdapter) ctx: RestfulRequestAdapter,
        @RequestBody() body: { username?: string; password?: string; email?: string; displayName?: string }
    ) {
        if (!this.options.enabled || this.options.startOidcService === false || this.options.allowRegistration !== true) {
            status(ctx, 403);
            return { error: 'Registration is disabled' };
        }
        try {
            const result = await this.oidc.register({
                username: body?.username || '',
                password: body?.password || '',
                email: body?.email,
                displayName: body?.displayName
            });
            const sessionToken = result.tokens.sessionToken || await this.oidc.createSessionToken(result.user as unknown as SessionUser);
            cookiesOf(ctx).set('oidc_session', sessionToken, { httpOnly: true, sameSite: 'lax', secure: ctx.secure, maxAge: 86400 });
            return { authenticated: true, user: result.user };
        } catch (error) {
            status(ctx, 400);
            return { error: (error as Error).message || 'Registration failed' };
        }
    }

    @Get('/logout')
    logout(@Inject(RestfulRequestAdapter) ctx: RestfulRequestAdapter): RedirectResult {
        cookiesOf(ctx).set('oidc_session', '', { maxAge: 0 });
        return new RedirectResult('/login.html');
    }
}
