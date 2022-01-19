import { Injectable, InvocationContext, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { TransportRequest, TransportResponse } from './packet';
import { TransportContext } from './context';
import { TransportBackend, TransportHandler } from './handler';
import { TransportInterceptor } from './interceptor';



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

    constructor(private backend: TransportBackend, private context: InvocationContext) { }

    handle(ctx: TransportContext<TransportRequest>): Observable<TransportResponse> {
        if (!this.chain) {
            const interceptors = this.context.get(TRANSPORT_INTERCEPTORS);
            this.chain = interceptors.reduceRight(
                (next, interceptor) => new InterceptorHandler(next, interceptor), this.backend as TransportHandler);
        }
        return this.chain.handle(ctx);
    }
}


export class InterceptorHandler<TInput = any, TOutput = any> implements TransportHandler<TInput, TOutput> {
    constructor(private next: TransportHandler, private interceptor: TransportInterceptor) { }

    handle(ctx: TransportContext<TInput>): Observable<TOutput> {
        return this.interceptor.intercept(ctx, this.next);
    }
}
