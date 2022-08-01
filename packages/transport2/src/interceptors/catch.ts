import { createExecptionContext, Endpoint, EndpointContext, Interceptor } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { Logger } from '@tsdi/logs';
import { from, Observable, catchError } from 'rxjs';



@Injectable({ static: true })
export class CatchInterceptor<TRequest = any, TResponse = any> implements Interceptor<TRequest, TResponse> {

    constructor() { }

    intercept(req: TRequest, next: Endpoint<TRequest, TResponse>, ctx: EndpointContext): Observable<TResponse> {
        return next.handle(req, ctx)
            .pipe(
                catchError((err, caught) => {
                    // log error
                    ctx.get(Logger).error(err);
                    // handle error
                    const filter = ctx.target.filter();
                    const context = createExecptionContext(ctx, err);
                    return from(filter.handle(context, async () => {
                        await context.destroy()
                    }))
                })
            )

    }
}
