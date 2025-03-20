import { Handler, HandlerFn, HandlerLike } from '@tsdi/ioc';
import { Observable } from 'rxjs';

/**
 * `ApplicationHandler` is the fundamental building block of handle.
 * 
 * 处理器基本构建块。
 */
export interface ApplicationHandler<TInput = any, TOutput = any, TContext = any> extends Handler<TInput, Observable<TOutput>, TContext> {

}

/**
 * Application handler fn.
 */
export type ApplicationHandlerFn<TInput = any, TOutput = any, TContext = any> = HandlerFn<TInput, Observable<TOutput>, TContext>;

/**
 * Application handler like.
 */
export type ApplicationHandlerLike<TInput = any, TOutput = any, TContext = any> = HandlerLike<TInput, Observable<TOutput>, TContext>;

/**
 * `Backend` is backend handler of services.
 * 
 * 后段处理器，是服务的最终处理器
 */
export interface Backend<TInput = any, TOutput = any, TContext = any> extends ApplicationHandler<TInput, TOutput, TContext> {
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
export type BackendFn<TInput = any, TOutput = any, TContext = any> = ApplicationHandlerFn<TInput, TOutput, TContext>;