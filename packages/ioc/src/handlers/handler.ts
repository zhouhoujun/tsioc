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
    handle(input: TInput, context: TContext): TOutput;

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
export type HandlerFn<TInput = any, TOutput = any, TContext = any> = (input: TInput, context: TContext) => TOutput;


/**
 * handler like
 */
export type HandlerLike<TInput = any, TOutput = any, TContext = any> = HandlerFn<TInput, TOutput, TContext> | Handler<TInput, TOutput, TContext>;

/**
 * next operation
 */
export interface NextOpter<T, TContext = any> {
    next?: (res: T, context?: TContext) => any;
    error?: (error: any) => any;
    finally?: () => any;
}

/**
 * Handle result.
 */
export type HandleResult<T> = T | Promise<T> | Observable<T>;
/**
 * next operation fn.
 */
export type NextOpterFn<T, TContext = any> = (res: T, context?: TContext) => any;


/**
 * Tail next.
 */
export type TailNext<T, TContext = any> = NextOpter<T, TContext> | NextOpterFn<T, TContext>;