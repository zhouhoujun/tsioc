import { hasOwn, Injectable, isString, tokenId } from '@tsdi/ioc';
import { ApplicationContext, Endpoint, HttpRequest, HttpResponse } from '@tsdi/core';
import { Logger, LoggerFactory } from '@tsdi/logs';
import { Observable } from 'rxjs';
import { catchError, finalize, map, } from 'rxjs/operators'
import { isBuffer, isStream } from '../utils';
import { HttpEndpoint, HttpMiddleware } from './endpoint';
import { JsonStreamStringify } from '../stringify';

export interface JsonMiddlewareOption {
    pretty: boolean;
    param?: string;
    spaces?: number;
}


@Injectable()
export class HttpEncodeJsonMiddleware implements HttpMiddleware {

    private pretty: boolean;
    private spaces: number;
    private paramName: string;
    constructor(option: JsonMiddlewareOption) {
        this.pretty = option.pretty ?? true;
        this.spaces = option.spaces ?? 2;
        this.paramName = option.param ?? '';
    }

    intercept(req: HttpRequest, next: Endpoint<HttpRequest, HttpResponse>): Observable<any> {
        return next.handle(req)
            .pipe(
                map(resp => {
                    let body = resp.body;
                    let strm = isStream(body);
                    let json = !body && !isString(body) && !strm && isBuffer(body);

                    if (!json && !strm) {
                        return resp;
                    }

                    let pretty = this.pretty || hasOwn(req.params, this.paramName);

                    if (strm) {
                        resp.contentType = 'application/json';
                        resp.body = new JsonStreamStringify(body, undefined, pretty ? this.spaces : 2);
                    } else if (json && pretty) {
                        resp.contentType = 'application/json; charset=utf-8';
                        resp.body = JSON.stringify(body, null, this.spaces);
                    }
                    return resp;
                })
            );
    }
}


@Injectable()
export class HttpLogMiddleware implements HttpMiddleware {

    constructor(private appContext: ApplicationContext) { }

    intercept(req: HttpRequest, next: HttpEndpoint): Observable<HttpResponse> {
        const logger = req.context.getValue(Logger) ?? req.context.get(LoggerFactory).getLogger();
        if (!logger) {
            return next.handle(req);
        }

        const dev = !this.appContext.arguments.env.production;
        dev && logger.log();

        return next.handle(req)
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