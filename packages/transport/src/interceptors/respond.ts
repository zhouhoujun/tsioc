import { Endpoint, Interceptor, ServerOpts, TransportContext } from '@tsdi/core';
import { Abstract, Injectable } from '@tsdi/ioc';
import { Observable, mergeMap } from 'rxjs';


@Abstract()
export abstract class RespondAdapter {
    abstract respond(res: any, ctx: TransportContext): Promise<any>;
}



@Injectable({ static: true })
export class RespondInterceptor<TRequest = any, TResponse = any> implements Interceptor<TRequest, TResponse> {

    constructor() { }

    intercept(req: TRequest, next: Endpoint<TRequest, TResponse>, ctx: TransportContext): Observable<TResponse> {
        return next.handle(req, ctx)
            .pipe(
                mergeMap(res => {
                    const opts = ctx.target.getOptions() as ServerOpts;
                    if (opts.encoder) {
                        ctx.body = ctx.get(opts.encoder).encode(ctx.body);
                    }
                    return ctx.get(RespondAdapter).respond(res, ctx)
                })
            )
    }
}
