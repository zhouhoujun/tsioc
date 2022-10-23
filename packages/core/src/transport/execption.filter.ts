import { Abstract, Execption, getClass, Injectable } from '@tsdi/ioc';
import { catchError, map, Observable, Observer, of } from 'rxjs';
import { EndpointContext } from './context';
import { Endpoint, Interceptor } from './endpoint';
import { InternalServerExecption, TransportExecption } from './execptions';
import { EndpointFilter, runHandlers } from './filter';


@Abstract()
export abstract class ExecptionEndpoint implements Endpoint<Error, TransportExecption> {

    /**
     * transport endpoint handle.
     * @param input request input.
     * @param context request context.
     */
    abstract handle(input: Error, context: EndpointContext): Observable<TransportExecption>;
}

@Abstract()
export abstract class ExecptionBackend implements Endpoint<Error, TransportExecption> {

    /**
     * transport endpoint handle.
     * @param input request input.
     * @param context request context.
     */
    abstract handle(input: Error, context: EndpointContext): Observable<TransportExecption>;
}

/**
 * execption filter is a chainable behavior modifier for `endpoints`.
 */
@Abstract()
export abstract class ExecptionFilter extends EndpointFilter<Error, TransportExecption>  {
    /**
     * the method to implemet interceptor filter.
     * @param input  request input.
     * @param next The next interceptor in the chain, or the backend
     * if no interceptors remain in the chain.
     * @param context request context.
     * @returns An observable of the event stream.
     */
    abstract intercept(input: Error, next: ExecptionEndpoint, context: EndpointContext): Observable<TransportExecption>;
}


@Injectable({ static: true })
export class CatchInterceptor<TInput = any, TOutput = any> implements Interceptor<TInput, TOutput> {

    intercept(input: TInput, next: Endpoint<TInput, TOutput>, ctx: EndpointContext): Observable<TOutput> {
        return next.handle(input, ctx)
            .pipe(
                catchError((err, caught) => {
                    // ctx.execption = err;
                    return ctx.target.execptionfilter().handle(err, ctx);
                })
            )
    }
}

@Injectable({ static: true })
export class ExecptionHandlerBackend extends ExecptionBackend {

    handle(input: Error, context: EndpointContext): Observable<TransportExecption> {

        return new Observable((observer: Observer<TransportExecption>) => {
            return runHandlers(context, input, getClass(input))
                .pipe(
                    map(r => {
                        if (!context.execption || !(context.execption instanceof TransportExecption)) {
                            throw new Execption('can not handle error type');
                        }
                        return context.execption as TransportExecption;
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


