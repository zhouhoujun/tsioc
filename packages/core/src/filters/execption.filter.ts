import { Abstract, Exception, Injectable, isPromise, isUndefined, composeHandlers, invokeTail } from '@tsdi/ioc';
import { catchError, isObservable, mergeMap, Observable, of, throwError } from 'rxjs';
import { ApplicationHandler, RunableContext } from '../ApplicationHandler';
import { Filter, FilterHandlerResolver } from './filter';
// import { toObservable } from '../handlers';


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
    doFilter(input: TInput, next: ApplicationHandler<TInput, TOutput>, context: TContext): TOutput|Promise<TOutput>|Observable<TOutput> {
        return next.handle(input, context, {
            error: (err) => {
                return invokeTail(() => this.catchError(input, err, context), {
                    next: (res) => {
                        if (res instanceof Error || res instanceof Exception) {
                            throw res;
                        }
                        return res;
                    },
                    error: (err) => { throw err }
                })
            }
        })
    }

    /**
     * catch error.
     * @param err 
     * @param caught 
     */
    abstract catchError(input: TInput, err: any, context?: TContext): TOutput|Promise<TOutput>|Observable<TOutput>;
}

/**
 * execption handler filter.
 */
@Injectable({ static: true })
export class ExceptionHandlerFilter<TInput, TOutput = any, TContext extends RunableContext = RunableContext> extends ExceptionFilter<TInput, TOutput, TContext> {


    catchError(input: TInput, err: any, context: TContext): TOutput {
        const injector = context.getInjector();
        const handlers = injector.get(FilterHandlerResolver)?.resolve(err);
        if (!handlers || !handlers.length) {
            return err;
        }

        return invokeTail(() => composeHandlers(handlers, (res, next, input, context) => {
            if (isUndefined(res)) {
                return next(err, context)
            }
            return res;
        })(err, context),
            {
                error: err1 => {
                    err1.originException = err;
                    err1.message = `${err1.message}\r\n${err.toString()}`;
                    return throwError(() => err1)
                }
            });
    }

}
