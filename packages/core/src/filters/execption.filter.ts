import { Abstract, Exception, Injectable, isPromise, isUndefined, composeHandlers } from '@tsdi/ioc';
import { catchError, isObservable, mergeMap, Observable, of, throwError } from 'rxjs';
import { ApplicationHandler, RunableContext } from '../ApplicationHandler';
import { Filter, FilterHandlerResolver } from './filter';
import { toObservable } from '../handlers';


/**
 * execption filter
 * 
 * 异常处理过滤器
 */
@Abstract()
export abstract class ExceptionFilter<TInput = any, TOutput = any, TContext extends RunableContext = RunableContext> extends Filter<TInput, TOutput, TContext> {
    /**
     * execption filter.
     * @param context execption context.
     * @param next The next interceptor in the chain, or the backend
     * @returns any
     */
    doFilter(input: TInput, next: ApplicationHandler<TInput, TOutput>, context: TContext): Observable<any> {
        return next.handle(input, context)
            .pipe(
                catchError((err, caught) => {
                    let res: any;
                    try {
                        res = this.catchError(input, err, caught, context);
                    } catch (err) {
                        return throwError(() => err);
                    }
                    if (isObservable(res)) {
                        return res.pipe(
                            mergeMap(r => {
                                if (r instanceof Error || r instanceof Exception) {
                                    return throwError(() => r);
                                }
                                return of(r);
                            })
                        )
                    } else if (isPromise(res)) {
                        return res.then(r => {
                            if (r instanceof Error || r instanceof Exception) {
                                throw r;
                            }
                            return r;
                        });
                    } else if (res instanceof Error || res instanceof Exception) {
                        return throwError(() => res);
                    } else {
                        return of(res);
                    }
                })
            )
    }

    /**
     * catch error.
     * @param err 
     * @param caught 
     */
    abstract catchError(input: TInput, err: any, caught: Observable<TOutput>, context?: TContext): Observable<any> | Promise<any> | any;
}

/**
 * execption handler filter.
 */
@Injectable({ static: true })
export class ExceptionHandlerFilter<TInput, TOutput = any, TContext extends RunableContext = RunableContext> extends ExceptionFilter<TInput, TOutput, TContext> {


    catchError(input: TInput, err: any, caught: Observable<TOutput>, context: TContext): Observable<any> {
        const injector = context.getInjector();
        const handlers = injector.get(FilterHandlerResolver)?.resolve(err);
        if (!handlers || !handlers.length) {
            return throwError(() => err);
        }

        return toObservable(composeHandlers(handlers, (res, next, input, context) => {
            if (isUndefined(res)) {
                return next(err, context)
            }
            return of(res);
        })(err, context)).pipe(
            catchError((err1, caugh) => {
                err1.originException = err;
                err1.message = `${err1.message}\r\n${err.toString()}`;
                return throwError(() => err1)
            }),
            // finalize(() => {
            //     expcption.destroy();
            // })
        );
    }

}
