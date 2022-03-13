import { Abstract, Injectable, InvocationContext, tokenId } from '@tsdi/ioc';
import { Chain, HttpEvent, HttpHandler, HttpRequest, HttpResponse, HTTP_INTERCEPTORS, InterceptorHandler, Middlewarable, Middleware, SERVEROPTION, TransportContextFactory, TransportEndpoint, TransportRequest } from '@tsdi/core';
import { Observable, switchMap } from 'rxjs';

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


/**
 * http middlewares token.
 */
 export const HTTP_MIDDLEWARES = tokenId<Middleware[]>('MIDDLEWARES');


/**
 * An injectable {@link TransportEndpoint} that applies multiple interceptors
 * to a request before passing it to the given {@link TransportEndpoint}.
 *
 * The interceptors are loaded lazily from the injector, to allow
 * interceptors to themselves inject classes depending indirectly
 * on `EndpointInterceptingHandler` itself.
 * @see `InterceptingEndpoint`
 */
 @Injectable()
 export class InterceptingEndpoint<TRequest extends HttpRequest, TResponse extends HttpResponse> implements TransportEndpoint<TRequest, TResponse>  {
     private chain!: Middlewarable;
 
     constructor(private endpoint: TransportEndpoint<TRequest, TResponse>, private context: InvocationContext) { }
 
     handle(request: TRequest): Observable<TResponse> {
         if (!this.chain) {
             const middlewares = this.context.resolve(HTTP_MIDDLEWARES);
             this.chain = new Chain(middlewares);
         }
         return this.endpoint.handle(request)
             .pipe(
                 switchMap(async reponse=> {
                     const args = this.context.resolve(SERVEROPTION);
                     const ctx = this.context.resolve(TransportContextFactory).create(this.context, {
                         reponse,
                         request,
                         arguments: args
                     });
                     await this.chain.handle(ctx);
                     return ctx.response as TResponse;
                 })
             )
         
     }
 }
 