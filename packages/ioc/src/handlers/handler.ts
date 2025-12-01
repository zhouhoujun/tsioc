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
     * @param tail next tail.
     */
    handle(input: TInput, context: TContext, tail?: TailNext<TOutput, TContext>): HandleResult<TOutput>;

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
 * 处理器基本构建块。
 */
export type HandlerFn<TInput = any, TOutput = any, TContext = any> = (input: TInput, context: TContext, tail?: TailNext<TOutput, TContext>) => HandleResult<TOutput>;


/**
 * handler like
 */
export type HandlerLike<TInput = any, TOutput = any, TContext = any> = HandlerFn<TInput, TOutput, TContext> | Handler<TInput, TOutput, TContext>;

export interface NextOpter<TOutput, TContext = any> {
    next?: (res: TOutput, context?: TContext) => any;
    error?: (error: any) => any;
    finally?: () => any;
}

export type HandleResult<TOutput> = TOutput | Promise<TOutput> | Observable<TOutput>;


export type TailNext<TOutput, TContext = any> = NextOpter<TOutput, TContext> | ((res: TOutput, context?: TContext) => HandleResult<TOutput>);
