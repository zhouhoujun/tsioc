import { Abstract, DefaultInvocationContext, Execption, getClass, Injectable, Injector, InvokeArguments, Token } from '@tsdi/ioc';
import { catchError, finalize, map, Observable, Observer, of } from 'rxjs';
import { Backend, Handler } from '../Handler';
import { MessageExecption } from '../execptions';
import { EndpointContext } from '../endpoints/context';
import { Filter, runFilters } from './filter';


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
export abstract class ExecptionFilter extends Filter<ExecptionContext, any> {

    /**
     * transport endpoint handle.
     * @param input request input.
     * @param context request context.
     */
    abstract handle(context: ExecptionContext): Observable<any>;
}

/**
 * execption backend.
 */
@Abstract()
export abstract class ExecptionBackend implements Backend<ExecptionContext, any> {

    /**
     * transport endpoint handle.
     * @param input request input.
     * @param context request context.
     */
    abstract handle(context: ExecptionContext): Observable<any>;
}


/**
 * catch interceptor.
 */
@Injectable({ static: true })
export class CatchFilter<TInput, TOutput = any> implements Filter<TInput, TOutput> {
    constructor(private injector: Injector) { }

    intercept(input: TInput, next: Handler<TInput, TOutput>): Observable<TOutput> {
        return next.handle(input)
            .pipe(
                catchError((err, caught) => {
                    let injector: Injector;
                    if (input instanceof EndpointContext) {
                        injector = input.injector;
                        input.execption = err;
                    } else {
                        injector = this.injector;
                    }
                    const endpoint = (injector === this.injector) ? injector.get(ExecptionFilter) : (injector.get(ExecptionFilter, null) ?? this.injector.get(ExecptionFilter));
                    if (!endpoint) {
                        return of(err);
                    }
                    const context = new ExecptionContext(err, input, injector);
                    return endpoint.handle(context)
                        .pipe(
                            finalize(() => {
                                context.destroy();
                            })
                        );
                })
            )
    }
}

/**
 * execption handler banckend.
 */
@Injectable({ static: true })
export class ExecptionHandlerBackend extends ExecptionBackend {

    handle(context: ExecptionContext): Observable<any> {

        return new Observable((observer: Observer<MessageExecption>) => {
            return runFilters(context, getClass(context.payload))
                .pipe(
                    map(r => {
                        if (!context.execption || !(context.execption instanceof MessageExecption)) {
                            throw new Execption('can not handle error type');
                        }
                        return context.execption;
                    }),
                    catchError((err, caught) => {
                        context.execption = err;
                        return of(err);
                    })
                ).subscribe(observer)
        })
    }
}


