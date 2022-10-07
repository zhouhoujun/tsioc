import { Endpoint, Interceptor, ServerEndpointContext } from '@tsdi/core';
import { Abstract, Injectable } from '@tsdi/ioc';
import { Observable, mergeMap } from 'rxjs';


@Abstract()
export abstract class RespondAdapter {
    abstract respond(res: any, ctx: ServerEndpointContext): Promise<any>;
}



@Injectable({ static: true })
export class RespondInterceptor<TRequest = any, TResponse = any> implements Interceptor<TRequest, TResponse> {

    constructor() { }

    intercept(req: TRequest, next: Endpoint<TRequest, TResponse>, ctx: ServerEndpointContext): Observable<TResponse> {
        return next.handle(req, ctx)
            .pipe(
                mergeMap(res => {
                    // return ctx.transport.transformer.transform(res, ctx);
                    return ctx.get(RespondAdapter).respond(res, ctx)
                })
            )
    }
}
