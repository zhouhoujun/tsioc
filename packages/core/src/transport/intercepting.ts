import { Injectable, InvocationContext, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { TransportBackend, TransportHandler } from './handler';
import { TransportInterceptor } from './interceptor';
import { TransportRequest, TransportResponse } from './packet';



/**
 * client transport interceptors.
 */
export const TRANSPORT_INTERCEPTORS = tokenId<TransportInterceptor<TransportRequest, TransportResponse>[]>('CLIENT_INTERCEPTORS');


/**
 * An injectable {@link TransportHandler} that applies multiple interceptors
 * to a request before passing it to the given `TransportBackend`.
 *
 * The interceptors are loaded lazily from the injector, to allow
 * interceptors to themselves inject classes depending indirectly
 * on `InterceptingHandler` itself.
 * @see `TransportInterceptor`
 */
@Injectable()
export class InterceptingHandler implements TransportHandler {
    private chain!: TransportHandler;

    constructor(private backend: TransportBackend) { }

    handle(ctx: InvocationContext<TransportRequest>): Observable<TransportResponse> {
        if (!this.chain) {
            const interceptors = ctx.get(TRANSPORT_INTERCEPTORS);
            this.chain = interceptors.reduceRight(
                (next, interceptor) => new InterceptorHandler(next, interceptor), this.backend);
        }
        return this.chain.handle(ctx);
    }
}


export class InterceptorHandler<TInput = any, TOutput = any> implements TransportHandler<TInput, TOutput> {
    constructor(private next: TransportHandler, private interceptor: TransportInterceptor) { }

    handle(input: InvocationContext<TInput>): Observable<TOutput> {
        return this.interceptor.intercept(input, this.next);
    }
}
