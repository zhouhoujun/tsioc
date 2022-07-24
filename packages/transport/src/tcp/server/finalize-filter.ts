import {
    BadRequestError, ENOENT, ExecptionContext, ExecptionFilter, ExecptionHandler, ExecptionHandlerMethodResolver,
    ForbiddenError, InternalServerError, NotFoundError, Protocol, TransportArgumentError, TransportError,
    TransportMissingError, UnauthorizedError, UnsupportedMediaTypeError
} from '@tsdi/core';
import { Injectable, isNumber } from '@tsdi/ioc';
import { MissingModelFieldError } from '@tsdi/repository';
import { PacketProtocol } from '../packet';
import { TcpContext } from './context';


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
            if (ENOENT === err.code) statusCode = hctx.protocol.status.notFound;

            // default to server error.
            if (!isNumber(statusCode) || !hctx.protocol.status.message(statusCode)) statusCode = hctx.protocol.status.serverError;

            // respond
            msg = hctx.protocol.status.message(statusCode);
        }
        hctx.status = statusCode;
        hctx.statusMessage = msg;
        // hctx.length = Buffer.byteLength(msg);

        ctx.get(PacketProtocol).write(res.socket, res.serializePacket());
        // const encoder = ctx.get(Encoder);
        // const { delimiter, encoding } = ctx.get(TcpServerOptions);
        // await writeSocket(res.socket, res.id, 0, encoder.encode(res.serializeHeader()), delimiter!,encoding);
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
