import { Abstract, Execption, getClass, Injectable } from '@tsdi/ioc';
import { catchError, finalize, map, Observable, Observer, of } from 'rxjs';
import { Endpoint } from '../Endpoint';
import { Interceptor } from '../Interceptor';
import { EndpointContext } from './context';
import { InternalServerExecption, MessageExecption } from '../execptions';
import { EndpointFilter, runHandlers } from './filter';


@Abstract()
export abstract class ExecptionEndpoint implements Endpoint<Error, MessageExecption> {

    /**
     * transport endpoint handle.
     * @param input request input.
     * @param context request context.
     */
    abstract handle(input: Error, context: EndpointContext): Observable<MessageExecption>;
}

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
 * execption filter is a chainable behavior modifier for `endpoints`.
 */
@Abstract()
export abstract class ExecptionFilter extends EndpointFilter<Error, MessageExecption>  {
    /**
     * the method to implemet interceptor filter.
     * @param input  request input.
     * @param next The next interceptor in the chain, or the backend
     * if no interceptors remain in the chain.
     * @param context request context.
     * @returns An observable of the event stream.
     */
    abstract intercept(input: Error, next: ExecptionEndpoint, context: EndpointContext): Observable<MessageExecption>;
}

/**
 * catch interceptor.
 */
@Injectable({ static: true })
export class CatchInterceptor<TInput = any, TOutput = any> implements Interceptor<TInput, TOutput> {

    intercept(input: TInput, next: Endpoint<TInput, TOutput>, ctx: EndpointContext): Observable<TOutput> {
        return next.handle(input, ctx)
            .pipe(
                catchError((err, caught) => {
                    ctx.execption = err;
                    const token = getClass(err);
                    ctx.setValue(token, err);
                    return ctx.target.execptionfilter().handle(err, ctx)
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
                        const exception = new InternalServerExecption((err as Error).message, context.statusFactory.getStatusCode('InternalServerError'));
                        context.execption = exception;
                        return of(exception);
                    })
                ).subscribe(observer)
        })
    }
}


