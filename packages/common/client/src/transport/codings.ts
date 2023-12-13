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
 * request encdoer.
 */
@Abstract()
export abstract class RequestEncoder<T extends RequestContext = RequestContext, TOutput extends OutgoingType = OutgoingType> implements Handler<T, TOutput> {
    /**
     * tranport request encode handle.
     * @param ctx 
     */
    abstract handle(ctx: T): Observable<TOutput>;
}

/**
 * request encode backend.
 */
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
 * packet decode context.
 */
export interface ResponsePacketContext<TMsg = any> {
    session: ClientTransportSession;
    req: TransportRequest;
    packet?: ResponsePacket;
    msg: TMsg;
    topic?: string;
    raw?: Buffer;
}

/**
 * packet decoder.
 */
@Abstract()
export abstract class PacketDecoder<TMsg = any> implements Handler<ResponsePacketContext, ResponsePacket> {
    /**
     * packet decode handle.
     * @param ctx 
     */
    abstract handle(ctx: ResponsePacketContext<TMsg>): Observable<ResponsePacket>;
}
/**
 * packet decode backend.
 */
@Abstract()
export abstract class PacketDecodeBackend<TMsg = any> implements Backend<ResponsePacketContext, ResponsePacket> {
    abstract handle(ctx: ResponsePacketContext<TMsg>): Observable<ResponsePacket>;
}
/**
 * Decode interceptor is a chainable behavior modifier for `Decoders`.
 * 
 * 解密拦截器。
 */
export interface PacketDecodeInterceptor<TMsg = any> extends Interceptor<ResponsePacketContext, ResponsePacket> {
    /**
     * the method to implemet response decode interceptor.
     * 
     * 解密拦截处理的方法
     * @param res  response input.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(res: ResponsePacketContext<TMsg>, next: PacketDecoder<TMsg>): Observable<ResponsePacket>;
}

/**
 * Token of packet decoder interceptors.
 */
export const PACKET_DECODER_INTERCEPTORS = tokenId<PacketDecodeInterceptor[]>('PACKET_DECODER_INTERCEPTORS');

@Injectable()
export class InterceptingPacketDecoder<TMsg = any> extends InterceptingHandler<ResponsePacketContext, ResponsePacket> implements PacketDecoder<ResponsePacket> {
    constructor(backend: PacketDecodeBackend<TMsg>, injector: Injector) {
        super(backend, injector, PACKET_DECODER_INTERCEPTORS)
    }
}



/**
 * response context.
 */
export interface ResponseContext<TMsg = any> extends ResponsePacketContext<TMsg> {
    packet: ResponsePacket;
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
/**
 * response decode backend.
 */
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
