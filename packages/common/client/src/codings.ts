// import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
// import { InterceptingHandler, Interceptor, InterceptorHandler } from '@tsdi/core';
// import { Context, Decoder, Encoder, TransportEvent, TransportRequest } from '@tsdi/common';
// import { Observable } from 'rxjs';

// /**
//  * Request encdoer.
//  */
// @Abstract()
// export abstract class RequestEncoder<TReq extends TransportRequest = TransportRequest, TRes extends TransportEvent = TransportEvent> implements Encoder<TReq, TRes> {
//     /**
//      * tranport request encode handle.
//      * @param ctx 
//      */
//     abstract handle(ctx: Context<TReq>): Observable<TRes>;
// }

// /**
//  * Encode interceptor is a chainable behavior modifier for `Encoders`.
//  * 
//  * 加密拦截器。
//  */
// export interface RequestEncodeInterceptor<T extends TransportRequest = TransportRequest> extends Interceptor<Context<T>, Buffer> {
//     /**
//      * the method to implemet encode interceptor.
//      * 
//      * 加密拦截处理的方法
//      * @param input  request input.
//      * @param next The next handler in the chain, or the backend
//      * if no interceptors remain in the chain.
//      * @returns An observable of the event stream.
//      */
//     intercept(input: Context<T>, next: RequestEncoder<T>): Observable<Buffer>;
// }

// /**
//  * Token of request encoder interceptors.
//  */
// export const REQUEST_ENCODER_INTERCEPTORS = tokenId<RequestEncodeInterceptor[]>('REQUEST_ENCODER_INTERCEPTORS');

// @Injectable()
// export class InterceptingReuqestEncoder<T extends TransportRequest = TransportRequest> implements RequestEncoder<T> {
//     private chain?: RequestEncoder<T>;

//     constructor(private backend: RequestEncoder, private injector: Injector) { }

//     handle(ctx: Context): Observable<Buffer> {
//         if (!this.chain) {
//             this.chain = this.injector.get(REQUEST_ENCODER_INTERCEPTORS, [])
//                 .reduceRight((next, interceptor) => new InterceptorHandler(next, interceptor), this.backend);
//         }
//         return this.chain.handle(ctx);
//     }

// }



// /**
//  * response decoder.
//  */
// @Abstract()
// export abstract class ResponseDecoder<T extends TransportEvent = TransportEvent> implements Decoder<T> {
//     /**
//      * tranport response decode handle.
//      * @param ctx 
//      */
//     abstract handle(ctx: Context<T>): Observable<T>;
// }

// /**
//  * Decode interceptor is a chainable behavior modifier for `Decoders`.
//  * 
//  * 解密拦截器。
//  */
// export interface ResponseDecodeInterceptor<T extends TransportEvent = TransportEvent> extends Interceptor<Context<T>, T> {
//     /**
//      * the method to implemet response decode interceptor.
//      * 
//      * 解密拦截处理的方法
//      * @param input  request input.
//      * @param next The next handler in the chain, or the backend
//      * if no interceptors remain in the chain.
//      * @returns An observable of the event stream.
//      */
//     intercept(input: Context<T>, next: ResponseDecoder<T>): Observable<T>;
// }

// /**
//  * Token of response decoder interceptors.
//  */
// export const RESPONSE_DECODER_INTERCEPTORS = tokenId<ResponseDecodeInterceptor[]>('RESPONSE_DECODER_INTERCEPTORS');

// @Injectable()
// export class InterceptingResponseDecoder<T extends TransportEvent = TransportEvent> extends InterceptingHandler<Context<T>, T> implements ResponseDecoder<T> {

//     constructor(backend: ResponseDecoder<T>, injector: Injector) {
//         super(backend, injector, RESPONSE_DECODER_INTERCEPTORS)
//      }

// }
