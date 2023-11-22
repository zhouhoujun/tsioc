import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { OutgoingType, ResponsePacket, TransportEvent, TransportRequest } from '@tsdi/common';
import { Observable } from 'rxjs';
import { ClientTransportSession } from './session';


/**
 * request context
 */
export interface RequestContext {
    session: ClientTransportSession;
    req: TransportRequest;
    raw?: Buffer | null;
}

/**
 * response context.
 */
export interface ResponseContext {
    /**
     * packet ready or not.
     */
    ready?: boolean;
    packet: ResponsePacket;
    session: ClientTransportSession;
    req: TransportRequest;
    raw?: Buffer;
}

/**
 * Request encdoer.
 */
@Abstract()
export abstract class RequestEncoder<T extends RequestContext = RequestContext, TOutput extends OutgoingType = OutgoingType> implements Handler<T, TOutput> {
    /**
     * tranport request encode handle.
     * @param ctx 
     */
    abstract handle(ctx: T): Observable<TOutput>;
}

@Abstract()
export abstract class RequestBackend<T extends RequestContext = RequestContext, TOutput extends OutgoingType = OutgoingType> implements Backend<T, TOutput> {
    abstract handle(ctx: T): Observable<TOutput>;
}



/**
 * Encode interceptor is a chainable behavior modifier for `Encoders`.
 * 
 * 加密拦截器。
 */
export interface RequestEncodeInterceptor<T extends RequestContext = RequestContext, TOutput extends OutgoingType = OutgoingType> extends Interceptor<T, TOutput> {
    /**
     * the method to implemet encode interceptor.
     * 
     * 加密拦截处理的方法
     * @param ctx  request context.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(ctx: T, next: RequestEncoder<T>): Observable<TOutput>;
}

/**
 * Token of request encoder interceptors.
 */
export const REQUEST_ENCODER_INTERCEPTORS = tokenId<RequestEncodeInterceptor[]>('REQUEST_ENCODER_INTERCEPTORS');

@Injectable()
export class InterceptingReuqestEncoder<T extends RequestContext = RequestContext> extends InterceptingHandler<T> implements RequestEncoder<T> {
    constructor(backend: RequestBackend<T>, injector: Injector) {
        super(backend, injector, REQUEST_ENCODER_INTERCEPTORS)
    }

}


/**
 * response decoder.
 */
@Abstract()
export abstract class ResponseDecoder<T extends TransportEvent = TransportEvent> implements Handler<ResponseContext, T> {
    /**
     * tranport response decode handle.
     * @param res 
     */
    abstract handle(res: ResponseContext): Observable<T>;
}

@Abstract()
export abstract class ResponseBackend<T extends TransportEvent = TransportEvent> implements Backend<ResponseContext, T> {
    abstract handle(ctx: ResponseContext): Observable<T>;
}


/**
 * Decode interceptor is a chainable behavior modifier for `Decoders`.
 * 
 * 解密拦截器。
 */
export interface ResponseDecodeInterceptor<T extends TransportEvent = TransportEvent> extends Interceptor<ResponseContext, T> {
    /**
     * the method to implemet response decode interceptor.
     * 
     * 解密拦截处理的方法
     * @param res  response input.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(res: ResponseContext, next: ResponseDecoder<T>): Observable<T>;
}

/**
 * Token of response decoder interceptors.
 */
export const RESPONSE_DECODER_INTERCEPTORS = tokenId<ResponseDecodeInterceptor[]>('RESPONSE_DECODER_INTERCEPTORS');

@Injectable()
export class InterceptingResponseDecoder<T extends TransportEvent = TransportEvent> extends InterceptingHandler<ResponseContext, T> implements ResponseDecoder<T> {
    constructor(backend: ResponseBackend<T>, injector: Injector) {
        super(backend, injector, RESPONSE_DECODER_INTERCEPTORS)
    }
}
