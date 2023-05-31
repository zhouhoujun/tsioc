import { Abstract, DefaultInvocationContext, Execption, getClass, lang, Injectable, Injector, InvokeArguments, isPromise } from '@tsdi/ioc';
import { catchError, finalize, isObservable, mergeMap, Observable, of, throwError } from 'rxjs';
import { Handler } from '../Handler';
import { Filter, FilterHandlerResolver } from './filter';
import { runHandlers } from '../handlers/runs';
import { EndpointContext } from '../endpoints/context';


/**
 * execption context
 * 
 * 异常处理上下文
 */
export class ExecptionContext<T = any, TArg extends Error = Error> extends DefaultInvocationContext<TArg> {

    constructor(public execption: TArg, readonly host: T, injector: Injector, options?: InvokeArguments) {
        super(injector, { ...options, payload: execption })

        this.setValue(getClass(execption), execption);
        const tokens = lang.getClassChain(getClass(host));
        tokens.forEach(token => this.setValue(token, host));
    }

    protected override clear(): void {
        (this as any).host = null!;
        super.clear();
    }

}

/**
 * execption filter
 * 
 * 异常处理过滤器
 */
@Abstract()
export abstract class ExecptionFilter<TInput = any, TOutput = any> extends Filter<TInput, TOutput> {
    /**
     * execption filter.
     * @param context execption context.
     * @param next The next interceptor in the chain, or the backend
     * @returns any
     */
    intercept(input: TInput, next: Handler<TInput, TOutput>): Observable<any> {
        return next.handle(input)
            .pipe(
                catchError((err, caught) => {
                    let res: any;
                    try {
                        res = this.catchError(input, err, caught);
                    } catch (err) {
                        return throwError(() => res);
                    }
                    if (isObservable(res)) {
                        return res.pipe(
                            mergeMap(r => {
                                if (r instanceof Error || r instanceof Execption) {
                                    return throwError(() => r);
                                }
                                return of(r);
                            })
                        )
                    } else if (isPromise(res)) {
                        return res.then(r => {
                            if (r instanceof Error || r instanceof Execption) {
                                throw r;
                            }
                            return r;
                        });
                    } else if (res instanceof Error || res instanceof Execption) {
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
    abstract catchError(input: TInput, err: any, caught: Observable<TOutput>): Observable<any> | Promise<any> | any;
}

/**
 * execption handler filter.
 */
@Injectable({ static: true })
export class ExecptionHandlerFilter<TInput, TOutput = any> extends ExecptionFilter<TInput, TOutput> {
    constructor(private injector: Injector) {
        super()
    }

    catchError(input: TInput, err: any, caught: Observable<TOutput>): Observable<any> {
        let injector: Injector;
        if (input instanceof EndpointContext) {
            injector = input.injector;
            input.execption = err;
        } else {
            injector = this.injector;
        }
        const handlers = injector.get(FilterHandlerResolver)?.resolve(err);
        if (!handlers || !handlers.length) {
            return throwError(() => err);
        }

        const context = new ExecptionContext(err, input, injector);
        return runHandlers(handlers, context)
            .pipe(
                finalize(() => {
                    context.destroy();
                })
            );
    }

}


