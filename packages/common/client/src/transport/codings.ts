import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { RequestPacket, ResponsePacket, TransportEvent, TransportRequest } from '@tsdi/common';
import { Observable } from 'rxjs';
import { ClientTransportSession } from './session';


/**
 * Request context
 */
export interface RequestContext<TMsg = any> {
    session: ClientTransportSession;
    req: TransportRequest;
    id?: any;
    msg?: TMsg;
}

/**
 * Request encdoer.
 */
@Abstract()
export abstract class RequestEncoder<TMsg = any> implements Handler<RequestContext, TMsg> {
    /**
     * tranport request encode handle.
     * @param ctx 
     */
    abstract handle(ctx: RequestContext<TMsg>): Observable<TMsg>;
}

/**
 * Request encode backend.
 */
@Abstract()
export abstract class RequestBackend<TMsg = any> implements Backend<RequestContext, TMsg> {
    abstract handle(ctx: RequestContext<TMsg>): Observable<TMsg>;
}



/**
 * Request Encode interceptor is a chainable behavior modifier for `Encoders`.
 * 
 * 加密拦截器。
 */
export interface RequestEncodeInterceptor<TMsg = any> extends Interceptor<RequestContext, TMsg> {
    /**
     * the method to implemet encode interceptor.
     * 
     * 加密拦截处理的方法
     * @param ctx  request context.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(ctx: RequestContext<TMsg>, next: RequestEncoder<TMsg>): Observable<TMsg>;
}

/**
 * Token of request encoder interceptors of client request.
 */
export const REQUEST_ENCODER_INTERCEPTORS = tokenId<RequestEncodeInterceptor[]>('REQUEST_ENCODER_INTERCEPTORS');

@Injectable()
export class InterceptingReuqestEncoder<TMsg = any> extends InterceptingHandler<RequestContext, TMsg> implements RequestEncoder<TMsg> {
    constructor(backend: RequestBackend<TMsg>, injector: Injector) {
        super(backend, injector, REQUEST_ENCODER_INTERCEPTORS)
    }
}






/**
 * Response context.
 */
export interface ResponseContext<TMsg = any> extends ResponsePacket {
    session: ClientTransportSession;
    req: TransportRequest;
    reqCtx: RequestContext;
    msg: TMsg;
    // response?: ResponsePacket;
    // raw?: Buffer;
}

/**
 * Response decoder.
 */
@Abstract()
export abstract class ResponseDecoder<TMsg = any> implements Handler<ResponseContext<TMsg>, TransportEvent> {
    /**
     * tranport response decode handle.
     * @param res 
     */
    abstract handle(res: ResponseContext<TMsg>): Observable<TransportEvent>;
}
/**
 * Response decode backend.
 */
@Abstract()
export abstract class ResponseBackend<TMsg = any> implements Backend<ResponseContext<TMsg>, TransportEvent> {
    abstract handle(ctx: ResponseContext<TMsg>): Observable<TransportEvent>;
}


/**
 * Response Decode interceptor is a chainable behavior modifier for `Decoders`.
 * 
 * 解密拦截器。
 */
export interface ResponseDecodeInterceptor<TMsg = any> extends Interceptor<ResponseContext<TMsg>, TransportEvent> {
    /**
     * the method to implemet response decode interceptor.
     * 
     * 解密拦截处理的方法
     * @param res  response input.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(res: ResponseContext<TMsg>, next: ResponseDecoder<TMsg>): Observable<TransportEvent>;
}

/**
 * Token of response decoder interceptors of response.
 */
export const RESPONSE_DECODER_INTERCEPTORS = tokenId<ResponseDecodeInterceptor[]>('RESPONSE_DECODER_INTERCEPTORS');

@Injectable()
export class InterceptingResponseDecoder<TMsg = any> extends InterceptingHandler<ResponseContext<TMsg>, TransportEvent> implements ResponseDecoder<TMsg> {
    constructor(backend: ResponseBackend<TMsg>, injector: Injector) {
        super(backend, injector, RESPONSE_DECODER_INTERCEPTORS)
    }
}
