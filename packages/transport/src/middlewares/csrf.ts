import { HeaderContext, Middleware, mths, TransportContext } from '@tsdi/core';
import { Abstract, Injectable, Nullable, tokenId } from '@tsdi/ioc';
import * as Tokens from 'csrf';
import { hdr } from '../consts';
import { Session } from './session';


@Abstract()
export abstract class CsrfOptions implements Tokens.Options {
    invalidTokenMessage?: string | ((ctx: TransportContext) => string);
    invalidTokenStatusCode?: number;
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
    invalidTokenStatusCode: 403,
    excludedMethods: [mths.GET, mths.HEAD, mths.OPTIONS],
    disableQuery: false
} as CsrfOptions;

export const CSRF = tokenId<string>('CSRF');

@Injectable()
export class CsrfMiddleware implements Middleware {

    private options: CsrfOptions;
    private tokens: Tokens;
    constructor(@Nullable() options: CsrfOptions) {
        this.options = { ...defOpts, ...options };
        this.tokens = new Tokens(this.options);
    }

    async invoke(ctx: TransportContext & HeaderContext, next: () => Promise<void>): Promise<void> {

        ctx.injector.inject({
            provide: CSRF,
            useFactory: () => {
                const se = ctx.injector.get(Session, null);
                if (!se) {
                    return null
                }
                if (!se.secret) {
                    se.secret = this.tokens.secretSync();
                }
                return this.tokens.create(se.secret)
            }
        });

        const session = ctx.injector.get(Session, null);
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
            throw ctx.throwError(this.options.invalidTokenStatusCode!, typeof this.options.invalidTokenMessage === 'function' ? this.options.invalidTokenMessage(ctx) : this.options.invalidTokenMessage)
        }

        if (!this.tokens.verify(session.secret, token)) {
            throw ctx.throwError(this.options.invalidTokenStatusCode!, typeof this.options.invalidTokenMessage === 'function' ? this.options.invalidTokenMessage(ctx) : this.options.invalidTokenMessage)
        }

        return next()
    }

}
