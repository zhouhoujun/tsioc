import {
    BadRequestExecption, ENOENT, ExecptionContext, ExecptionFilter, ExecptionHandler, ExecptionHandlerMethodResolver,
    ForbiddenExecption, InternalServerExecption, NotFoundExecption, Status, TransportArgumentExecption, TransportExecption,
    TransportMissingExecption, UnauthorizedExecption, UnsupportedMediaTypeExecption
} from '@tsdi/core';
import { Injectable, isFunction, isNumber } from '@tsdi/ioc';
import { HttpStatusCode, statusMessage } from '@tsdi/common';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { HttpBadRequestError, HttpError, HttpForbiddenError, HttpInternalServerError, HttpNotFoundError, HttpUnauthorizedError } from '../errors';
import { HttpContext } from './context';
import { HTTP_SERVEROPTIONS } from './options';


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
        let msg;
        if (err instanceof TransportExecption) {
            msg = err.message
        } else {
            // ENOENT support
            if (ENOENT === err.code) statusCode = 404;

            // default to 500
            if (!isNumber(statusCode) || !statusMessage[statusCode]) statusCode = 500;

            // respond
            msg = statusMessage[statusCode]
        }
        
        hctx.status = new Status(statusCode, msg);
        msg = Buffer.from(msg);
        hctx.length = Buffer.byteLength(msg);
        res.end(msg)
    }

}


@Injectable({ static: true })
export class HttpExecptionFilter implements ExecptionFilter {

    constructor() {

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

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: ExecptionContext, execption: NotFoundExecption) {
        ctx.execption = new HttpNotFoundError(execption.message)
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: ExecptionContext, execption: ForbiddenExecption) {
        ctx.execption = new HttpForbiddenError(execption.message)
    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: ExecptionContext, execption: BadRequestExecption) {
        ctx.execption = new HttpBadRequestError(execption.message)
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: ExecptionContext, execption: UnauthorizedExecption) {
        ctx.execption = new HttpUnauthorizedError(execption.message)
    }

    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: ExecptionContext, execption: InternalServerExecption) {
        ctx.execption = new HttpInternalServerError(execption.message)
    }

    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: ExecptionContext, execption: UnsupportedMediaTypeExecption) {
        ctx.execption = new HttpError(415, execption.message)
    }

    @ExecptionHandler(TransportArgumentExecption)
    anguExecption(ctx: ExecptionContext, execption: TransportArgumentExecption) {
        ctx.execption = new HttpBadRequestError(ctx.get(HTTP_SERVEROPTIONS).detailError ? execption.message : undefined)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: ExecptionContext, execption: MissingModelFieldExecption) {
        ctx.execption = new HttpBadRequestError(ctx.get(HTTP_SERVEROPTIONS).detailError ? execption.message : undefined)
    }

    @ExecptionHandler(TransportMissingExecption)
    missExecption(ctx: ExecptionContext, execption: TransportMissingExecption) {
        ctx.execption = new HttpBadRequestError(ctx.get(HTTP_SERVEROPTIONS).detailError ? execption.message : undefined)
    }

}
