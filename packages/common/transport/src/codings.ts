import { Backend, Handler, Interceptor } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';


/**
 * coding context.
 */
export abstract class Context<T> {
    /**
     * message
     */
    abstract get message(): T;

    abstract getRawbody(): any;
}

/**
 * Encode interceptor is a chainable behavior modifier for `Encoders`.
 * 
 * 加密拦截器。
 */
export interface EncodeInterceptor<TInput = any, TOutput = any> extends Interceptor<Context<TInput>, TOutput> {
    /**
     * the method to implemet encode interceptor.
     * 
     * 加密拦截处理的方法
     * @param input  request input.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(input: Context<TInput>, next: Handler<Context<TInput>, TOutput>): Observable<TOutput>;
}


@Abstract()
export abstract class Encoder<TInput = any, TOutput = any> implements Handler<Context<TInput>, TOutput> {
    abstract handle(ctx: Context<TInput>): Observable<TOutput>;
}

@Abstract()
export abstract class EncoderBackend<TInput = any, TOutput = any> implements Backend<Context<TInput>, TOutput> {
    abstract handle(ctx: Context<TInput>): Observable<TOutput>;
}


/**
 * Decode interceptor is a chainable behavior modifier for `Decoders`.
 * 
 * 解密拦截器。
 */
export interface DecodeInterceptor<TInput = any, TOutput = any> extends Interceptor<Context<TInput>, TOutput> {
    /**
     * the method to implemet decode interceptor.
     * 
     * 解密拦截处理的方法
     * @param input  request input.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(input: Context<TInput>, next: Handler<Context<TInput>, TOutput>): Observable<TOutput>;
}

@Abstract()
export abstract class Decoder<TInput = any, TOutput = any> implements Handler<Context<TInput>, TOutput> {
    abstract handle(ctx: Context<TInput>): Observable<TOutput>;
}

@Abstract()
export abstract class DecoderBackend<TInput = any, TOutput = any> implements Backend<Context<TInput>, TOutput> {
    abstract handle(ctx: Context<TInput>): Observable<TOutput>;
}

