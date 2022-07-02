import { Endpoint, Interceptor, TransportContext } from '@tsdi/core';
import { Abstract, Injectable } from '@tsdi/ioc';
import { Observable, mergeMap } from 'rxjs';


@Abstract()
export abstract class RespondAdapter {
    abstract respond(res: any, ctx: TransportContext): Promise<any>;
}



@Injectable()
export class RespondInterceptor<TRequest = any, TResponse = any> implements Interceptor<TRequest, TResponse> {

    constructor(private adapter: RespondAdapter) { }

    intercept(req: TRequest, next: Endpoint<TRequest, TResponse>, ctx: TransportContext): Observable<TResponse> {
        return next.handle(req, ctx)
            .pipe(
                mergeMap(res => {
                    return this.adapter.respond(res, ctx)
                })
            )
    }
}
