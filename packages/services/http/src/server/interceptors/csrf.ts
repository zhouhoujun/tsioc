import { Abstract, Inject, Injectable, Nullable, tokenId } from '@tsdi/ioc';
import { ApplicationHandler, ApplicationInterceptor } from '@tsdi/core';
import { GET, HEAD, OPTIONS } from '@tsdi/common';
import { ForbiddenException } from '@tsdi/common/transport';
import { RestfulRequestContext, Middleware, Session, CsrfOps } from '@tsdi/endpoints';
import { Observable, throwError } from 'rxjs';
import * as CSRFTokens from 'csrf';



@Abstract()
export abstract class CsrfOptions implements CsrfOps {
    invalidTokenMessage?: string | ((ctx: RestfulRequestContext) => string);
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
export class Csrf implements Middleware<RestfulRequestContext>, ApplicationInterceptor<RestfulRequestContext> {

    private options: CsrfOptions;
    private tokens: Tokens;
    constructor(@Inject() factory: CsrfTokensFactory, @Nullable() options: CsrfOptions) {
        this.options = { ...defOpts, ...options };
        this.tokens = factory.create(this.options);
    }

    intercept(ctx: RestfulRequestContext, next: ApplicationHandler<RestfulRequestContext, any>): Observable<any> {
        ctx.getInject().inject({
            provide: CSRF,
            useFactory: () => {
                const se = ctx.get(Session);
                if (!se) {
                    return null
                }
                if (!se.secret) {
                    se.secret = this.tokens.secretSync();
                }
                return this.tokens.create(se.secret)
            }
        });

        const session = ctx.get(Session);
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
            return throwError(()=> new ForbiddenException(typeof this.options.invalidTokenMessage === 'function' ? this.options.invalidTokenMessage(ctx) : this.options.invalidTokenMessage))
        }

        if (!this.tokens.verify(session.secret, token)) {
            return throwError(()=> new ForbiddenException(typeof this.options.invalidTokenMessage === 'function' ? this.options.invalidTokenMessage(ctx) : this.options.invalidTokenMessage))
        }

        return next.handle(ctx)
    }

    async invoke(ctx: RestfulRequestContext, next: () => Promise<void>): Promise<void> {

        ctx.getInject().inject({
            provide: CSRF,
            useFactory: () => {
                const se = ctx.get(Session);
                if (!se) {
                    return null
                }
                if (!se.secret) {
                    se.secret = this.tokens.secretSync();
                }
                return this.tokens.create(se.secret)
            }
        });

        const session = ctx.get(Session);
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
            throw new ForbiddenException(typeof this.options.invalidTokenMessage === 'function' ? this.options.invalidTokenMessage(ctx) : this.options.invalidTokenMessage)
        }

        if (!this.tokens.verify(session.secret, token)) {
            throw new ForbiddenException(typeof this.options.invalidTokenMessage === 'function' ? this.options.invalidTokenMessage(ctx) : this.options.invalidTokenMessage)
        }

        return next()
    }

}

const CSRF_TOKEN = 'csrf-token';
const XSRF_TOKEN = 'xsrf-token';
const X_CSRF_TOKEN = 'x-csrf-token';
const X_XSRF_TOKEN = 'x-xsrf-token';