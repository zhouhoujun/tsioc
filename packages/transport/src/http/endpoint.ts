import { Abstract, tokenId } from '@tsdi/ioc';
import { Endpoint, HttpRequest, HttpResponse, Interceptor } from '@tsdi/core';
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
 * http Interceptor.
 */
export interface HttpInterceptor extends Interceptor<HttpRequest, HttpResponse> {

}

/**
 * http Interceptor tokens
 */
export const HTTP_INTERCEPTORS = tokenId<Interceptor<HttpRequest, HttpResponse>[]>('HTTP_INTERCEPTORS');
