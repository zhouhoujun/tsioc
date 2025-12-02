import { Injectable, token, Inject } from '@tsdi/ioc';
import { RequestInterceptingHandler, RequestInterceptor } from '@tsdi/common';
import { TransportBackend, TransportHandler } from './handler';



/**
 * common transport interceptors for server side.
 */
export const TRANSPORT_INTERCEPTORS = token<RequestInterceptor[]>('TRANSPORT_INTERCEPTORS');


/**
 * An injectable {@link TransportHandler} that applies multiple interceptors
 * to a request before passing it to the given {@link TransportBackend}.
 *
 * The interceptors are loaded lazily from the injector, to allow
 * interceptors to themselves inject classes depending indirectly
 * on `InterceptingHandler` itself.
 * @see `TransportInterceptor`
 */
@Injectable()
export class TransportInterceptingHandler<TInput = any, TOutput = any> extends RequestInterceptingHandler<TInput, TOutput> implements TransportHandler {
    constructor(backend: TransportBackend, @Inject(TRANSPORT_INTERCEPTORS) interceptors: RequestInterceptor[]) {
        super(backend, interceptors)
    }
}



/**
 * common transport interceptors for client side.
 */
export const CLIENT_TRANSPORT_INTERCEPTORS = token<RequestInterceptor[]>('CLIENT_TRANSPORT_INTERCEPTORS');


/**
 * An injectable {@link TransportHandler} that applies multiple interceptors
 * to a request before passing it to the given {@link TransportBackend}.
 *
 * The interceptors are loaded lazily from the injector, to allow
 * interceptors to themselves inject classes depending indirectly
 * on `InterceptingHandler` itself.
 * @see `TransportInterceptor`
 */
@Injectable()
export class ClientTransportInterceptingHandler<TInput = any, TOutput = any> extends RequestInterceptingHandler<TInput, TOutput> implements TransportHandler {
    constructor(backend: TransportBackend, @Inject(CLIENT_TRANSPORT_INTERCEPTORS) interceptors: RequestInterceptor[]) {
        super(backend, interceptors)
    }
}


