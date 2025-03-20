import { Handler as IHandler, HandlerFn as IHandlerFn, HandlerLike as IHandlerLike } from '@tsdi/ioc';
import { Observable } from 'rxjs';

/**
 * `Handler` is the fundamental building block of handle.
 * 
 * 处理器基本构建块。
 */
export interface Handler<TInput = any, TOutput = any, TContext = any> extends IHandler<TInput, Observable<TOutput>, TContext> {

}

/**
 * handler fn.
 */
export type HandlerFn<TInput = any, TOutput = any, TContext = any> = IHandlerFn<TInput, Observable<TOutput>, TContext>;

/**
 * handler like.
 */
export type HandlerLike<TInput = any, TOutput = any, TContext = any> = IHandlerLike<TInput, Observable<TOutput>, TContext>;

/**
 * `Backend` is backend handler of services.
 * 
 * 后段处理器，是服务的最终处理器
 */
export interface Backend<TInput = any, TOutput = any, TContext = any> extends Handler<TInput, TOutput, TContext> {
    /**
     * backend handle.
     * @param input handle input.
     * @param context handle context
     */
    handle(input: TInput, context?: TContext): Observable<TOutput>;
}

/**
 * backend fn.
 */
export type BackendFn<TInput = any, TOutput = any, TContext = any> = HandlerFn<TInput, TOutput, TContext>;