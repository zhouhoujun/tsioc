import {
    BadRequestError, ExecptionContext, ExecptionFilter, ExecptionHandler, ExecptionHandlerMethodResolver,
    ForbiddenError, InternalServerError, NotFoundError, TransportArgumentError, TransportError,
    TransportMissingError, UnauthorizedError
} from '@tsdi/core';
import { Inject, Injectable, isFunction, isNumber } from '@tsdi/ioc';
import { HttpStatusCode, statusMessage } from '@tsdi/common';
import { MissingModelFieldError } from '@tsdi/repository';
import { HttpBadRequestError, HttpError, HttpForbiddenError, HttpInternalServerError, HttpNotFoundError, HttpUnauthorizedError } from '../errors';
import { HttpContext } from './context';
import { ev } from '../../consts';
import { HttpServerOptions, HTTP_SERVEROPTIONS } from './options';


@Injectable({ static: true })
export class HttpFinalizeFilter implements ExecptionFilter {

    async handle(ctx: ExecptionContext, next: () => Promise<void>): Promise<any> {
        if (ctx.completed || !ctx.execption) return;
        let err: any;
        try {
            await next();
            if (ctx.completed) return;
            err = ctx.execption as HttpError
        } catch (er) {
            err = new HttpInternalServerError((er as Error).message)
        }

        //finllay defalt send error.

        const hctx = ctx.get(HttpContext);
        let headerSent = false;
        if (hctx.sent || !hctx.writable) {
            headerSent = err.headerSent = true
        }

        // nothing we can do here other
        // than delegate to the app-level
        // handler and log.
        if (headerSent) {
            return
        }

        const res = hctx.response;

        // first unset all headers
        if (isFunction(res.getHeaderNames)) {
            res.getHeaderNames().forEach(name => res.removeHeader(name))
        } else {
            (res as any)._headers = {} // Node < 7.7
        }

        // then set those specified
        if (err.headers) hctx.setHeader(err.headers);

        // force text/plain
        hctx.type = 'text';
        let statusCode = (err.status || err.statusCode) as HttpStatusCode;
        let msg: string;
        if (err instanceof TransportError) {
            msg = err.message
        } else {
            // ENOENT support
            if (ev.ENOENT === err.code) statusCode = 404;

            // default to 500
            if (!isNumber(statusCode) || !statusMessage[statusCode]) statusCode = 500;

            // respond
            msg = statusMessage[statusCode]
        }
        hctx.status = statusCode;
        hctx.length = Buffer.byteLength(msg);
        res.end(msg)
    }

}


@Injectable({ static: true })
export class ArgumentErrorFilter implements ExecptionFilter {

    constructor(@Inject(HTTP_SERVEROPTIONS) private option: HttpServerOptions) {

    }

    async handle(ctx: ExecptionContext<Error>, next: () => Promise<void>): Promise<any> {
        const handles = ctx.injector.get(ExecptionHandlerMethodResolver).resolve(ctx.execption);
        if (handles.length) {
            await Promise.all(handles.map(h => h.invoke(ctx)))
        }

        if (!ctx.completed) {
            return await next()
        }
    }

    @ExecptionHandler(NotFoundError)
    notFoundExecption(ctx: ExecptionContext, execption: NotFoundError) {
        ctx.execption = new HttpNotFoundError(execption.message)
    }

    @ExecptionHandler(ForbiddenError)
    forbiddenExecption(ctx: ExecptionContext, execption: ForbiddenError) {
        ctx.execption = new HttpForbiddenError(execption.message)
    }

    @ExecptionHandler(BadRequestError)
    badReqExecption(ctx: ExecptionContext, execption: BadRequestError) {
        ctx.execption = new HttpBadRequestError(execption.message)
    }

    @ExecptionHandler(UnauthorizedError)
    unauthorized(ctx: ExecptionContext, execption: UnauthorizedError) {
        ctx.execption = new HttpUnauthorizedError(execption.message)
    }

    @ExecptionHandler(InternalServerError)
    internalServerError(ctx: ExecptionContext, execption: InternalServerError) {
        ctx.execption = new HttpInternalServerError(execption.message)
    }

    @ExecptionHandler(TransportArgumentError)
    anguExecption(ctx: ExecptionContext, execption: TransportArgumentError) {
        ctx.execption = new HttpBadRequestError(this.option.detailError ? execption.message : undefined)
    }

    @ExecptionHandler(MissingModelFieldError)
    missFieldExecption(ctx: ExecptionContext, execption: MissingModelFieldError) {
        ctx.execption = new HttpBadRequestError(this.option.detailError ? execption.message : undefined)
    }

    @ExecptionHandler(TransportMissingError)
    missExecption(ctx: ExecptionContext, execption: TransportMissingError) {
        ctx.execption = new HttpBadRequestError(this.option.detailError ? execption.message : undefined)
    }

}
