import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Observable } from 'rxjs';
import { ServerTransportSession } from './session';
import { TransportContext } from '../TransportContext';
import { ServerOpts } from '../Server';




/**
 * Outgoing encode context.
 */
export interface OutgoingContext<TMsg = any> {
    session: ServerTransportSession;
    options: ServerOpts;
    context: TransportContext;
    msg?: TMsg;
}

/**
 * Outgoing packet encoder.
 */
@Abstract()
export abstract class OutgoingEncoder<TMsg = any> implements Handler<TransportContext, TMsg> {
    /**
     * packet decode handle.
     * @param ctx 
     */
    abstract handle(ctx: TransportContext): Observable<TMsg>;
}
/**
 * Outgoing decode backend.
 */
@Abstract()
export abstract class OutgoingBackend<TMsg = any> implements Backend<TransportContext, TMsg> {
    abstract handle(ctx: TransportContext): Observable<TMsg>;
}

/**
 * Outgoing Encoder interceptor is a chainable behavior modifier for `Encoders`.
 * 
 * 加密拦截器。
 */
export interface OutgoingEncodeInterceptor<TMsg = any> extends Interceptor<TransportContext, TMsg> {
    /**
     * the method to implemet response decode interceptor.
     * 
     * 加密拦截处理的方法
     * @param res  response input.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(res: TransportContext, next: OutgoingEncoder<TMsg>): Observable<TMsg>;
}

/**
 * Token of encoder interceptors for server outgoing.
 */
export const OUTGOING_ENCODER_INTERCEPTORS = tokenId<OutgoingEncodeInterceptor[]>('OUTGOING_ENCODER_INTERCEPTORS');

@Injectable()
export class InterceptingOutgoingEncoder<TMsg = any> extends InterceptingHandler<TransportContext, TMsg> implements OutgoingEncoder<TMsg> {
    constructor(backend: OutgoingBackend<TMsg>, injector: Injector) {
        super(backend, injector, OUTGOING_ENCODER_INTERCEPTORS)
    }
}




/**
 * Incoming context.
 */
export interface IncomingContext<TMsg = any> {
    session: ServerTransportSession;
    options: ServerOpts;
    msg: TMsg;
}



/**
 * Incoming decoder.
 */
@Abstract()
export abstract class IncomingDecoder<TMsg = any> implements Handler<IncomingContext, TransportContext> {
    abstract handle(ctx: IncomingContext<TMsg>): Observable<TransportContext>;
}

/**
 * Incoming decode backend.
 */
@Abstract()
export abstract class IncomingBackend<TMsg = any> implements Backend<IncomingContext, TransportContext> {
    abstract handle(ctx: IncomingContext<TMsg>): Observable<TransportContext>;
}


/**
 * Incoming Decode interceptor is a chainable behavior modifier for `Decoders`.
 * 
 * 解密拦截器。
 */
export interface IncomingDecodeInterceptor<TMsg = any> extends Interceptor<IncomingContext, TransportContext> {
    /**
     * the method to implemet response decode interceptor.
     * 
     * 解密拦截处理的方法
     * @param input  request input.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(ctx: IncomingContext<TMsg>, next: IncomingDecoder<TMsg>): Observable<TransportContext>;
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
