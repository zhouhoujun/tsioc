import { Handler, RunContext } from '../handler';
import { Filter } from './filter';
/**
 * execption filter
 *
 * 异常处理过滤器
 */
export declare abstract class ExceptionFilter<TInput = any, TOutput = any, TContext extends RunContext = RunContext> extends Filter<TInput, TOutput, TContext> {
    /**
     * execption filter.
     * @param context execption context.
     * @param next The next interceptor in the chain, or the backend
     * @returns any
     */
    doFilter(input: TInput, next: Handler<TInput, TOutput>, context: TContext): TOutput;
    /**
     * catch error.
     * @param err
     * @param caught
     */
    abstract catchError(input: TInput, err: any, context: TContext): TOutput;
}
/**
 * execption handler filter.
 */
export declare class ExceptionHandlerFilter<TInput, TOutput = any, TContext extends RunContext = RunContext> extends ExceptionFilter<TInput, TOutput, TContext> {
    catchError(input: TInput, err: any, context: TContext): TOutput;
}
