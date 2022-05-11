import {
    ExecptionContext, ExecptionFilter, ExecptionHandler, ExecptionHandlerMethodResolver,
    HttpStatusCode, MissingModelFieldError, TransportArgumentError, TransportError, TransportMissingError
} from '@tsdi/core';
import { Inject, Injectable, isFunction, isNumber } from '@tsdi/ioc';
import { BadRequestError, HttpError, InternalServerError } from './errors';
import { HttpContext } from './context';
import { ctype, ev } from '../consts';
import { statusMessage } from './status';
import { HttpServerOptions, HTTP_SERVEROPTIONS } from './server';


@Injectable({ static: true })
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


@Injectable({ static: true })
export class ArgumentErrorFilter implements ExecptionFilter {

    constructor(@Inject(HTTP_SERVEROPTIONS) private option: HttpServerOptions) {

    }

    async handle(ctx: ExecptionContext<Error>, next: () => Promise<void>): Promise<any> {
        const handles = ctx.injector.get(ExecptionHandlerMethodResolver).resolve(ctx.execption);
        if (handles.length) {
            await Promise.all(handles.map(h => h.invoke(ctx)));
        }

        if (!ctx.completed) {
            return await next();
        }

    }

    @ExecptionHandler(TransportArgumentError)
    anguExecption(ctx: ExecptionContext, execption: TransportArgumentError) {
        ctx.execption = new BadRequestError(this.option.detailError ? execption.message : undefined);
    }

    @ExecptionHandler(MissingModelFieldError)
    missFieldExecption(ctx: ExecptionContext, execption: MissingModelFieldError) {
        ctx.execption = new BadRequestError(this.option.detailError ? execption.message : undefined);
    }

    @ExecptionHandler(TransportMissingError)
    missExecption(ctx: ExecptionContext, execption: TransportMissingError) {
        ctx.execption = new BadRequestError(this.option.detailError ? execption.message : undefined);
    }


}