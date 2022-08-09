import {
    BadRequestError,ExecptionContext, ExecptionFilter, ExecptionHandler, ExecptionHandlerMethodResolver,
    ForbiddenError, InternalServerError, NotFoundError, Protocol, TransportArgumentError, TransportError,
    ENOENT, TransportMissingError, UnauthorizedError, UnsupportedMediaTypeError
} from '@tsdi/core';
import { Injectable, isFunction, isNumber } from '@tsdi/ioc';
import { MissingModelFieldError } from '@tsdi/repository';
import { Buffer } from 'buffer';
import { TransportContext } from './context';


@Injectable({ static: true })
export class TransportFinalizeFilter implements ExecptionFilter {

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
        const protocol = ctx.get(Protocol);
        const hctx = ctx.get(TransportContext);
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
        let statusCode = (err.status || err.statusCode) as number;
        let msg;
        if (err instanceof TransportError) {
            msg = err.message
        } else {
            // ENOENT support
            if (ENOENT === err.code) statusCode = protocol.status.notFound;

            // default to server error.
            if (!isNumber(statusCode) || !protocol.status.isVaild(statusCode)) statusCode = protocol.status.serverError;

            // respond
            msg = protocol.status.message(statusCode)
        }
        hctx.status = statusCode;
        msg = Buffer.from(msg);
        hctx.length = Buffer.byteLength(msg);
        res.end(msg)
    }

}


@Injectable({ static: true })
export class TransportExecptionFilter implements ExecptionFilter {

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
        execption.status = ctx.get(Protocol).status.notFound;
        ctx.execption = execption;
    }

    @ExecptionHandler(ForbiddenError)
    forbiddenExecption(ctx: ExecptionContext, execption: ForbiddenError) {
        execption.status = ctx.get(Protocol).status.forbidden;
        ctx.execption = execption;
    }

    @ExecptionHandler(BadRequestError)
    badReqExecption(ctx: ExecptionContext, execption: BadRequestError) {
        execption.status = ctx.get(Protocol).status.badRequest;
        ctx.execption = execption;
    }

    @ExecptionHandler(UnauthorizedError)
    unauthorized(ctx: ExecptionContext, execption: UnauthorizedError) {
        execption.status = ctx.get(Protocol).status.unauthorized;
        ctx.execption = execption;
    }

    @ExecptionHandler(InternalServerError)
    internalServerError(ctx: ExecptionContext, execption: InternalServerError) {
        execption.status = ctx.get(Protocol).status.serverError;
        ctx.execption = execption;
    }

    @ExecptionHandler(UnsupportedMediaTypeError)
    unsupported(ctx: ExecptionContext, execption: UnsupportedMediaTypeError) {
        execption.status = ctx.get(Protocol).status.unsupportedMediaType;
        ctx.execption = execption;
    }

    @ExecptionHandler(TransportArgumentError)
    anguExecption(ctx: ExecptionContext, execption: TransportArgumentError) {
        ctx.execption = new BadRequestError(execption.message, ctx.get(Protocol).status.badRequest)
    }

    @ExecptionHandler(MissingModelFieldError)
    missFieldExecption(ctx: ExecptionContext, execption: MissingModelFieldError) {
        ctx.execption = new BadRequestError(execption.message, ctx.get(Protocol).status.badRequest)
    }

    @ExecptionHandler(TransportMissingError)
    missExecption(ctx: ExecptionContext, execption: TransportMissingError) {
        ctx.execption = new BadRequestError(execption.message, ctx.get(Protocol).status.badRequest)
    }

}
