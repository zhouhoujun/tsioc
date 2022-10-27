import {
    Outgoing, StatusFactory, EndpointFilter, Endpoint, EndpointContext, BadRequestExecption, ExecptionHandler,
    ForbiddenExecption, InternalServerExecption, NotFoundExecption, TransportArgumentExecption, TransportExecption,
    ENOENT, TransportMissingExecption, UnauthorizedExecption, UnsupportedMediaTypeExecption
} from '@tsdi/core';
import { Injectable, isFunction } from '@tsdi/ioc';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { Buffer } from 'buffer';
import { Observable, map } from 'rxjs';
import { TransportContext } from './context';


@Injectable({ static: true })
export class ExecptionFinalizeFilter implements EndpointFilter {
    intercept(input: any, next: Endpoint<any, any>, context: TransportContext): Observable<any> {

        return next.handle(input, context)
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

                    const res = context.response as Outgoing;

                    // first unset all headers
                    if (isFunction(res.getHeaderNames)) {
                        res.getHeaderNames().forEach(name => res.removeHeader(name))
                    } else {
                        (res as any)._headers = {} // Node < 7.7
                    }

                    // then set those specified
                    if (err.headers) context.setHeader(err.headers);

                    // force text/plain
                    const factory = context.statusFactory;
                    context.type = 'text';
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
                    context.status = status;
                    msg = Buffer.from(msg ?? status.statusText ?? '');
                    context.length = Buffer.byteLength(msg);
                    res.end(msg)

                    return res;

                })
            )
    }

}


@Injectable({ static: true })
export class TransportExecptionHandlers {

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: EndpointContext, execption: NotFoundExecption) {
        execption.status = ctx.get(StatusFactory).getStatusCode('NotFound');
        ctx.execption = execption;
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: EndpointContext, execption: ForbiddenExecption) {
        execption.status = ctx.get(StatusFactory).getStatusCode('Forbidden');
        ctx.execption = execption;
    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: EndpointContext, execption: BadRequestExecption) {
        execption.status = ctx.get(StatusFactory).getStatusCode('BadRequest');
        ctx.execption = execption;
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: EndpointContext, execption: UnauthorizedExecption) {
        execption.status = ctx.get(StatusFactory).getStatusCode('Unauthorized');
        ctx.execption = execption;
    }

    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: EndpointContext, execption: InternalServerExecption) {
        execption.status = ctx.get(StatusFactory).getStatusCode('InternalServerError');
        ctx.execption = execption;
    }

    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: EndpointContext, execption: UnsupportedMediaTypeExecption) {
        execption.status = ctx.get(StatusFactory).getStatusCode('UnsupportedMediaType');
        ctx.execption = execption;
    }

    @ExecptionHandler(TransportArgumentExecption)
    anguExecption(ctx: EndpointContext, execption: TransportArgumentExecption) {
        ctx.execption = new BadRequestExecption(execption.message, ctx.get(StatusFactory).getStatusCode('BadRequest'))
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: EndpointContext, execption: MissingModelFieldExecption) {
        ctx.execption = new BadRequestExecption(execption.message, ctx.get(StatusFactory).getStatusCode('BadRequest'))
    }

    @ExecptionHandler(TransportMissingExecption)
    missExecption(ctx: EndpointContext, execption: TransportMissingExecption) {
        ctx.execption = new BadRequestExecption(execption.message, ctx.get(StatusFactory).getStatusCode('BadRequest'))
    }

}
