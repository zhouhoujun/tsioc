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
    id?: string | number;
    msg?: TMsg;
}

/**
 * Request encdoer.
 */
@Abstract()
export abstract class RequestEncoder<TOutput = any, TInput = any> implements Handler<RequestContext<TInput>, TOutput> {
    /**
     * tranport request encode handle.
     * @param ctx 
     */
    abstract handle(ctx: RequestContext<TInput>): Observable<TOutput>;
}

/**
 * Request encode backend.
 */
export abstract class RequestEncodeBackend<TOutput = any, TInput = any> implements Backend<RequestContext<TInput>, TOutput> {
    abstract handle(ctx: RequestContext<TInput>): Observable<TOutput>;
}



/**
 * Request Encode interceptor is a chainable behavior modifier for `Encoders`.
 * 
 * 加密拦截器。
 */
export interface RequestEncodeInterceptor<TOutput = any, TInput = any> extends Interceptor<RequestContext<TInput>, TOutput> {
    /**
     * the method to implemet encode interceptor.
     * 
     * 加密拦截处理的方法
     * @param ctx  request context.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(ctx: RequestContext<TInput>, next: RequestEncoder<TOutput, TInput>): Observable<TOutput>;
}

@Abstract()
export abstract class RequestPacketEncodeBackend extends RequestEncodeBackend<TransportRequest, RequestPacket> { }

/**
 * Token of request encoder interceptors of client request.
 */
export const REQUEST_ENCODER_INTERCEPTORS = tokenId<RequestEncodeInterceptor<RequestPacket, TransportRequest>[]>('REQUEST_ENCODER_INTERCEPTORS');

@Injectable()
export class InterceptingReuqestEncoder extends InterceptingHandler<RequestContext<TransportRequest>, RequestPacket> implements RequestEncoder<RequestPacket, TransportRequest> {
    constructor(backend: RequestPacketEncodeBackend, injector: Injector) {
        super(backend, injector, REQUEST_ENCODER_INTERCEPTORS)
    }
}

@Abstract()
export abstract class RequestBufferEncodeBackend extends RequestEncodeBackend<Buffer, RequestPacket> { }

/**
 * Token of request encoder interceptors of client request.
 */
export const REQUEST_BUFFER_ENCODER_INTERCEPTORS = tokenId<RequestEncodeInterceptor[]>('REQUEST_BUFFER_ENCODER_INTERCEPTORS');

@Injectable()
export class ReuqestBufferEncoder extends InterceptingHandler<RequestContext<RequestPacket>, Buffer> implements RequestEncoder<Buffer, RequestPacket> {
    constructor(backend: RequestBufferEncodeBackend, injector: Injector) {
        super(backend, injector, REQUEST_BUFFER_ENCODER_INTERCEPTORS)
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
export abstract class ResponseDecodeBackend<TOutput = any, TInput = any> implements Backend<ResponseContext<TInput>, TOutput> {
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

@Abstract()
export abstract class ResponsePacketDecodeBackend extends ResponseDecodeBackend<TransportEvent, ResponsePacket> {}

/**
 * Token for response decoder interceptors of response.
 */
export const RESPONSE_DECODER_INTERCEPTORS = tokenId<ResponseDecodeInterceptor<TransportEvent, ResponsePacket>[]>('RESPONSE_DECODER_INTERCEPTORS');

@Injectable()
export class ResponsePacketDecoder extends InterceptingHandler<ResponseContext<ResponsePacket>, TransportEvent> implements ResponseDecoder<TransportEvent, ResponsePacket> {
    constructor(backend: ResponsePacketDecodeBackend, injector: Injector) {
        super(backend, injector, RESPONSE_DECODER_INTERCEPTORS)
    }
}


/**
 * Token for buffer response decoder interceptors of response.
 */
export const RESPONSE_BUFFER_DECODER_INTERCEPTORS = tokenId<ResponseDecodeInterceptor<ResponsePacket, Buffer>[]>('RESPONSE_BUFFER_DECODER_INTERCEPTORS');

@Abstract()
export abstract class ResponseBufferDecodeBackend extends ResponseDecodeBackend<ResponsePacket, Buffer> { }

@Injectable()
export class ResponseBufferDecoder extends InterceptingHandler<ResponseContext<Buffer>, ResponsePacket> implements ResponseDecoder<ResponsePacket, Buffer> {
    constructor(backend: ResponseBufferDecodeBackend, injector: Injector) {
        super(backend, injector, RESPONSE_BUFFER_DECODER_INTERCEPTORS)
    }
}


