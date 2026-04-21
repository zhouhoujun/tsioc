import { Filter, FilterFn } from '@tsdi/core';
import { Observable } from 'rxjs';
import { RequestContext } from './context';
import { RequestHandler } from './handler';
/**
 * filter is a chainable behavior modifier for `request handlers`.
 *
 * 处理器过滤器。
 */
export declare abstract class RequestFilter<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> extends Filter<TInput, Observable<TOutput>, TContext> {
}
/**
 * request FilterFn is a chainable behavior modifier for `request handlers`.
 *
 * 处理器过滤方法。
 */
export type RequestFilterFn<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> = FilterFn<TInput, Observable<TOutput>, TContext>;
/**
 * request filter like
 */
export type RequestFilterLike<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> = RequestFilterFn<TInput, TOutput, TContext> | RequestFilter<TInput, TOutput, TContext>;
export declare abstract class RequestExceptionFilter<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> extends RequestFilter<TInput, TOutput, TContext> {
    /**
     * execption filter.
     * @param context execption context.
     * @param next The next interceptor in the chain, or the backend
     * @returns any
     */
    doFilter(input: TInput, next: RequestHandler<TInput, TOutput, TContext>, context: TContext): Observable<TOutput>;
    /**
     * catch error.
     * @param err
     * @param caught
     */
    abstract catchError(input: TInput, err: any, context: TContext): Observable<TOutput>;
}
/**
 * execption handler filter.
 */
export declare class RequestExceptionHandlerFilter<TInput, TOutput = any, TContext extends RequestContext = RequestContext> extends RequestExceptionFilter<TInput, TOutput, TContext> {
    catchError(input: TInput, err: any, context: TContext): Observable<TOutput>;
}
