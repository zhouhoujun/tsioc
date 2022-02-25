import { Injectable, InvocationContext, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { ReadPacket, WritePacket } from '../packet';
import { TransportHandler } from '../handler';
import { InterceptorHandler, TransportInterceptor } from '../interceptor';
import { HttpBackend } from './handler';



/**
 * http transport interceptors.
 */
export const HTTP_INTERCEPTORS = tokenId<TransportInterceptor<ReadPacket, WritePacket>[]>('HTTP_INTERCEPTORS');


/**
 * An injectable {@link HttpHandler} that applies multiple interceptors
 * to a request before passing it to the given `TransportBackend`.
 *
 * The interceptors are loaded lazily from the injector, to allow
 * interceptors to themselves inject classes depending indirectly
 * on `InterceptingHandler` itself.
 * @see `TransportInterceptor`
 */
@Injectable()
export class HttpInterceptingHandler<TRequest extends ReadPacket = ReadPacket, TResponse extends WritePacket = WritePacket>
 implements TransportHandler<TRequest, TResponse> {
    private chain!: TransportHandler<TRequest, TResponse>;

    constructor(private backend: HttpBackend, private context: InvocationContext) { }

    handle(req: TRequest): Observable<TResponse> {
        if (!this.chain) {
            const interceptors = this.context.get(HTTP_INTERCEPTORS);
            this.chain = interceptors.reduceRight(
                (next, interceptor) => new InterceptorHandler(next, interceptor), this.backend as TransportHandler) as TransportHandler<TRequest, TResponse>;
        }
        return this.chain.handle(req);
    }
}



