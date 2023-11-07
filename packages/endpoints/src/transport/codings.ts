import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Interceptor, InterceptorHandler } from '@tsdi/core';
import { Context, Encoder, Decoder, IncomingPacket, ResponsePacket } from '@tsdi/common';
import { Observable } from 'rxjs';


@Abstract()
export abstract class OutgoingEncoder<T extends ResponsePacket = ResponsePacket> implements Encoder<T> {
    abstract handle(ctx: Context<T>): Observable<Buffer>;
}


/**
 * Encode interceptor is a chainable behavior modifier for `Encoders`.
 * 
 * 加密拦截器。
 */
export interface OutgoingEncodeInterceptor<T extends ResponsePacket = ResponsePacket> extends Interceptor<Context<T>, Buffer> {
    /**
     * the method to implemet encode interceptor.
     * 
     * 加密拦截处理的方法
     * @param input  request input.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(input: Context<T>, next: OutgoingEncoder<T>): Observable<Buffer>;
}

/**
 * Token of request encoder interceptors.
 */
export const OUTGOING_ENCODER_INTERCEPTORS = tokenId<OutgoingEncodeInterceptor[]>('OUTGOING_ENCODER_INTERCEPTORS');

@Injectable()
export class InterceptingOutgoingEncoder<T extends ResponsePacket = ResponsePacket> implements OutgoingEncoder<T> {
    private chain?: OutgoingEncoder<T>;

    constructor(private backend: OutgoingEncoder, private injector: Injector) { }

    handle(ctx: Context): Observable<Buffer> {
        if (!this.chain) {
            this.chain = this.injector.get(OUTGOING_ENCODER_INTERCEPTORS, [])
                .reduceRight((next, interceptor) => new InterceptorHandler(next, interceptor), this.backend);
        }
        return this.chain.handle(ctx);
    }

}



@Abstract()
export abstract class IncomingDecoder<T extends IncomingPacket = IncomingPacket> implements Decoder<T> {
    abstract handle(ctx: Context<T>): Observable<T>;
}



/**
 * Decode interceptor is a chainable behavior modifier for `Decoders`.
 * 
 * 解密拦截器。
 */
export interface IncomingDecodeInterceptor<T extends IncomingPacket = IncomingPacket> extends Interceptor<Context<T>, T> {
    /**
     * the method to implemet response decode interceptor.
     * 
     * 解密拦截处理的方法
     * @param input  request input.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(input: Context<T>, next: IncomingDecoder<T>): Observable<T>;
}

/**
 * Token of response decoder interceptors.
 */
export const INCOMING_DECODER_INTERCEPTORS = tokenId<IncomingDecodeInterceptor[]>('INCOMING_DECODER_INTERCEPTORS');

@Injectable()
export class InterceptingIncomingDecoder<T extends IncomingPacket = IncomingPacket> implements IncomingDecoder<T> {
    private chain!: IncomingDecoder<T>;

    constructor(private backend: IncomingDecoder, private injector: Injector) { }

    handle(ctx: Context): Observable<T> {
        if (!this.chain) {
            this.chain = this.injector.get(INCOMING_DECODER_INTERCEPTORS, [])
                .reduceRight((next, interceptor) => new InterceptorHandler(next, interceptor), this.backend) as IncomingDecoder<T>;
        }
        return this.chain.handle(ctx)
    }

}
