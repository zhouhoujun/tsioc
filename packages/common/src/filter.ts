import { Abstract } from '@tsdi/ioc';
import { Filter, FilterFn } from '@tsdi/core';
import { Observable } from 'rxjs';


/**
 * filter is a chainable behavior modifier for `request handlers`.
 * 
 * 处理器过滤器。
 */
@Abstract()
export abstract class RequestFilter<TInput = any, TOutput = any, TContext = any> extends Filter<TInput, Observable<TOutput>, TContext> {

}

/**
 * request FilterFn is a chainable behavior modifier for `request handlers`.
 * 
 * 处理器过滤方法。
 */
export type RequestFilterFn<TInput = any, TOutput = any, TContext = any> = FilterFn<TInput, Observable<TOutput>, TContext>;

/**
 * request filter like
 */
export type RequestFilterLike<TInput = any, TOutput = any, TContext = any> = RequestFilterFn<TInput, TOutput, TContext> | RequestFilter<TInput, TOutput, TContext>;
