import {
    BadRequestExecption, ExecptionContext, ExecptionFilter, ExecptionHandler, ExecptionHandlerMethodResolver,
    ForbiddenExecption, InternalServerExecption, NotFoundExecption, TransportArgumentExecption, TransportExecption,
    ENOENT, TransportMissingExecption, UnauthorizedExecption, UnsupportedMediaTypeExecption, ServerEndpointContext, Outgoing
} from '@tsdi/core';
import { Injectable, isFunction, isNumber } from '@tsdi/ioc';
import { MissingModelFieldExecption } from '@tsdi/repository';
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
            err = ctx.execption as TransportExecption
        } catch (er) {
            err = new InternalServerExecption((er as Error).message)
        }

        //finllay defalt send error.
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

        const res = hctx.response as Outgoing;
        const stgy = hctx.status;

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
        if (err instanceof TransportExecption) {
            msg = err.message
        } else {
            // ENOENT support
            if (ENOENT === err.code) statusCode = stgy.status.notFound;

            // default to server error.
            if (!isNumber(statusCode) || !stgy.status.isVaild(statusCode)) statusCode = stgy.status.serverError;

            // respond
            msg = stgy.status.message(statusCode)
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

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: ExecptionContext, execption: NotFoundExecption) {
        execption.status = ctx.get(ServerEndpointContext).status.code.notFound;
        ctx.execption = execption;
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: ExecptionContext, execption: ForbiddenExecption) {
        execption.status = ctx.get(ServerEndpointContext).status.code.forbidden;
        ctx.execption = execption;
    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: ExecptionContext, execption: BadRequestExecption) {
        execption.status = ctx.get(ServerEndpointContext).status.code.badRequest;
        ctx.execption = execption;
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: ExecptionContext, execption: UnauthorizedExecption) {
        execption.status = ctx.get(ServerEndpointContext).status.code.unauthorized;
        ctx.execption = execption;
    }

    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: ExecptionContext, execption: InternalServerExecption) {
        execption.status = ctx.get(ServerEndpointContext).status.code.serverError;
        ctx.execption = execption;
    }

    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: ExecptionContext, execption: UnsupportedMediaTypeExecption) {
        execption.status = ctx.get(ServerEndpointContext).status.code.unsupportedMediaType;
        ctx.execption = execption;
    }

    @ExecptionHandler(TransportArgumentExecption)
    anguExecption(ctx: ExecptionContext, execption: TransportArgumentExecption) {
        ctx.execption = new BadRequestExecption(execption.message, ctx.get(ServerEndpointContext).status.code.badRequest)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: ExecptionContext, execption: MissingModelFieldExecption) {
        ctx.execption = new BadRequestExecption(execption.message, ctx.get(ServerEndpointContext).status.code.badRequest)
    }

    @ExecptionHandler(TransportMissingExecption)
    missExecption(ctx: ExecptionContext, execption: TransportMissingExecption) {
        ctx.execption = new BadRequestExecption(execption.message, ctx.get(ServerEndpointContext).status.code.badRequest)
    }

}
