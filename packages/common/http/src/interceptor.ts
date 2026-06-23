import { Injectable, token, Injector } from '@tsdi/ioc';
import { RequestContext, RequestInterceptingHandler, RequestInterceptor, RequestInterceptorLike } from '@tsdi/common';
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
    intercept(req: HttpRequest<any>, next: HttpHandler, context: RequestContext): Observable<HttpEvent<any>>;
}

export type HttpInterceptorFn = RequestInterceptorLike<HttpRequest<any>, HttpEvent<any>, RequestContext>;


/**
 * common http client interceptors for `HttpClient`.
 */
export const HTTP_COMMON_INTERCEPTORS = token<HttpInterceptor[]>('HTTP_COMMON_INTERCEPTORS');
export const HTTP_FEATURE_INTERCEPTORS = token<HttpInterceptorFn[]>('HTTP_FEATURE_INTERCEPTORS');
export const HTTP_INCLUDE_LEGACY_INTERCEPTORS = token<boolean>('HTTP_INCLUDE_LEGACY_INTERCEPTORS');


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
    constructor(backend: HttpBackend, injector: Injector) {
        super(backend, () => {
            const interceptors = injector.get(HTTP_FEATURE_INTERCEPTORS, []);
            if (injector.get(HTTP_INCLUDE_LEGACY_INTERCEPTORS, false)) {
                interceptors.push(...injector.get(HTTP_COMMON_INTERCEPTORS, []));
            }
            return interceptors;
        })
    }
}

@Injectable()
export class NoopInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<any>, next: HttpHandler, context: RequestContext): Observable<HttpEvent<any>> {
        return next.handle(req, context)
    }
}
