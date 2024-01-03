import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { ResponsePacket, TransportEvent, TransportRequest } from '@tsdi/common';
import { Observable } from 'rxjs';
import { ClientTransportSession } from './session';


/**
 * Request context
 */
export interface RequestContext<TMsg = any> {
    session: ClientTransportSession;
    req: TransportRequest;
    id?: string | number;
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
export interface ResponseContext<TMsg = any> {
    session: ClientTransportSession;
    req: TransportRequest;
    reqCtx: RequestContext;
    msg: TMsg;
    topic?: string;
    id?: string | number;
    // response?: ResponsePacket;
    // raw?: Buffer;
}

/**
 * Response decoder.
 */
@Abstract()
export abstract class ResponseDecoder<TOutput = any, TInput = any> implements Handler<ResponseContext<TInput>, TOutput> {
    /**
     * tranport response decode handle.
     * @param res 
     */
    abstract handle(res: ResponseContext<TInput>): Observable<TOutput>;
}
/**
 * Response decode backend.
 */
@Abstract()
export abstract class ResponseBackend<TOutput = any, TInput = any> implements Backend<ResponseContext<TInput>, TOutput> {
    abstract handle(ctx: ResponseContext<TInput>): Observable<TOutput>;
}


/**
 * Response Decode interceptor is a chainable behavior modifier for `Decoders`.
 * 
 * 解密拦截器。
 */
export interface ResponseDecodeInterceptor<TOutput = any, TInput = any> extends Interceptor<ResponseContext<TInput>, TOutput> {
    /**
     * the method to implemet response decode interceptor.
     * 
     * 解密拦截处理的方法
     * @param res  response input.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(res: ResponseContext<TInput>, next: ResponseDecoder<TOutput, TInput>): Observable<TOutput>;
}

/**
 * Token of response decoder interceptors of response.
 */
export const RESPONSE_DECODER_INTERCEPTORS = tokenId<ResponseDecodeInterceptor[]>('RESPONSE_DECODER_INTERCEPTORS');

@Injectable()
export class InterceptingResponseDecoder<TOutput = any, TInput = any> extends InterceptingHandler<ResponseContext<TInput>, TOutput> implements ResponseDecoder<TOutput, TInput> {
    constructor(backend: ResponseBackend<TOutput, TInput>, injector: Injector) {
        super(backend, injector, RESPONSE_DECODER_INTERCEPTORS)
    }
}
