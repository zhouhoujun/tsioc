import { AssetContext, ForbiddenExecption, GET, HEAD, Middleware, OPTIONS } from '@tsdi/core';
import { Abstract, Injectable, Nullable, tokenId } from '@tsdi/ioc';
import { hdr } from '../consts';
import { SessionAdapter } from './session';


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
@Abstract()
export abstract class CsrfTokensFactory {
    /**
     * create csrf tokens via options.
     * @param options 
     */
    abstract create(options: CsrfOptions): Tokens;
}

@Injectable()
export class CsrfMiddleware implements Middleware<AssetContext> {

    private options: CsrfOptions;
    private tokens: Tokens;
    constructor(factory: CsrfTokensFactory, @Nullable() options: CsrfOptions) {
        this.options = { ...defOpts, ...options };
        this.tokens = factory.create(this.options);
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
            || ctx.getHeader(hdr.CSRF_TOKEN)
            || ctx.getHeader(hdr.XSRF_TOKEN)
            || ctx.getHeader(hdr.X_CSRF_TOKEN)
            || ctx.getHeader(hdr.X_XSRF_TOKEN);

        if (!token) {
            throw new ForbiddenExecption(typeof this.options.invalidTokenMessage === 'function' ? this.options.invalidTokenMessage(ctx) : this.options.invalidTokenMessage)
        }

        if (!this.tokens.verify(session.secret, token)) {
            throw new ForbiddenExecption(typeof this.options.invalidTokenMessage === 'function' ? this.options.invalidTokenMessage(ctx) : this.options.invalidTokenMessage)
        }

        return next()
    }

}
