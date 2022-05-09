import { ExecptionContext, ExecptionFilter, HttpStatusCode, TransportError } from '@tsdi/core';
import { Injectable, isFunction, isNumber } from '@tsdi/ioc';
import { HttpError, InternalServerError } from './errors';
import { HttpContext } from './context';
import { ctype, ev } from '../consts';
import { statusMessage } from './status';


@Injectable()
export class HttpFinalizeFilter implements ExecptionFilter {

    async handle(ctx: ExecptionContext, next: () => Promise<void>): Promise<any> {
        if (ctx.completed || !ctx.execption) return;
        let err: any;
        try {
            await next();
            if (ctx.completed) return;
            err = ctx.execption as HttpError;
        } catch (er) {
            err = new InternalServerError((er as Error).message);
        }

        const httpctx = ctx.getValue(HttpContext);
        let headerSent = false;
        if (httpctx.sent || !httpctx.writable) {
            headerSent = err.headerSent = true;
        }

        // nothing we can do here other
        // than delegate to the app-level
        // handler and log.
        if (headerSent) {
            return;
        }

        const res = httpctx.response;

        // first unset all headers
        if (isFunction(res.getHeaderNames)) {
            res.getHeaderNames().forEach(name => res.removeHeader(name));
        } else {
            (res as any)._headers = {}; // Node < 7.7
        }

        // then set those specified
        if (err.headers) httpctx.setHeader(err.headers);

        // force text/plain
        httpctx.contentType = ctype.TEXT_PLAIN;
        let statusCode = (err.status || err.statusCode) as HttpStatusCode;
        let msg: string;
        if (err instanceof TransportError) {
            msg = err.message;
        } else {
            // ENOENT support
            if (ev.ENOENT === err.code) statusCode = 404;

            // default to 500
            if (!isNumber(statusCode) || !statusMessage[statusCode]) statusCode = 500;

            // respond
            msg = statusMessage[statusCode];
        }
        httpctx.status = statusCode;
        httpctx.length = Buffer.byteLength(msg);
        res.end(msg);
    }

}
