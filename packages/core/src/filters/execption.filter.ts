import { Abstract, Execption, getClass, Injectable, InvokeArguments, Token } from '@tsdi/ioc';
import { catchError, finalize, map, Observable, Observer, of } from 'rxjs';
import { Endpoint } from '../Endpoint';
import { MessageExecption } from '../execptions';
import { EndpointContext } from '../endpoints/context';
import { Filter, runHandlers } from './filter';


/**
 * execption context
 */
export class ExecptionContext extends EndpointContext {

    constructor(public readonly execption: Error, public readonly host: EndpointContext, options?: InvokeArguments) {
        super(host.injector, { ...options, payload: execption })
        const token = getClass(execption);
        this.setValue(token, execption);
    }

    override isSelf(token: Token) {
        return token === ExecptionContext;
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
export abstract class ExecptionBackend implements Endpoint<ExecptionContext, any> {

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
export class CatchFilter<TCtx extends EndpointContext, TOutput = any> implements Filter<TCtx, TOutput> {

    intercept(ctx: TCtx, next: Endpoint<TCtx, TOutput>): Observable<TOutput> {
        return next.handle(ctx)
            .pipe(
                catchError((err, caught) => {
                    ctx.execption = err;
                    const endpoint = ctx.get(ExecptionFilter);
                    if (!endpoint) {
                        return of(err);
                    }
                    const context = new ExecptionContext(err, ctx);
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

    handle(context: EndpointContext<Error>): Observable<any> {

        return new Observable((observer: Observer<MessageExecption>) => {
            return runHandlers(context, getClass(context.payload))
                .pipe(
                    map(r => {
                        if (!context.execption || !(context.execption instanceof MessageExecption)) {
                            throw new Execption('can not handle error type');
                        }
                        return context.execption;
                    }),
                    catchError((err, caught) => {
                        // const exception = new InternalServerExecption((err as Error).message, context.statusFactory.getStatusCode('InternalServerError'));
                        context.execption = err;
                        return of(err);
                    })
                ).subscribe(observer)
        })
    }
}


