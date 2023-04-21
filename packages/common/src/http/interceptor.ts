import { Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Interceptor, InterceptorHandler } from '@tsdi/core';
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
     */
    intercept(req: HttpRequest, next: HttpHandler): Observable<HttpEvent>;
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
export class HttpInterceptingHandler implements HttpHandler {
    private chain!: HttpHandler;

    constructor(private backend: HttpBackend, private injector: Injector) { }

    handle(req: HttpRequest): Observable<HttpEvent> {
        if (!this.chain) {
            const interceptors = this.injector.get(HTTP_COMMON_INTERCEPTORS);
            this.chain = interceptors.reduceRight(
                (next, interceptor) => new InterceptorHandler(next, interceptor), this.backend)
        }
        return this.chain.handle(req)
    }
}

@Injectable()
export class NoopInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent> {
        return next.handle(req)
    }
}
