import { Injectable, tokenId, Inject } from '@tsdi/ioc';
import { RequestInterceptingHandler, RequestInterceptor } from '@tsdi/common';
import { Observable } from 'rxjs';
import { HttpBackend, HttpHandler } from './handler';
import { HttpRequest } from './request';
import { HttpEvent } from './response';

/**
 * http interceptor.
 */
export interface HttpInterceptor extends RequestInterceptor<HttpRequest<any>, HttpEvent<any>> {
    /**
     * the method to implemet interceptor.
     * @param req request.
     * @param next route handler.
     */
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>>;
}


/**
 * common http client interceptors for `HttpClient`.
 */
export const HTTP_COMMON_INTERCEPTORS = tokenId<HttpInterceptor[]>('HTTP_COMMON_INTERCEPTORS');


/**
 * An injectable {@link HttpHandler} that applies multiple interceptors
 * to a request before passing it to the given {@link HttpBackend}.
 *
 * The interceptors are loaded lazily from the injector, to allow
 * interceptors to themselves inject classes depending indirectly
 * on `InterceptingHandler` itself.
 * @see `TransportInterceptor`
 */
@Injectable()
export class HttpInterceptingHandler extends RequestInterceptingHandler<HttpRequest<any>, HttpEvent<any>> implements HttpHandler {
    constructor(backend: HttpBackend, @Inject(HTTP_COMMON_INTERCEPTORS) interceptors: HttpInterceptor[]) {
        super(backend, interceptors)
    }
}

@Injectable()
export class NoopInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(req)
    }
}
