import { Abstract, DefaultInvocationContext, Execption, getClass, Injectable, Injector, InvokeArguments, Token } from '@tsdi/ioc';
import { catchError, finalize, Observable, throwError } from 'rxjs';
import { Handler } from '../Handler';
import { InternalServerExecption } from '../execptions';
import { EndpointContext } from '../endpoints/context';
import { Filter, FilterHandlerResolver } from './filter';
import { runHandlers } from '../handlers/runs';


/**
 * execption context
 */
export class ExecptionContext<T = any, TArg extends Error = Error> extends DefaultInvocationContext<TArg> {

    constructor(public execption: TArg, readonly host: T, injector: Injector, options?: InvokeArguments) {
        super(injector, { ...options, payload: execption })
        const token = getClass(execption);
        this.setValue(token, execption);
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
                catchError((err, caught) => this.catchError(input, err, caught))
            )
    }

    /**
     * catch error.
     * @param err 
     * @param caught 
     */
    abstract catchError(input: TInput, err: any, caught: Observable<TOutput>): Observable<any>
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
            return throwError(() => err instanceof Execption ? err : new InternalServerExecption(err.message));
        }

        const context = new ExecptionContext(err, input, injector);
        return runHandlers(handlers, context, c => c.done === true)
            .pipe(
                finalize(() => {
                    context.destroy();
                })
            );
    }

}


