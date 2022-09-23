import { Endpoint, Interceptor, ServerOpts, ConnectionContext } from '@tsdi/core';
import { Abstract, Injectable } from '@tsdi/ioc';
import { Observable, mergeMap } from 'rxjs';


@Abstract()
export abstract class RespondAdapter {
    abstract respond(res: any, ctx: ConnectionContext): Promise<any>;
}



@Injectable({ static: true })
export class RespondInterceptor<TRequest = any, TResponse = any> implements Interceptor<TRequest, TResponse> {

    constructor() { }

    intercept(req: TRequest, next: Endpoint<TRequest, TResponse>, ctx: ConnectionContext): Observable<TResponse> {
        return next.handle(req, ctx)
            .pipe(
                mergeMap(res => {
                    return ctx.get(RespondAdapter).respond(res, ctx)
                })
            )
    }
}
