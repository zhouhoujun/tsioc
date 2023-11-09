import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Backend, Handler, Interceptor, InterceptorHandler } from '@tsdi/core';
import { IReadableStream } from '@tsdi/common';
import { Observable } from 'rxjs';
import { TransportContext } from '../TransportContext';
import { IncomingContext } from './session';

export type OutgoingType = Buffer | IReadableStream | null;


@Abstract()
export abstract class OutgoingEncoder<T extends TransportContext = TransportContext, TOutput extends OutgoingType = OutgoingType> implements Handler<T, TOutput> {
    abstract handle(ctx: T): Observable<TOutput>;
}

@Abstract()
export abstract class OutgoingEncoderBackend<T extends TransportContext = TransportContext, TOutput extends OutgoingType = OutgoingType> implements Backend<T, TOutput> {
    abstract handle(ctx: T): Observable<TOutput>;
}


@Abstract()
export abstract class EmptyOutgoingEncoder<T extends TransportContext = TransportContext> implements OutgoingEncoder<T, null> {
    abstract handle(ctx: T): Observable<null>;
}

@Abstract()
export abstract class StreamOutgoingEncoder<T extends TransportContext = TransportContext> implements OutgoingEncoder<T, IReadableStream> {
    abstract handle(ctx: T): Observable<IReadableStream>;
}

@Abstract()
export abstract class BufferOutgoingEncoder<T extends TransportContext = TransportContext> implements OutgoingEncoder<T, Buffer> {
    abstract handle(ctx: T): Observable<Buffer>;
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
export class InterceptingOutgoingEncoder<T extends TransportContext = TransportContext, TOutput extends OutgoingType = OutgoingType> implements OutgoingEncoder<T, TOutput> {
    private chain?: OutgoingEncoder<T, TOutput>;

    constructor(private backend: OutgoingEncoderBackend<T, TOutput>, private injector: Injector) { }

    handle(ctx: T): Observable<TOutput> {
        if (!this.chain) {
            this.chain = this.injector.get(OUTGOING_ENCODER_INTERCEPTORS, [])
                .reduceRight((next, interceptor) => new InterceptorHandler(next, interceptor as OutgoingEncodeInterceptor<T, TOutput>), this.backend);
        }
        return this.chain.handle(ctx);
    }

}



@Abstract()
export abstract class IncomingDecoder<T extends IncomingContext = IncomingContext> implements Handler<T, TransportContext> {
    abstract handle(ctx: T): Observable<TransportContext>;
}

@Abstract()
export abstract class IncomingDecoderBackend<T extends IncomingContext = IncomingContext> implements Backend<T, TransportContext> {
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
    intercept(input: T, next: IncomingDecoder<T>): Observable<TransportContext>;
}

/**
 * Token of response decoder interceptors.
 */
export const INCOMING_DECODER_INTERCEPTORS = tokenId<IncomingDecodeInterceptor[]>('INCOMING_DECODER_INTERCEPTORS');

@Injectable()
export class InterceptingIncomingDecoder<T extends IncomingContext = IncomingContext> implements IncomingDecoder<T> {
    private chain!: IncomingDecoder<T>;

    constructor(private backend: IncomingDecoder, private injector: Injector) { }

    handle(ctx: T): Observable<TransportContext> {
        if (!this.chain) {
            this.chain = this.injector.get(INCOMING_DECODER_INTERCEPTORS, [])
                .reduceRight((next, interceptor) => new InterceptorHandler(next, interceptor), this.backend) as IncomingDecoder<T>;
        }
        return this.chain.handle(ctx)
    }

}
