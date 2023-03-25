import { Abstract, Execption, getClass, Injectable } from '@tsdi/ioc';
import { catchError, finalize, map, Observable, Observer, of } from 'rxjs';
import { Endpoint } from '../Endpoint';
import { MessageExecption } from '../execptions';
import { EndpointContext } from './context';
import { Filter, runHandlers } from './filter';


/**
 * execption filter
 */
@Abstract()
export abstract class ExecptionFilter extends Filter<Error, MessageExecption> {

    /**
     * transport endpoint handle.
     * @param input request input.
     * @param context request context.
     */
    abstract handle(input: Error, context: EndpointContext): Observable<MessageExecption>;
}

/**
 * execption backend.
 */
@Abstract()
export abstract class ExecptionBackend implements Endpoint<Error, MessageExecption> {

    /**
     * transport endpoint handle.
     * @param input request input.
     * @param context request context.
     */
    abstract handle(input: Error, context: EndpointContext): Observable<MessageExecption>;
}


/**
 * catch interceptor.
 */
@Injectable({ static: true })
export class CatchFilter<TInput = any, TOutput = any> implements Filter<TInput, TOutput> {

    intercept(input: TInput, next: Endpoint<TInput, TOutput>, ctx: EndpointContext): Observable<TOutput> {
        return next.handle(input, ctx)
            .pipe(
                catchError((err, caught) => {
                    ctx.execption = err;
                    const endpoint = ctx.get(ExecptionFilter);
                    if (!endpoint) {
                        return of(err);
                    }
                    const token = getClass(err);
                    ctx.setValue(token, err);
                    return endpoint.handle(err, ctx)
                        .pipe(
                            finalize(() => {
                                ctx.setValue(token, null);
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

    handle(input: Error, context: EndpointContext): Observable<MessageExecption> {

        return new Observable((observer: Observer<MessageExecption>) => {
            return runHandlers(context, input, getClass(input))
                .pipe(
                    map(r => {
                        if (!context.execption || !(context.execption instanceof MessageExecption)) {
                            throw new Execption('can not handle error type');
                        }
                        return context.execption as MessageExecption;
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


