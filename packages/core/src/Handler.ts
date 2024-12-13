import { Observable } from 'rxjs';

/**
 * `Handler` is the fundamental building block of handle.
 * 
 * 处理器基本构建块。
 */
export interface Handler<TInput = any, TOutput = any, TContext = any> {
    /**
     * handle.
     * 
     * 处理句柄
     * @param input handle input.
     * @param context handle with context.
     */
    handle(input: TInput, context?: TContext): Observable<TOutput>;

    /**
     * is this equals to target or not
     * 
     * 该实例等于目标与否？
     * @param target 
     */
    equals?(target: any): boolean;
}
/**
 * handler fn.
 */
export type HandlerFn<TInput = any, TOutput = any, TContext = any> = (input: TInput, context?: TContext) => Observable<TOutput>;


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
