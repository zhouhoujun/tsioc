import { Abstract, Inject, Injectable, Nullable, tokenId } from '@tsdi/ioc';
import { GET, HEAD, OPTIONS } from '@tsdi/common';
import { ForbiddenExecption } from '@tsdi/common/transport';
import { AssetContext, Middleware, SessionAdapter } from '@tsdi/endpoints';
import { Handler, Interceptor } from '@tsdi/core';
import { Observable, throwError } from 'rxjs';
import * as CSRFTokens from 'csrf';



@Abstract()
export abstract class CsrfOptions {
    invalidTokenMessage?: string | ((ctx: AssetContext) => string);
    excludedMethods?: string[];
    disableQuery?: boolean;
    /**
     * The string length of the salt (default: 8)
     */
    saltLength?: number;
    /**
     * The byte length of the secret key (default: 18)
     */
    secretLength?: number;
}


const defOpts = {
    invalidTokenMessage: 'Invalid CSRF token',
    excludedMethods: [GET, HEAD, OPTIONS],
    disableQuery: false
} as CsrfOptions;

export const CSRF = tokenId<string>('CSRF');

/**
 * Csrf tokens.
 */
export interface Tokens {
    /**
     * Create a new CSRF token.
     */
    create(secret: string): string;

    /**
     * Create a new secret key.
     */
    secret(): Promise<string>;

    /**
     * Create a new secret key.
     */
    secret(callback: (err: Error | null, secret: string) => void): void;

    /**
     * Create a new secret key synchronously.
     */
    secretSync(): string;

    /**
     * Verify if a given token is valid for a given secret.
     */
    verify(secret: string, token: string): boolean;
}

/**
 * csrf tokens factory.
 */
@Injectable()
export class CsrfTokensFactory {
    create(options: CsrfOptions): Tokens {
        return new CSRFTokens(options);
    }
}

@Injectable()
export class Csrf implements Middleware<AssetContext>, Interceptor<AssetContext> {

    private options: CsrfOptions;
    private tokens: Tokens;
    constructor(@Inject() factory: CsrfTokensFactory, @Nullable() options: CsrfOptions) {
        this.options = { ...defOpts, ...options };
        this.tokens = factory.create(this.options);
    }

    intercept(ctx: AssetContext, next: Handler<AssetContext, any>): Observable<any> {
        ctx.injector.inject({
            provide: CSRF,
            useFactory: () => {
                const se = ctx.injector.get(SessionAdapter, null);
                if (!se) {
                    return null
                }
                if (!se.secret) {
                    se.secret = this.tokens.secretSync();
                }
                return this.tokens.create(se.secret)
            }
        });

        const session = ctx.injector.get(SessionAdapter, null);
        if (!session || this.options.excludedMethods?.indexOf(ctx.method) !== -1) {
            return next.handle(ctx)
        }

        if (!session.secret) {
            session.secret = this.tokens.secretSync()
        }


        const bodyToken = ctx.request.body && typeof ctx.request.body._csrf === 'string' ? ctx.request.body._csrf : false;
        const token = bodyToken || !this.options.disableQuery && ctx.query && ctx.query._csrf
            || ctx.getHeader(CSRF_TOKEN)
            || ctx.getHeader(XSRF_TOKEN)
            || ctx.getHeader(X_CSRF_TOKEN)
            || ctx.getHeader(X_XSRF_TOKEN);

        if (!token) {
            return throwError(()=> new ForbiddenExecption(typeof this.options.invalidTokenMessage === 'function' ? this.options.invalidTokenMessage(ctx) : this.options.invalidTokenMessage))
        }

        if (!this.tokens.verify(session.secret, token)) {
            return throwError(()=> new ForbiddenExecption(typeof this.options.invalidTokenMessage === 'function' ? this.options.invalidTokenMessage(ctx) : this.options.invalidTokenMessage))
        }

        return next.handle(ctx)
    }

    async invoke(ctx: AssetContext, next: () => Promise<void>): Promise<void> {

        ctx.injector.inject({
            provide: CSRF,
            useFactory: () => {
                const se = ctx.injector.get(SessionAdapter, null);
                if (!se) {
                    return null
                }
                if (!se.secret) {
                    se.secret = this.tokens.secretSync();
                }
                return this.tokens.create(se.secret)
            }
        });

        const session = ctx.injector.get(SessionAdapter, null);
        if (!session || this.options.excludedMethods?.indexOf(ctx.method) !== -1) {
            return await next()
        }

        if (!session.secret) {
            session.secret = this.tokens.secretSync()
        }


        const bodyToken = ctx.request.body && typeof ctx.request.body._csrf === 'string' ? ctx.request.body._csrf : false;
        const token = bodyToken || !this.options.disableQuery && ctx.query && ctx.query._csrf
            || ctx.getHeader(CSRF_TOKEN)
            || ctx.getHeader(XSRF_TOKEN)
            || ctx.getHeader(X_CSRF_TOKEN)
            || ctx.getHeader(X_XSRF_TOKEN);

        if (!token) {
            throw new ForbiddenExecption(typeof this.options.invalidTokenMessage === 'function' ? this.options.invalidTokenMessage(ctx) : this.options.invalidTokenMessage)
        }

        if (!this.tokens.verify(session.secret, token)) {
            throw new ForbiddenExecption(typeof this.options.invalidTokenMessage === 'function' ? this.options.invalidTokenMessage(ctx) : this.options.invalidTokenMessage)
        }

        return next()
    }

}

const CSRF_TOKEN = 'csrf-token';
const XSRF_TOKEN = 'xsrf-token';
const X_CSRF_TOKEN = 'x-csrf-token';
const X_XSRF_TOKEN = 'x-xsrf-token';