import { Abstract, tokenId } from '@tsdi/ioc';
import { Endpoint, HttpRequest, HttpResponse, Middleware } from '@tsdi/core';
import { Observable } from 'rxjs';

/**
 * http server side handler.
 */
@Abstract()
export abstract class HttpEndpoint implements Endpoint<HttpRequest, HttpResponse> {
    /**
     * http transport handler.
     * @param req http request context.
     */
    abstract handle(req: HttpRequest): Observable<any>;
}

/**
 * http middleware.
 */
export interface HttpMiddleware extends Middleware<HttpRequest, HttpResponse> {

}

/**
 * http middlewares token.
 */
export const HTTP_MIDDLEWARES = tokenId<HttpMiddleware[]>('HTTP_MIDDLEWARES');

