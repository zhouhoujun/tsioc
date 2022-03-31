import { Abstract, tokenId } from '@tsdi/ioc';
import { Endpoint, Middleware, MiddlewareFn } from '@tsdi/core';
import { Observable } from 'rxjs';
import { HttpContext } from './context';

/**
 * http server side handler.
 */
@Abstract()
export abstract class HttpEndpoint implements Endpoint<HttpContext> {
    /**
     * http transport handler.
     * @param ctx http request context.
     */
    abstract endpoint(ctx: HttpContext): Observable<HttpContext>;
}

/**
 * http middlewares token.
 */
export const HTTP_MIDDLEWARES = tokenId<(Middleware<HttpContext> | MiddlewareFn<HttpContext>)[]>('MIDDLEWARES');
