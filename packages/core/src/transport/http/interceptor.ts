import { Injectable, InvocationContext, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { TransportHandler } from '../handler';
import { InterceptorHandler, TransportInterceptor } from '../interceptor';
import { HttpHandler, HttpBackend } from './handler';
import { HttpRequest } from './request';
import { HttpResponse } from './response';




/**
 * http transport interceptors.
 */
export const HTTP_INTERCEPTORS = tokenId<TransportInterceptor<HttpRequest, HttpResponse>[]>('HTTP_INTERCEPTORS');


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
export class HttpInterceptingHandler
 implements TransportHandler<HttpRequest, HttpResponse> {
    private chain!: HttpHandler;

    constructor(private backend: HttpBackend, private context: InvocationContext) { }

    handle(req: HttpRequest): Observable<HttpResponse> {
        if (!this.chain) {
            const interceptors = this.context.get(HTTP_INTERCEPTORS);
            this.chain = interceptors.reduceRight(
                (next, interceptor) => new InterceptorHandler(next, interceptor), this.backend);
        }
        return this.chain.handle(req);
    }
}



