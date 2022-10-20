import {
    BadRequestExecption, ExecptionContext, ExecptionFilter, ExecptionHandler, ExecptionHandlerMethodResolver,
    ForbiddenExecption, InternalServerExecption, NotFoundExecption, TransportArgumentExecption, TransportExecption,
    ENOENT, TransportMissingExecption, UnauthorizedExecption, UnsupportedMediaTypeExecption, Outgoing, StatusFactory
} from '@tsdi/core';
import { Injectable, isFunction } from '@tsdi/ioc';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { Buffer } from 'buffer';
import { TransportContext } from './context';


@Injectable({ static: true })
export class ExecptionFinalizeFilter implements ExecptionFilter {

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

        // first unset all headers
        if (isFunction(res.getHeaderNames)) {
            res.getHeaderNames().forEach(name => res.removeHeader(name))
        } else {
            (res as any)._headers = {} // Node < 7.7
        }

        // then set those specified
        if (err.headers) hctx.setHeader(err.headers);

        // force text/plain
        const factory = ctx.get(StatusFactory);
        hctx.type = 'text';
        const code = err.status || err.statusCode;
        let status = code ? factory.createByCode(code) : factory.create('InternalServerError');
        let msg;
        if (err instanceof TransportExecption) {
            msg = err.message
        } else {
            // ENOENT support
            if (ENOENT === err.code) status = factory.create('NotFound');

            // respond
            msg = status.statusText;
        }
        hctx.status = status;
        msg = Buffer.from(msg ?? status.statusText ?? '');
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
        execption.status = ctx.get(StatusFactory).getStatusCode('NotFound');
        ctx.execption = execption;
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: ExecptionContext, execption: ForbiddenExecption) {
        execption.status = ctx.get(StatusFactory).getStatusCode('Forbidden');
        ctx.execption = execption;
    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: ExecptionContext, execption: BadRequestExecption) {
        execption.status = ctx.get(StatusFactory).getStatusCode('BadRequest');
        ctx.execption = execption;
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: ExecptionContext, execption: UnauthorizedExecption) {
        execption.status = ctx.get(StatusFactory).getStatusCode('Unauthorized');
        ctx.execption = execption;
    }

    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: ExecptionContext, execption: InternalServerExecption) {
        execption.status = ctx.get(StatusFactory).getStatusCode('InternalServerError');
        ctx.execption = execption;
    }

    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: ExecptionContext, execption: UnsupportedMediaTypeExecption) {
        execption.status = ctx.get(StatusFactory).getStatusCode('UnsupportedMediaType');
        ctx.execption = execption;
    }

    @ExecptionHandler(TransportArgumentExecption)
    anguExecption(ctx: ExecptionContext, execption: TransportArgumentExecption) {
        ctx.execption = new BadRequestExecption(execption.message, ctx.get(StatusFactory).getStatusCode('BadRequest'))
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: ExecptionContext, execption: MissingModelFieldExecption) {
        ctx.execption = new BadRequestExecption(execption.message, ctx.get(StatusFactory).getStatusCode('BadRequest'))
    }

    @ExecptionHandler(TransportMissingExecption)
    missExecption(ctx: ExecptionContext, execption: TransportMissingExecption) {
        ctx.execption = new BadRequestExecption(execption.message, ctx.get(StatusFactory).getStatusCode('BadRequest'))
    }

}
