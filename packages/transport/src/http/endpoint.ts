import { Abstract } from '@tsdi/ioc';
import { Endpoint } from '@tsdi/core';
import { Observable } from 'rxjs';
import * as http from 'http';
import * as http2 from 'http2';
import { HttpContext } from './context';

/**
 * http server side handler.
 */
@Abstract()
export abstract class HttpEndpoint implements Endpoint<HttpContext, http.ServerResponse | http2.Http2ServerResponse> {
    /**
     * http transport handler.
     * @param ctx http request context.
     */
    abstract handle(ctx: HttpContext): Observable<any>;
}

