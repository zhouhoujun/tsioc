import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { OutgoingType } from '@tsdi/common';
import { Observable } from 'rxjs';
import { IncomingContext } from './session';
import { TransportContext } from '../TransportContext';




@Abstract()
export abstract class OutgoingEncoder<T extends TransportContext = TransportContext, TOutput extends OutgoingType = OutgoingType> implements Handler<T, TOutput> {
    abstract handle(ctx: T): Observable<TOutput>;
}

@Abstract()
export abstract class OutgoingBackend<T extends TransportContext = TransportContext, TOutput extends OutgoingType = OutgoingType> implements Backend<T, TOutput> {
    abstract handle(ctx: T): Observable<TOutput>;
}


/**
 * Encode interceptor is a chainable behavior modifier for `Encoders`.
 * 
 * 加密拦截器。
 */
export interface OutgoingEncodeInterceptor<T extends TransportContext = TransportContext, TOutput extends OutgoingType = OutgoingType> extends Interceptor<T, TOutput> {
    /**
     * the method to implemet encode interceptor.
     * 
     * 加密拦截处理的方法
     * @param ctx  transport context.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(ctx: T, next: OutgoingEncoder<T, TOutput>): Observable<TOutput>;
}

/**
 * Token of request encoder interceptors.
 */
export const OUTGOING_ENCODER_INTERCEPTORS = tokenId<OutgoingEncodeInterceptor[]>('OUTGOING_ENCODER_INTERCEPTORS');

@Injectable()
export class InterceptingOutgoingEncoder<T extends TransportContext = TransportContext, TOutput extends OutgoingType = OutgoingType> extends InterceptingHandler<T, TOutput> implements OutgoingEncoder<T, TOutput> {
    constructor(backend: OutgoingBackend<T, TOutput>, injector: Injector) {
        super(backend, injector, OUTGOING_ENCODER_INTERCEPTORS);
    }
}



@Abstract()
export abstract class IncomingDecoder<T extends IncomingContext = IncomingContext> implements Handler<T, TransportContext> {
    abstract handle(ctx: T): Observable<TransportContext>;
}

@Abstract()
export abstract class IncomingBackend<T extends IncomingContext = IncomingContext> implements Backend<T, TransportContext> {
    abstract handle(ctx: T): Observable<TransportContext>;
}


/**
 * Decode interceptor is a chainable behavior modifier for `Decoders`.
 * 
 * 解密拦截器。
 */
export interface IncomingDecodeInterceptor<T extends IncomingContext = IncomingContext> extends Interceptor<T, TransportContext> {
    /**
     * the method to implemet response decode interceptor.
     * 
     * 解密拦截处理的方法
     * @param input  request input.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(ctx: T, next: IncomingDecoder<T>): Observable<TransportContext>;
}

/**
 * Token of response decoder interceptors.
 */
export const INCOMING_DECODER_INTERCEPTORS = tokenId<IncomingDecodeInterceptor[]>('INCOMING_DECODER_INTERCEPTORS');

@Injectable()
export class InterceptingIncomingDecoder<T extends IncomingContext = IncomingContext> extends InterceptingHandler<T, TransportContext> implements IncomingDecoder<T> {
    constructor(backend: IncomingBackend<T>, injector: Injector) {
        super(backend, injector, INCOMING_DECODER_INTERCEPTORS)
    }
}
