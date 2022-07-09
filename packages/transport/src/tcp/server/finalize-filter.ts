import {
    BadRequestError, Encoder, ExecptionContext, ExecptionFilter, ExecptionHandler, ExecptionHandlerMethodResolver,
    ForbiddenError, InternalServerError, NotFoundError, TransportArgumentError, TransportError,
    TransportMissingError, UnauthorizedError, UnsupportedMediaTypeError
} from '@tsdi/core';
import { Inject, Injectable, isFunction, isNumber } from '@tsdi/ioc';
import { HttpStatusCode, statusMessage } from '@tsdi/common';
import { MissingModelFieldError } from '@tsdi/repository';
import { ev } from '../../consts';
import { TcpContext } from './context';
import { TcpServerOptions } from './server';
import { writeSocket } from '../../utils';


@Injectable({ static: true })
export class TcpFinalizeFilter implements ExecptionFilter {

    async handle(ctx: ExecptionContext, next: () => Promise<void>): Promise<any> {
        if (ctx.completed || !ctx.execption) return;
        let err: any;
        try {
            await next();
            if (ctx.completed) return;
            err = ctx.execption as TransportError
        } catch (er) {
            err = new InternalServerError((er as Error).message)
        }

        //finllay defalt send error.

        const hctx = ctx.get(TcpContext);
        let headerSent = false;
        if (hctx.sent) {
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
        // if (isFunction(res.getHeaderNames)) {
        //     res.getHeaderNames().forEach(name => res.removeHeader(name))
        // } else {
        //     (res as any)._headers = {} // Node < 7.7
        // }

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

        const encoder = ctx.get(Encoder);
        const { headerSplit, encoding } = ctx.get(TcpServerOptions);
        await writeSocket(res.socket, encoder.encode(res.serializeHeader()), headerSplit, encoding);
    }

}


@Injectable({ static: true })
export class TcpArgumentErrorFilter implements ExecptionFilter {

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

    @ExecptionHandler(NotFoundError)
    notFoundExecption(ctx: ExecptionContext, execption: NotFoundError) {
        execption.status = 404;
        ctx.execption = execption;
    }

    @ExecptionHandler(ForbiddenError)
    forbiddenExecption(ctx: ExecptionContext, execption: ForbiddenError) {
        execption.status = 403
        ctx.execption = execption;
    }

    @ExecptionHandler(BadRequestError)
    badReqExecption(ctx: ExecptionContext, execption: BadRequestError) {
        execption.status = 400;
        ctx.execption = execption;
    }

    @ExecptionHandler(UnauthorizedError)
    unauthorized(ctx: ExecptionContext, execption: UnauthorizedError) {
        execption.status = 401;
        ctx.execption = execption;
    }

    @ExecptionHandler(InternalServerError)
    internalServerError(ctx: ExecptionContext, execption: InternalServerError) {
        execption.status = 500;
        ctx.execption = execption;
    }

    @ExecptionHandler(UnsupportedMediaTypeError)
    unsupported(ctx: ExecptionContext, execption: UnsupportedMediaTypeError) {
        execption.status = 415;
        ctx.execption = execption;
    }

    @ExecptionHandler(TransportArgumentError)
    anguExecption(ctx: ExecptionContext, execption: TransportArgumentError) {
        ctx.execption = new BadRequestError(execption.message, 400)
    }

    @ExecptionHandler(MissingModelFieldError)
    missFieldExecption(ctx: ExecptionContext, execption: MissingModelFieldError) {
        ctx.execption = new BadRequestError(execption.message, 400)
    }

    @ExecptionHandler(TransportMissingError)
    missExecption(ctx: ExecptionContext, execption: TransportMissingError) {
        ctx.execption = new BadRequestError(execption.message, 400)
    }

}
