import { Abstract } from '@tsdi/ioc';
import { Endpoint } from '@tsdi/core';
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

