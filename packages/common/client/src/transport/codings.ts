import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { RequestPacket, ResponsePacket, TransportEvent, TransportRequest } from '@tsdi/common';
import { Observable } from 'rxjs';
import { ClientTransportSession } from './session';


/**
 * Request context
 */
export interface RequestContext {
    session: ClientTransportSession;
    req: TransportRequest;
    request?: RequestPacket;
}

/**
 * Request encdoer.
 */
@Abstract()
export abstract class RequestEncoder<T extends RequestPacket = RequestPacket> implements Handler<RequestContext, T> {
    /**
     * tranport request encode handle.
     * @param ctx 
     */
    abstract handle(ctx: RequestContext): Observable<T>;
}

/**
 * Request encode backend.
 */
@Abstract()
export abstract class RequestBackend<T extends RequestPacket = RequestPacket> implements Backend<RequestContext, T> {
    abstract handle(ctx: RequestContext): Observable<T>;
}



/**
 * Request Encode interceptor is a chainable behavior modifier for `Encoders`.
 * 
 * 加密拦截器。
 */
export interface RequestEncodeInterceptor<T extends RequestPacket = RequestPacket> extends Interceptor<RequestContext, T> {
    /**
     * the method to implemet encode interceptor.
     * 
     * 加密拦截处理的方法
     * @param ctx  request context.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(ctx: RequestContext, next: RequestEncoder<T>): Observable<T>;
}

/**
 * Token of request encoder interceptors of client request.
 */
export const REQUEST_ENCODER_INTERCEPTORS = tokenId<RequestEncodeInterceptor[]>('REQUEST_ENCODER_INTERCEPTORS');

@Injectable()
export class InterceptingReuqestEncoder<T extends RequestPacket = RequestPacket> extends InterceptingHandler<RequestContext, T> implements RequestEncoder<T> {
    constructor(backend: RequestBackend<T>, injector: Injector) {
        super(backend, injector, REQUEST_ENCODER_INTERCEPTORS)
    }

}

/**
 * Request packet encode context.
 */
export interface RequestPacketContext<TMsg = any> extends RequestContext {
    request: RequestPacket;
    raw?: Buffer | null;
    msg?: TMsg;
    topic?: string;
}


/**
 * Request packet encoder.
 */
@Abstract()
export abstract class RequestPacketEncoder<TMsg = any> implements Handler<RequestPacketContext, TMsg> {
    /**
     * packet decode handle.
     * @param ctx 
     */
    abstract handle(ctx: RequestPacketContext<TMsg>): Observable<TMsg>;
}
/**
 * Request packet decode backend.
 */
@Abstract()
export abstract class RequestPacketEncodeBackend<TMsg = any> implements Backend<RequestPacketContext, TMsg> {
    abstract handle(ctx: RequestPacketContext<TMsg>): Observable<TMsg>;
}

/**
 * Request packet Decode interceptor is a chainable behavior modifier for `Decoders`.
 * 
 * 加密拦截器。
 */
export interface RequestPacketEncodeInterceptor<TMsg = any> extends Interceptor<RequestPacketContext, TMsg> {
    /**
     * the method to implemet response decode interceptor.
     * 
     * 加密拦截处理的方法
     * @param res  response input.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(res: RequestPacketContext<TMsg>, next: RequestPacketEncoder<TMsg>): Observable<TMsg>;
}

/**
 * Token of packet encoder interceptors for client request message.
 */
export const REQUEST_PACKET_ENCODER_INTERCEPTORS = tokenId<ResponsePacketDecodeInterceptor[]>('REQUEST_PACKET_ENCODER_INTERCEPTORS');

@Injectable()
export class InterceptingRequestPacketEncoder<TMsg = any> extends InterceptingHandler<RequestPacketContext, TMsg> implements RequestPacketEncoder<TMsg> {
    constructor(backend: RequestPacketEncodeBackend<TMsg>, injector: Injector) {
        super(backend, injector, REQUEST_PACKET_ENCODER_INTERCEPTORS)
    }
}



/**
 * Response packet decode context.
 */
export interface ResponsePacketContext<TMsg = any> {
    session: ClientTransportSession;
    req: TransportRequest;
    request: RequestPacket;
    response?: ResponsePacket;
    msg: TMsg;
    topic?: string;
    raw?: Buffer;
}

/**
 * Response packet decoder.
 */
@Abstract()
export abstract class ResponsePacketDecoder<TMsg = any> implements Handler<ResponsePacketContext, ResponsePacket> {
    /**
     * packet decode handle.
     * @param ctx 
     */
    abstract handle(ctx: ResponsePacketContext<TMsg>): Observable<ResponsePacket>;
}
/**
 * Response packet decode backend.
 */
@Abstract()
export abstract class ResponsePacketDecodeBackend<TMsg = any> implements Backend<ResponsePacketContext, ResponsePacket> {
    abstract handle(ctx: ResponsePacketContext<TMsg>): Observable<ResponsePacket>;
}
/**
 * Response packet Decode interceptor is a chainable behavior modifier for `Decoders`.
 * 
 * 解密拦截器。
 */
export interface ResponsePacketDecodeInterceptor<TMsg = any> extends Interceptor<ResponsePacketContext, ResponsePacket> {
    /**
     * the method to implemet response decode interceptor.
     * 
     * 解密拦截处理的方法
     * @param ctx  response context.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(ctx: ResponsePacketContext<TMsg>, next: ResponsePacketDecoder<TMsg>): Observable<ResponsePacket>;
}

/**
 * Token of packet decoder interceptors for client response message.
 */
export const RESPONSE_PACKET_DECODER_INTERCEPTORS = tokenId<ResponsePacketDecodeInterceptor[]>('RESPONSE_PACKET_DECODER_INTERCEPTORS');

@Injectable()
export class InterceptingResponsePacketDecoder<TMsg = any> extends InterceptingHandler<ResponsePacketContext<TMsg>, ResponsePacket> implements ResponsePacketDecoder<TMsg> {
    constructor(backend: ResponsePacketDecodeBackend<TMsg>, injector: Injector) {
        super(backend, injector, RESPONSE_PACKET_DECODER_INTERCEPTORS)
    }
}



/**
 * Response context.
 */
export interface ResponseContext<TMsg = any> extends ResponsePacketContext<TMsg> {
    response: ResponsePacket;
}

/**
 * Response decoder.
 */
@Abstract()
export abstract class ResponseDecoder<T extends TransportEvent = TransportEvent> implements Handler<ResponseContext, T> {
    /**
     * tranport response decode handle.
     * @param res 
     */
    abstract handle(res: ResponseContext): Observable<T>;
}
/**
 * Response decode backend.
 */
@Abstract()
export abstract class ResponseBackend<T extends TransportEvent = TransportEvent> implements Backend<ResponseContext, T> {
    abstract handle(ctx: ResponseContext): Observable<T>;
}


/**
 * Response Decode interceptor is a chainable behavior modifier for `Decoders`.
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
 * Token of response decoder interceptors of response.
 */
export const RESPONSE_DECODER_INTERCEPTORS = tokenId<ResponseDecodeInterceptor[]>('RESPONSE_DECODER_INTERCEPTORS');

@Injectable()
export class InterceptingResponseDecoder<T extends TransportEvent = TransportEvent> extends InterceptingHandler<ResponseContext, T> implements ResponseDecoder<T> {
    constructor(backend: ResponseBackend<T>, injector: Injector) {
        super(backend, injector, RESPONSE_DECODER_INTERCEPTORS)
    }
}
