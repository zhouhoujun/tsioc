import { Abstract, Execption, getClass, Injectable } from '@tsdi/ioc';
import { catchError, finalize, map, Observable, Observer, of } from 'rxjs';
import { Endpoint } from '../Endpoint';
import { MessageExecption } from '../execptions';
import { createEndpointContext, EndpointContext } from '../endpoints/context';
import { Filter, runHandlers } from './filter';


/**
 * execption filter
 */
@Abstract()
export abstract class ExecptionFilter extends Filter<EndpointContext<Error>, any> {

    /**
     * transport endpoint handle.
     * @param input request input.
     * @param context request context.
     */
    abstract handle(context: EndpointContext<Error>): Observable<any>;
}

/**
 * execption backend.
 */
@Abstract()
export abstract class ExecptionBackend implements Endpoint<EndpointContext<Error>, any> {

    /**
     * transport endpoint handle.
     * @param input request input.
     * @param context request context.
     */
    abstract handle(context: EndpointContext<Error>): Observable<any>;
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
                    const token = getClass(err);
                    const context = createEndpointContext(ctx.injector, { payload: err })
                    context.setValue(token, err);
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


