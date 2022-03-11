import { Abstract, Injectable, InvocationContext } from '@tsdi/ioc';
import { HttpEvent, HttpHandler, HttpRequest, HTTP_INTERCEPTORS, InterceptorHandler } from '@tsdi/core';
import { Observable } from 'rxjs';

/**
 * http server side handler.
 */
 @Abstract()
 export abstract class HttpEndpoint implements HttpHandler {
     /**
      * http transport handler.
      * @param req http request input.
      */
      abstract handle(req: HttpRequest): Observable<HttpEvent>;
 }
 

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
export class HttpRouteInterceptingHandler implements HttpHandler {
    private chain!: HttpHandler;

    constructor(private router: HttpEndpoint, private context: InvocationContext) { }

    handle(req: HttpRequest): Observable<HttpEvent> {
        if (!this.chain) {
            const interceptors = this.context.resolve(HTTP_INTERCEPTORS);
            this.chain = interceptors.reduceRight(
                (next, interceptor) => new InterceptorHandler(next, interceptor), this.router);
        }
        return this.chain.handle(req);
    }
}