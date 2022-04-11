import { Abstract } from '@tsdi/ioc';
import { Endpoint, HttpRequest, HttpResponse } from '@tsdi/core';
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

