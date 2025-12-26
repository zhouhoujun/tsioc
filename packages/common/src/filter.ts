import { Abstract, composeHandlers, Exception, Injectable, invokeTail, isUndefined, toObservable } from '@tsdi/ioc';
import { Filter, FilterFn, FilterHandlerResolver } from '@tsdi/core';
import { catchError, Observable, throwError } from 'rxjs';
import { RequestContext } from './context';
import { RequestHandler } from './handler';
import { RequestInterceptorFn } from './interceptor';


/**
 * filter is a chainable behavior modifier for `request handlers`.
 * 
 * 处理器过滤器。
 */
@Abstract()
export abstract class RequestFilter<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> extends Filter<TInput, Observable<TOutput>, TContext> {

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


@Abstract()
export abstract class RequestExceptionFilter<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> extends RequestFilter<TInput, TOutput, TContext> {

    /**
     * execption filter.
     * @param context execption context.
     * @param next The next interceptor in the chain, or the backend
     * @returns any
     */
    doFilter(input: TInput, next: RequestHandler<TInput, TOutput, TContext>, context: TContext): Observable<TOutput> {
        return next.handle(input, context)
            .pipe(
                catchError(err => {
                    return invokeTail(() => this.catchError(input, err, context), {
                        next: (res) => {
                            if (res instanceof Error || res instanceof Exception) {
                                throw res;
                            }
                            return res;
                        },
                        error: (err) => null
                    })
                })
            );
    }

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
@Injectable({ static: true })
export class RequestExceptionHandlerFilter<TInput, TOutput = any, TContext extends RequestContext = RequestContext> extends RequestExceptionFilter<TInput, TOutput, TContext> {


    catchError(input: TInput, err: any, context: TContext): Observable<TOutput> {
        const injector = context.getInjector();
        const handlers = injector.get(FilterHandlerResolver)?.resolve(err);
        if (!handlers || !handlers.length) {
            return throwError(() => err);
        }

        return toObservable<TOutput>(invokeTail(
            composeHandlers(handlers, (res, next, input, context) => {
                if (isUndefined(res)) {
                    return next(err, context)
                }
                return res;
            }),
            {
                error: (err1) => {
                    err1.originException = err;
                    err1.message = `${err1.message}\r\n${err.toString()}`;
                }
            }, err, context));
    }

}
