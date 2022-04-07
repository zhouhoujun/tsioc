import { hasOwn, Injectable, isString } from '@tsdi/ioc';
import { ApplicationContext, Endpoint, Middleware, TransportContext } from '@tsdi/core';
import { Logger, LoggerFactory } from '@tsdi/logs';
import { Observable } from 'rxjs';
import { catchError, finalize, map, } from 'rxjs/operators'
import { isBuffer, isStream } from '../utils';
import { HttpContext, HttpResponse } from './context';
import { HttpEndpoint } from './endpoint';
import { JsonStreamStringify } from '../stringify';

export interface JsonMiddlewareOption {
    pretty: boolean;
    param?: string;
    spaces?: number;
}

@Injectable()
export class HttpEncodeJsonMiddleware implements Middleware<HttpContext, HttpResponse> {

    private pretty: boolean;
    private spaces: number;
    private paramName: string;
    constructor(option: JsonMiddlewareOption) {
        this.pretty = option.pretty ?? true;
        this.spaces = option.spaces ?? 2;
        this.paramName = option.param ?? '';
    }

    intercept(ctx: HttpContext, next: Endpoint<HttpContext, any>): Observable<any> {
        ctx.contentType = 'application/json; charset=utf-8';
        return next.handle(ctx)
            .pipe(
                map(ctx => {
                    let body = ctx.body;
                    let strm = isStream(body);
                    let json = !body && !isString(body) && !strm && isBuffer(body);

                    if (!json && !strm) {
                        return ctx;
                    }

                    let pretty = this.pretty || hasOwn(ctx.query, this.paramName);

                    if (strm) {
                        ctx.contentType = 'application/json';
                        ctx.body = new JsonStreamStringify(body, undefined, pretty ? this.spaces : 2);
                    } else if (json && pretty) {
                        ctx.body = JSON.stringify(body, null, this.spaces);
                    }
                    return ctx;
                })
            );
    }
}


@Injectable()
export class HttpLogMiddleware implements Middleware<HttpContext> {

    constructor(private appContext: ApplicationContext) { }

    intercept(ctx: HttpContext, next: HttpEndpoint): Observable<HttpResponse> {
        const logger = ctx.getValue(Logger) ?? ctx.get(LoggerFactory).getLogger();
        if (!logger) {
            return next.handle(ctx);
        }

        const dev = !this.appContext.arguments.env.production;
        dev && logger.log();

        return next.handle(ctx)
            .pipe(
                map(rep=> rep),
                catchError((err, caught) => {
                    logger.log(err);
                    return caught;
                }),
                finalize(() => {
                    dev && logger.log();
                })
            );
    }

}