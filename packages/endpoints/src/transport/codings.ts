import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { IReadableStream, IncomingPacket, ResponsePacket } from '@tsdi/common';
import { Observable } from 'rxjs';
import { ServerTransportSession } from './session';
import { TransportContext } from '../TransportContext';
import { ServerOpts } from '../Server';



/**
 * Outgoing encoder.
 */
@Abstract()
export abstract class OutgoingEncoder<T extends ResponsePacket = ResponsePacket> implements Handler<TransportContext, T> {
    abstract handle(ctx: TransportContext): Observable<T>;
}

/**
 * Outgoing encode backend.
 */
@Abstract()
export abstract class OutgoingBackend<T extends ResponsePacket = ResponsePacket> implements Backend<TransportContext, T> {
    abstract handle(ctx: TransportContext): Observable<T>;
}


/**
 * Encode interceptor is a chainable behavior modifier for `Encoders`.
 * 
 * 加密拦截器。
 */
export interface OutgoingEncodeInterceptor<T extends ResponsePacket = ResponsePacket> extends Interceptor<TransportContext, T> {
    /**
     * the method to implemet encode interceptor.
     * 
     * 加密拦截处理的方法
     * @param ctx  transport context.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(ctx: TransportContext, next: OutgoingEncoder<T>): Observable<T>;
}

/**
 * Token of request encoder interceptors.
 */
export const OUTGOING_ENCODER_INTERCEPTORS = tokenId<OutgoingEncodeInterceptor[]>('OUTGOING_ENCODER_INTERCEPTORS');

@Injectable()
export class InterceptingOutgoingEncoder<T extends ResponsePacket = ResponsePacket> extends InterceptingHandler<TransportContext, T> implements OutgoingEncoder<T> {
    constructor(backend: OutgoingBackend<T>, injector: Injector) {
        super(backend, injector, OUTGOING_ENCODER_INTERCEPTORS);
    }
}



/**
 * Outgoing packet encode context.
 */
export interface OutgoingPacketContext<TMsg = any> {
    session: ServerTransportSession;
    options: ServerOpts;
    context: TransportContext;
    outgoing: ResponsePacket;
    raw?: Buffer | null;
    msg?: TMsg;
    topic?: string;
}

/**
 * Outgoing packet encoder.
 */
@Abstract()
export abstract class OutgoingPacketEncoder<TMsg = any> implements Handler<OutgoingPacketContext, TMsg> {
    /**
     * packet decode handle.
     * @param ctx 
     */
    abstract handle(ctx: OutgoingPacketContext<TMsg>): Observable<TMsg>;
}
/**
 * Outgoing packet decode backend.
 */
@Abstract()
export abstract class OutgoingPacketEncodeBackend<TMsg = any> implements Backend<OutgoingPacketContext, TMsg> {
    abstract handle(ctx: OutgoingPacketContext<TMsg>): Observable<TMsg>;
}

/**
 * Outgoing Encoder interceptor is a chainable behavior modifier for `Encoders`.
 * 
 * 加密拦截器。
 */
export interface OutgoingPacketEncodeInterceptor<TMsg = any> extends Interceptor<OutgoingPacketContext, TMsg> {
    /**
     * the method to implemet response decode interceptor.
     * 
     * 加密拦截处理的方法
     * @param res  response input.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(res: OutgoingPacketContext<TMsg>, next: OutgoingPacketEncoder<TMsg>): Observable<TMsg>;
}

/**
 * Token of packet encoder interceptors for server outgoing.
 */
export const OUTGOING_PACKET_ENCODER_INTERCEPTORS = tokenId<OutgoingPacketEncodeInterceptor[]>('OUTGOING_PACKET_ENCODER_INTERCEPTORS');

@Injectable()
export class InterceptingOutgoingPacketEncoder<TMsg = any> extends InterceptingHandler<OutgoingPacketContext, TMsg> implements OutgoingPacketEncoder<TMsg> {
    constructor(backend: OutgoingPacketEncodeBackend<TMsg>, injector: Injector) {
        super(backend, injector, OUTGOING_PACKET_ENCODER_INTERCEPTORS)
    }
}



export interface IncomingPacketContext<TMsg = any> {
    session: ServerTransportSession;
    options: ServerOpts;
    msg: TMsg;
    incoming?: IncomingPacket;
    raw?: Buffer | IReadableStream;
}


/**
 * Incoming packet decoder.
 */
@Abstract()
export abstract class IncomingPacketDecoder<TMsg = any> implements Handler<IncomingPacketContext, IncomingPacket> {
    /**
     * packet decode handle.
     * @param ctx 
     */
    abstract handle(ctx: IncomingPacketContext<TMsg>): Observable<IncomingPacket>;
}

/**
 * Incoming packet decode backend.
 */
@Abstract()
export abstract class IncomingPacketDecodeBackend<TMsg = any> implements Backend<IncomingPacketContext, IncomingPacket> {
    abstract handle(ctx: IncomingPacketContext<TMsg>): Observable<IncomingPacket>;
}
/**
 * Incoming packet Decode interceptor is a chainable behavior modifier for `Decoders`.
 * 
 * 解密拦截器。
 */
export interface IncomingPacketDecodeInterceptor<TMsg = any> extends Interceptor<IncomingPacketContext, IncomingPacket> {
    /**
     * the method to implemet response decode interceptor.
     * 
     * 解密拦截处理的方法
     * @param ctx  response context.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(ctx: IncomingPacketContext<TMsg>, next: IncomingPacketDecoder<TMsg>): Observable<IncomingPacket>;
}

/**
 * Token of packet decoder interceptors for server incoming message.
 */
export const INCOMING_PACKET_DECODER_INTERCEPTORS = tokenId<IncomingPacketDecodeInterceptor[]>('INCOMING_PACKET_DECODER_INTERCEPTORS');

@Injectable()
export class InterceptingIncomingPacketDecoder<TMsg = any> extends InterceptingHandler<IncomingPacketContext<TMsg>, IncomingPacket> implements IncomingPacketDecoder<TMsg> {
    constructor(backend: IncomingPacketDecodeBackend<TMsg>, injector: Injector) {
        super(backend, injector, INCOMING_PACKET_DECODER_INTERCEPTORS)
    }
}



/**
 * Incoming context.
 */
export interface IncomingContext extends IncomingPacketContext {
    incoming: IncomingPacket;
}



/**
 * Incoming decoder.
 */
@Abstract()
export abstract class IncomingDecoder<T extends IncomingContext = IncomingContext> implements Handler<T, TransportContext> {
    abstract handle(ctx: T): Observable<TransportContext>;
}

/**
 * Incoming decode backend.
 */
@Abstract()
export abstract class IncomingBackend<T extends IncomingContext = IncomingContext> implements Backend<T, TransportContext> {
    abstract handle(ctx: T): Observable<TransportContext>;
}


/**
 * Incoming Decode interceptor is a chainable behavior modifier for `Decoders`.
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
 * Token of incoming decoder interceptors.
 */
export const INCOMING_DECODER_INTERCEPTORS = tokenId<IncomingDecodeInterceptor[]>('INCOMING_DECODER_INTERCEPTORS');

@Injectable()
export class InterceptingIncomingDecoder<T extends IncomingContext = IncomingContext> extends InterceptingHandler<T, TransportContext> implements IncomingDecoder<T> {
    constructor(backend: IncomingBackend<T>, injector: Injector) {
        super(backend, injector, INCOMING_DECODER_INTERCEPTORS)
    }
}
