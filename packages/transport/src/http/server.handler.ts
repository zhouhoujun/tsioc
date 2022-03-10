import { Abstract, Injectable, InvocationContext, tokenId } from '@tsdi/ioc';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, InterceptorHandler, TransportHandler } from '@tsdi/core';
import { Observable } from 'rxjs';

/**
 * http server side handler.
 */
 @Abstract()
 export abstract class HttpRoute implements TransportHandler<HttpRequest, HttpEvent> {
     /**
      * http transport handler.
      * @param req http request input.
      */
      abstract handle(req: HttpRequest): Observable<HttpEvent>;
 }

 

 /**
 * http server transport interceptors.
 */
export const HTTP_SERVER_INTERCEPTORS = tokenId<HttpInterceptor[]>('HTTP_SERVER_INTERCEPTORS');



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

    constructor(private router: HttpRoute, private context: InvocationContext) { }

    handle(req: HttpRequest): Observable<HttpEvent> {
        if (!this.chain) {
            const interceptors = this.context.get(HTTP_SERVER_INTERCEPTORS);
            this.chain = interceptors.reduceRight(
                (next, interceptor) => new InterceptorHandler(next, interceptor), this.router);
        }
        return this.chain.handle(req);
    }
}