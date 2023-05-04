import { Abstract, DefaultInvocationContext, getClass, Injectable, Injector, InvokeArguments, isPromise, Token } from '@tsdi/ioc';
import { catchError, finalize, isObservable, Observable, of, throwError } from 'rxjs';
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
        const token = getClass(execption);
        this.setValue(token, execption);
        this.setValue(getClass(host), host);
    }

    override isSelf(token: Token) {
        return token === ExecptionContext;
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
                    const res = this.catchError(input, err, caught);
                    if (isObservable(res) || isPromise(res)) return res;
                    return of(res);
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


