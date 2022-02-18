import { Injectable, InvocationContext, OnDestroy, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { ReadPacket, WritePacket } from './packet';
import { TransportBackend, TransportHandler } from './handler';
import { TransportInterceptor } from './interceptor';



/**
 * client transport interceptors.
 */
export const TRANSPORT_INTERCEPTORS = tokenId<TransportInterceptor<ReadPacket, WritePacket>[]>('CLIENT_INTERCEPTORS');


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
export class InterceptingHandler<TRequest extends ReadPacket = ReadPacket, TResponse extends WritePacket = WritePacket>
 implements TransportHandler<TRequest, TResponse> {
    private chain!: TransportHandler<TRequest, TResponse>;

    constructor(private backend: TransportBackend, private context: InvocationContext) { }

    handle(req: TRequest): Observable<TResponse> {
        if (!this.chain) {
            const interceptors = this.context.get(TRANSPORT_INTERCEPTORS);
            this.chain = interceptors.reduceRight(
                (next, interceptor) => new InterceptorHandler(next, interceptor), this.backend as TransportHandler) as TransportHandler<TRequest, TResponse>;
        }
        return this.chain.handle(req);
    }
}


export class InterceptorHandler<TRequest extends ReadPacket = ReadPacket, TResponse extends WritePacket = WritePacket> implements TransportHandler<TRequest, TResponse> {
    constructor(private next: TransportHandler<TRequest, TResponse>, private interceptor: TransportInterceptor<TRequest, TResponse>) { }

    handle(req: TRequest): Observable<TResponse> {
        return this.interceptor.intercept(req, this.next);
    }
}
