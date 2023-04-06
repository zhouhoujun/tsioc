import {
    Filter, GuardHandler, MessageExecption, ENOENT, AssetContext
} from '@tsdi/core';
import { Injectable, isFunction } from '@tsdi/ioc';
import { Buffer } from 'buffer';
import { Observable, map } from 'rxjs';


@Injectable({ static: true })
export class ExecptionFinalizeFilter implements Filter {
    intercept(context: AssetContext, next: GuardHandler<any, any>): Observable<any> {

        return next.handle(context)
            .pipe(
                map(r => {

                    if (!context.execption) return r;

                    const err = context.execption;
                    //finllay defalt send error.
                    let headerSent = false;
                    if (context.sent || !context.response.writable) {
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
                        res.getHeaderNames().forEach((name: string) => res.removeHeader(name))
                    } else {
                        (res as any)._headers = {} // Node < 7.7
                    }

                    // then set those specified
                    if (err.headers) context.setHeader(err.headers);

                    // force text/plain
                    context.type = 'text';
                    let status = err.status || err.statusCode || 500;
                    let msg;
                    if (err instanceof MessageExecption) {
                        msg = err.message
                    } else {
                        // ENOENT support
                        if (ENOENT === err.code) status = 404; //factory.create('NotFound');

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


// @Injectable({ static: true })
// export class TransportExecptionHandlers {

//     @ExecptionHandler(NotFoundExecption)
//     notFoundExecption(ctx: EndpointContext, execption: NotFoundExecption) {
//         execption.status = ctx.get(StatusFactory).getStatusCode('NotFound');
//         ctx.execption = execption;
//     }

//     @ExecptionHandler(ForbiddenExecption)
//     forbiddenExecption(ctx: EndpointContext, execption: ForbiddenExecption) {
//         execption.status = ctx.get(StatusFactory).getStatusCode('Forbidden');
//         ctx.execption = execption;
//     }

//     @ExecptionHandler(BadRequestExecption)
//     badReqExecption(ctx: EndpointContext, execption: BadRequestExecption) {
//         execption.status = ctx.get(StatusFactory).getStatusCode('BadRequest');
//         ctx.execption = execption;
//     }

//     @ExecptionHandler(UnauthorizedExecption)
//     unauthorized(ctx: EndpointContext, execption: UnauthorizedExecption) {
//         execption.status = ctx.get(StatusFactory).getStatusCode('Unauthorized');
//         ctx.execption = execption;
//     }

//     @ExecptionHandler(InternalServerExecption)
//     internalServerError(ctx: EndpointContext, execption: InternalServerExecption) {
//         execption.status = ctx.get(StatusFactory).getStatusCode('InternalServerError');
//         ctx.execption = execption;
//     }

//     @ExecptionHandler(UnsupportedMediaTypeExecption)
//     unsupported(ctx: EndpointContext, execption: UnsupportedMediaTypeExecption) {
//         execption.status = ctx.get(StatusFactory).getStatusCode('UnsupportedMediaType');
//         ctx.execption = execption;
//     }

//     @ExecptionHandler(MessageArgumentExecption)
//     anguExecption(ctx: EndpointContext, execption: MessageArgumentExecption) {
//         ctx.execption = new BadRequestExecption(execption.message, ctx.get(StatusFactory).getStatusCode('BadRequest'))
//     }

//     @ExecptionHandler(MissingModelFieldExecption)
//     missFieldExecption(ctx: EndpointContext, execption: MissingModelFieldExecption) {
//         ctx.execption = new BadRequestExecption(execption.message, ctx.get(StatusFactory).getStatusCode('BadRequest'))
//     }

//     @ExecptionHandler(MessageMissingExecption)
//     missExecption(ctx: EndpointContext, execption: MessageMissingExecption) {
//         ctx.execption = new BadRequestExecption(execption.message, ctx.get(StatusFactory).getStatusCode('BadRequest'))
//     }

// }
