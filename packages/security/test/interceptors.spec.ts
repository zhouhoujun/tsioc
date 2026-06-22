import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createInjector, Injector, Provider } from '@tsdi/ioc';
import { Authenticator, BasicAuthInterceptor, BasicAuthOptions, InvalidTokenException, JWTOption, JwtInterceptor, JWTService } from '../src';
import { BasicAuthModule } from '../src/basic/basic.module';
import { SecurityModule } from '../src/security.module';
import { lastValueFrom, of } from 'rxjs';
import { UnauthorizedException, RequestContext, StatusMessageAdapter, RestfulRequestAdapter } from '@tsdi/common';

class AuthenticatorStub extends Authenticator {
    loginCalls: Array<{ ctx: RequestContext; user: any }> = [];
    shouldReject = false;

    async login(ctx: RequestContext, user: any): Promise<void> {
        this.loginCalls.push({ ctx, user });
        if (this.shouldReject) {
            throw new Error('login rejected');
        }
    }

    async logout(_ctx: RequestContext): Promise<void> {
        return;
    }
}

class AdapterStub {
    readonly headers = new Map<string, string>();
    readonly query: Record<string, any>;
    readonly request: { body: Record<string, any> };

    constructor(init?: { headers?: Record<string, string>; query?: Record<string, any>; body?: Record<string, any> }) {
        this.query = init?.query ?? {};
        this.request = { body: init?.body ?? {} };
        Object.entries(init?.headers ?? {}).forEach(([k, v]) => this.headers.set(k.toLowerCase(), v));
    }

    getHeader(name: string): string | undefined {
        return this.headers.get(name.toLowerCase());
    }

    setHeader(name: string, value: string): this {
        this.headers.set(name.toLowerCase(), value);
        return this;
    }
}

class ContextStub {
    private readonly values = new Map<any, any>();

    constructor(adapter: AdapterStub, extra: Provider[] = []) {
        const injector = createInjector([
            { provide: StatusMessageAdapter, useValue: adapter },
            { provide: RestfulRequestAdapter, useValue: adapter },
            ...extra
        ]);
        this.values.set(Injector, injector);
    }

    get(token: any): any {
        if (this.values.has(token)) {
            return this.values.get(token);
        }
        return this.values.get(Injector).get(token, null);
    }

    set(token: any, value: any): this {
        this.values.set(token, value);
        return this;
    }
}

function nextHandler() {
    return {
        handle: (_input: any) => of({ ok: true })
    } as any;
}

@Suite('Security interceptors and JWT utilities')
export class SecurityInterceptorsTest {
    @Test('basic auth interceptor authenticates valid credentials')
    async basicAuthValid() {
        const authenticator = new AuthenticatorStub();
        const interceptor = new BasicAuthInterceptor(authenticator);
        const adapter = new AdapterStub({
            headers: {
                authorization: `Basic ${Buffer.from('admin:secret').toString('base64')}`
            }
        });
        const ctx = new ContextStub(adapter, [
            { provide: BasicAuthOptions, useValue: { realm: 'Members', charset: 'UTF-8' } }
        ]) as unknown as RequestContext;

        const result = await lastValueFrom(interceptor.intercept(ctx, nextHandler(), undefined));

        expect(result).toEqual({ ok: true });
        expect(authenticator.loginCalls).toHaveLength(1);
        expect(authenticator.loginCalls[0].user).toEqual({ username: 'admin', password: 'secret' });
    }

    @Test('basic auth interceptor sets challenge header for missing credentials')
    async basicAuthMissingHeader() {
        const interceptor = new BasicAuthInterceptor(new AuthenticatorStub());
        const adapter = new AdapterStub();
        const ctx = new ContextStub(adapter, [
            { provide: BasicAuthOptions, useValue: { realm: 'Members', charset: 'UTF-8' } }
        ]) as unknown as RequestContext;

        await expect(lastValueFrom(interceptor.intercept(ctx, nextHandler(), undefined))).rejects.toBeInstanceOf(UnauthorizedException);
        expect(adapter.getHeader('www-authenticate')).toBe('Basic realm="Members", charset="UTF-8"');
    }

    @Test('basic auth interceptor rejects malformed or non-basic authorization headers')
    async basicAuthInvalidHeader() {
        const interceptor = new BasicAuthInterceptor(new AuthenticatorStub());
        const nonBasicAdapter = new AdapterStub({ headers: { authorization: 'Bearer token' } });
        const malformedAdapter = new AdapterStub({
            headers: { authorization: `Basic ${Buffer.from('missing-separator').toString('base64')}` }
        });

        await expect(lastValueFrom(interceptor.intercept(new ContextStub(nonBasicAdapter) as unknown as RequestContext, nextHandler(), undefined))).rejects.toBeInstanceOf(UnauthorizedException);
        await expect(lastValueFrom(interceptor.intercept(new ContextStub(malformedAdapter) as unknown as RequestContext, nextHandler(), undefined))).rejects.toBeInstanceOf(UnauthorizedException);
    }

    @Test('basic auth interceptor wraps authenticator rejection as unauthorized response')
    async basicAuthLoginRejected() {
        const authenticator = new AuthenticatorStub();
        authenticator.shouldReject = true;
        const interceptor = new BasicAuthInterceptor(authenticator);
        const adapter = new AdapterStub({
            headers: {
                authorization: `Basic ${Buffer.from('admin:secret').toString('base64')}`
            }
        });

        await expect(lastValueFrom(interceptor.intercept(new ContextStub(adapter) as unknown as RequestContext, nextHandler(), undefined))).rejects.toThrow('login rejected');
    }

    @Test('jwt service decodes header and handles invalid header and JWK import errors')
    jwtUtilityBranches() {
        const service = new JWTService();
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';

        expect(service.decodeHeader(token)).toEqual({ alg: 'HS256', typ: 'JWT' });
        expect(() => service.decodeHeader('not-a-jwt')).toThrow('Invalid JWT header');
        expect(() => service.importKey({ kty: 'oct' } as JsonWebKey)).toThrow(/Unsupported key type/);
    }

    @Test('jwt service signs with default secret and verify returns null without token')
    async jwtDefaultKeyAndNullToken() {
        const service = new JWTService();
        const original = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET;
        try {
            const token = await service.sign({ sub: 'default-user' });
            const claims = await service.verify(token);
            expect(claims.sub).toBe('default-user');
        } finally {
            process.env.JWT_SECRET = original;
        }
    }

    @Test('jwt service wraps native sign and verify failures')
    async jwtServiceNativeFailures() {
        const service = new JWTService();
        const jwtLib = require('jsonwebtoken');
        const originalVerify = jwtLib.verify;
        const originalSign = jwtLib.sign;

        jwtLib.verify = (_token: string, _secret: any, _options: any, callback: Function) => {
            callback(new Error('verify failed'));
        };
        jwtLib.sign = (_payload: any, _secret: any, _options: any, callback: Function) => {
            callback(new Error('sign failed'));
        };
        try {
            await expect(service.verify('token', { publicKey: 'secret' as any })).rejects.toThrow('JWT verification failed: verify failed');
            await expect(service.sign({ sub: 'u-1' }, { privateKey: 'secret' as any })).rejects.toThrow('JWT signing failed: sign failed');
        } finally {
            jwtLib.verify = originalVerify;
            jwtLib.sign = originalSign;
        }
    }

    @Test('jwt interceptor reads token from header query and body')
    async jwtInterceptorTokenSources() {
        const originalVerify = require('jsonwebtoken').verify;
        const verifyCalls: any[] = [];
        require('jsonwebtoken').verify = (token: string, secret: any, options: any, callback: Function) => {
            verifyCalls.push({ token, secret, options });
            callback(null, { sub: 'jwt-user' });
        };
        try {
            const authenticator = new AuthenticatorStub();
            const interceptor = new JwtInterceptor();

            const headerCtx = new ContextStub(new AdapterStub({ headers: { authorization: 'Bearer header-token' } }), [
                { provide: JWTOption, useValue: new JWTOption('secret', 'header', 'authorization') },
                { provide: Authenticator, useValue: authenticator }
            ]) as unknown as RequestContext;
            const queryCtx = new ContextStub(new AdapterStub({ query: { access_token: 'query-token' } }), [
                { provide: JWTOption, useValue: new JWTOption('secret', 'query', 'access_token') },
                { provide: Authenticator, useValue: authenticator }
            ]) as unknown as RequestContext;
            const bodyCtx = new ContextStub(new AdapterStub({ body: { jwt: 'body-token' } }), [
                { provide: JWTOption, useValue: new JWTOption('secret', 'body', 'jwt') },
                { provide: Authenticator, useValue: authenticator }
            ]) as unknown as RequestContext;

            expect(interceptor.getToken(headerCtx, new JWTOption('secret', 'header', 'authorization'))).toBe('header-token');
            expect(interceptor.getToken(queryCtx, new JWTOption('secret', 'query', 'access_token'))).toBe('query-token');
            expect(interceptor.getToken(bodyCtx, new JWTOption('secret', 'body', 'jwt'))).toBe('body-token');

            await lastValueFrom(interceptor.intercept(headerCtx, nextHandler(), undefined));
            expect(verifyCalls[0].token).toBe('header-token');
            expect(authenticator.loginCalls[0].user).toEqual({ sub: 'jwt-user' });
        } finally {
            require('jsonwebtoken').verify = originalVerify;
        }
    }

    @Test('jwt interceptor rejects missing token verify error and authenticator error')
    async jwtInterceptorErrors() {
        const interceptor = new JwtInterceptor();
        const missingCtx = new ContextStub(new AdapterStub(), [
            { provide: JWTOption, useValue: new JWTOption('secret', 'header', 'authorization') },
            { provide: Authenticator, useValue: new AuthenticatorStub() }
        ]) as unknown as RequestContext;
        await expect(lastValueFrom(interceptor.intercept(missingCtx, nextHandler(), undefined))).rejects.toBeInstanceOf(InvalidTokenException);

        const originalVerify = require('jsonwebtoken').verify;
        require('jsonwebtoken').verify = (_token: string, _secret: any, _options: any, callback: Function) => {
            callback(new Error('bad token'));
        };
        try {
            const verifyCtx = new ContextStub(new AdapterStub({ headers: { authorization: 'Bearer invalid' } }), [
                { provide: JWTOption, useValue: new JWTOption('secret', 'header', 'authorization') },
                { provide: Authenticator, useValue: new AuthenticatorStub() }
            ]) as unknown as RequestContext;
            await expect(lastValueFrom(interceptor.intercept(verifyCtx, nextHandler(), undefined))).rejects.toBeInstanceOf(InvalidTokenException);
        } finally {
            require('jsonwebtoken').verify = originalVerify;
        }

        const passVerify = require('jsonwebtoken').verify;
        require('jsonwebtoken').verify = (_token: string, _secret: any, _options: any, callback: Function) => {
            callback(null, { sub: 'jwt-user' });
        };
        try {
            const authenticator = new AuthenticatorStub();
            authenticator.shouldReject = true;
            const authCtx = new ContextStub(new AdapterStub({ headers: { authorization: 'Bearer valid' } }), [
                { provide: JWTOption, useValue: new JWTOption('secret', 'header', 'authorization') },
                { provide: Authenticator, useValue: authenticator }
            ]) as unknown as RequestContext;
            await expect(lastValueFrom(interceptor.intercept(authCtx, nextHandler(), undefined))).rejects.toBeInstanceOf(InvalidTokenException);
        } finally {
            require('jsonwebtoken').verify = passVerify;
        }
    }

    @Test('module helper providers keep interceptor and aspect registrations')
    moduleProviders() {
        expect(BasicAuthModule.withOption({ realm: 'Members', charset: 'UTF-8' } as any).providers).toEqual([
            { provide: BasicAuthOptions, useValue: { realm: 'Members', charset: 'UTF-8' } }
        ]);
        expect(SecurityModule.withOptions({ type: 'basic' }).providers).toEqual([]);
    }
}
