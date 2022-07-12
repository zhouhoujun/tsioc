import {
    BadRequestError, Encoder, ExecptionContext, ExecptionFilter, ExecptionHandler, ExecptionHandlerMethodResolver,
    ForbiddenError, InternalServerError, NotFoundError, TransportArgumentError, TransportError,
    TransportMissingError, TransportStatus, UnauthorizedError, UnsupportedMediaTypeError
} from '@tsdi/core';
import { Injectable, isNumber } from '@tsdi/ioc';
import { MissingModelFieldError } from '@tsdi/repository';
import { ev } from '../../consts';
import { TcpContext } from './context';
import { TcpServerOptions } from './options';
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
        for (const n in res.getHeaders()) {
            res.removeHeader(n);
        }


        // then set those specified
        if (err.headers) hctx.setHeader(err.headers);

        // force text/plain
        hctx.type = 'text';
        let statusCode = (err.status || err.statusCode) as number;
        let msg: string;
        if (err instanceof TransportError) {
            msg = err.message
        } else {
            // ENOENT support
            if (ev.ENOENT === err.code) statusCode = hctx.adapter.notFound;

            // default to server error.
            if (!isNumber(statusCode) || !hctx.adapter.message(statusCode)) statusCode = hctx.adapter.serverError;

            // respond
            msg = hctx.adapter.message(statusCode);
        }
        hctx.status = statusCode;
        hctx.statusMessage = msg;
        // hctx.length = Buffer.byteLength(msg);

        const encoder = ctx.get(Encoder);
        const { delimiter, encoding } = ctx.get(TcpServerOptions);
        await writeSocket(res.socket, encoder.encode(res.serializeHeader()), delimiter!, 0, encoding);
    }

}


@Injectable({ static: true })
export class TcpArgumentErrorFilter implements ExecptionFilter {

    constructor(private adapter: TransportStatus) {

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
        execption.status = this.adapter.notFound;
        ctx.execption = execption;
    }

    @ExecptionHandler(ForbiddenError)
    forbiddenExecption(ctx: ExecptionContext, execption: ForbiddenError) {
        execption.status = this.adapter.forbidden;
        ctx.execption = execption;
    }

    @ExecptionHandler(BadRequestError)
    badReqExecption(ctx: ExecptionContext, execption: BadRequestError) {
        execption.status = this.adapter.badRequest;
        ctx.execption = execption;
    }

    @ExecptionHandler(UnauthorizedError)
    unauthorized(ctx: ExecptionContext, execption: UnauthorizedError) {
        execption.status = this.adapter.unauthorized;
        ctx.execption = execption;
    }

    @ExecptionHandler(InternalServerError)
    internalServerError(ctx: ExecptionContext, execption: InternalServerError) {
        execption.status = this.adapter.serverError;
        ctx.execption = execption;
    }

    @ExecptionHandler(UnsupportedMediaTypeError)
    unsupported(ctx: ExecptionContext, execption: UnsupportedMediaTypeError) {
        execption.status = this.adapter.unsupportedMediaType;
        ctx.execption = execption;
    }

    @ExecptionHandler(TransportArgumentError)
    anguExecption(ctx: ExecptionContext, execption: TransportArgumentError) {
        ctx.execption = new BadRequestError(execption.message, this.adapter.badRequest)
    }

    @ExecptionHandler(MissingModelFieldError)
    missFieldExecption(ctx: ExecptionContext, execption: MissingModelFieldError) {
        ctx.execption = new BadRequestError(execption.message, this.adapter.badRequest)
    }

    @ExecptionHandler(TransportMissingError)
    missExecption(ctx: ExecptionContext, execption: TransportMissingError) {
        ctx.execption = new BadRequestError(execption.message, this.adapter.badRequest)
    }

}
