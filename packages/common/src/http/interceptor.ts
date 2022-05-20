import { Injectable, Injector, InvocationContext, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Interceptor, InterceptorEndpoint } from '@tsdi/core';
import { HttpBackend, HttpHandler } from './handler';
import { HttpRequest } from './request';
import { HttpEvent } from './response';

/**
 * http interceptor.
 */
export interface HttpInterceptor extends Interceptor<HttpRequest, HttpEvent> {
    /**
     * the method to implemet interceptor.
     * @param req request.
     * @param next route handler.
     * @param context request with context for interceptor
     */
    intercept(req: HttpRequest, next: HttpHandler, context: InvocationContext): Observable<HttpEvent>;
}


/**
 * http transport interceptors for `HttpClient`.
 */
export const HTTP_CLIENT_INTERCEPTORS = tokenId<HttpInterceptor[]>('HTTP_CLIENT_INTERCEPTORS');


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
export class HttpInterceptingHandler implements HttpHandler {
    private chain!: HttpHandler;

    constructor(private backend: HttpBackend, private injector: Injector) { }

    handle(req: HttpRequest, context: InvocationContext): Observable<HttpEvent> {
        if (!this.chain) {
            const interceptors = this.injector.get(HTTP_CLIENT_INTERCEPTORS);
            this.chain = interceptors.reduceRight(
                (next, interceptor) => new InterceptorEndpoint(next, interceptor), this.backend)
        }
        return this.chain.handle(req, context)
    }
}

@Injectable()
export class NoopInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<any>, next: HttpHandler, context: InvocationContext): Observable<HttpEvent> {
        return next.handle(req, context)
    }
}
