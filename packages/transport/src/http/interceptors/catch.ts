import { createExecptionContext, Endpoint, Interceptor } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { Logger } from '@tsdi/logs';
import { from, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpContext, HttpServRequest, HttpServResponse } from '../context';
import { HttpExecptionFilter } from '../filter';



@Injectable()
export class CatchInterceptor implements Interceptor<HttpServRequest, HttpServResponse> {

    constructor() { }

    intercept(req: HttpServRequest, next: Endpoint<HttpServRequest, HttpServResponse>, ctx: HttpContext): Observable<HttpServResponse> {
        return next.handle(req, ctx)
            .pipe(
                catchError((err, caught) => {
                    // log error
                    ctx.get(Logger).error(err);
                    // handle error
                    const filter = ctx.get(HttpExecptionFilter);
                    const context = createExecptionContext(ctx, err);
                    return from(filter.handle(context, async () => {
                        await context.destroy()
                    }))
                })
            )
        
    }
}
