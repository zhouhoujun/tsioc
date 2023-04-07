import {
    BadRequestExecption,  ENOENT, ExecptionHandler, ForbiddenExecption, InternalServerExecption, NotFoundExecption,
    UnauthorizedExecption, UnsupportedMediaTypeExecption, ExecptionFilter, MessageExecption, Filter, Handler
} from '@tsdi/core';
import { Injectable, isFunction, isNumber } from '@tsdi/ioc';
import { HttpStatusCode, statusMessage } from '@tsdi/common';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { HttpBadRequestError, HttpError, HttpForbiddenError, HttpInternalServerError, HttpNotFoundError, HttpUnauthorizedError } from '../errors';
import { HttpContext } from './context';
import { HTTP_SERVEROPTIONS } from './options';
import { map, Observable } from 'rxjs';


@Injectable({ static: true })
export class HttpExecptionFinalizeFilter implements Filter {
    intercept(context: HttpContext, next: Handler): Observable<HttpError> {

        return next.handle(context)
            .pipe(
                map(r => {
                    if (!context.execption) return r;

                    const err = context.execption;

                    //finllay defalt send error.
                    let headerSent = false;
                    if (context.sent || !context.writable) {
                        headerSent = err.headerSent = true
                    }

                    // nothing we can do here other
                    // than delegate to the app-level
                    // handler and log.
                    if (headerSent) {
                        return
                    }

                    const res = context.response;

                    // first unset all headers
                    if (isFunction(res.getHeaderNames)) {
                        res.getHeaderNames().forEach(name => res.removeHeader(name))
                    } else {
                        (res as any)._headers = {} // Node < 7.7
                    }

                    // then set those specified
                    if (err.headers) context.setHeader(err.headers);

                    // force text/plain
                    context.type = 'text';
                    let statusCode = (err.status || err.statusCode) as HttpStatusCode;
                    let msg;
                    if (err instanceof MessageExecption) {
                        msg = err.message
                    } else {
                        // ENOENT support
                        if (ENOENT === err.code) statusCode = 404;

                        // default to 500
                        if (!isNumber(statusCode) || !statusMessage[statusCode]) statusCode = 500;

                        // respond
                        msg = statusMessage[statusCode]
                    }

                    context.status = context.statusFactory.createByCode(statusCode);
                    msg = Buffer.from(msg);
                    context.length = Buffer.byteLength(msg);
                    res.end(msg);
                    return err;
                })
            )

    }

}


@Injectable({ static: true })
export class HttpExecptionHandlers {

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: HttpContext, execption: NotFoundExecption) {
        ctx.execption = new HttpNotFoundError(execption.message)
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: HttpContext, execption: ForbiddenExecption) {
        ctx.execption = new HttpForbiddenError(execption.message)
    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: HttpContext, execption: BadRequestExecption) {
        ctx.execption = new HttpBadRequestError(execption.message)
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: HttpContext, execption: UnauthorizedExecption) {
        ctx.execption = new HttpUnauthorizedError(execption.message)
    }

    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: HttpContext, execption: InternalServerExecption) {
        ctx.execption = new HttpInternalServerError(execption.message)
    }

    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: HttpContext, execption: UnsupportedMediaTypeExecption) {
        ctx.execption = new HttpError(HttpStatusCode.UnsupportedMediaType, execption.message)
    }

    @ExecptionHandler(MessageArgumentExecption)
    anguExecption(ctx: HttpContext, execption: MessageArgumentExecption) {
        ctx.execption = new HttpBadRequestError(ctx.get(HTTP_SERVEROPTIONS).detailError ? execption.message : undefined)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: HttpContext, execption: MissingModelFieldExecption) {
        ctx.execption = new HttpBadRequestError(ctx.get(HTTP_SERVEROPTIONS).detailError ? execption.message : undefined)
    }

    @ExecptionHandler(MessageMissingExecption)
    missExecption(ctx: HttpContext, execption: MessageMissingExecption) {
        ctx.execption = new HttpBadRequestError(ctx.get(HTTP_SERVEROPTIONS).detailError ? execption.message : undefined)
    }

}
