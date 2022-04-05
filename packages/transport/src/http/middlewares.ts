import { Middleware } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { Logger, LoggerFactory } from '@tsdi/logs';
import { catchError, finalize, Observable } from 'rxjs';
import { HttpContext } from './context';
import { HttpEndpoint } from './endpoint';

@Injectable()
export class EncodeMiddleware implements Middleware<HttpContext> {

    middleware(ctx: HttpContext, next: HttpEndpoint): Observable<HttpContext> {
        
        ctx
        return next.endpoint(ctx);
    }

}

@Injectable()
export class LoggerMiddleware implements Middleware<HttpContext> {

    middleware(ctx: HttpContext, next: HttpEndpoint): Observable<HttpContext> {
        
        const logger = ctx.getValue(Logger) ?? ctx.get(LoggerFactory).getLogger();
        logger.log('')
        return next.endpoint(ctx)
            .pipe(
                catchError((err, caught) => {
                    logger.log(err);
                    return caught;
                }),
                finalize(()=> {
                    logger.log();
                })
            );
    }

}