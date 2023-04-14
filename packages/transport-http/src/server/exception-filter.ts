import {
    BadRequestExecption, ENOENT, ExecptionHandler, ForbiddenExecption, InternalServerExecption, NotFoundExecption,
    UnauthorizedExecption, UnsupportedMediaTypeExecption, ExecptionFilter, MessageExecption
} from '@tsdi/core';
import { ArgumentExecption, Injectable, MissingParameterExecption, isFunction, isNumber } from '@tsdi/ioc';
import { HttpStatusCode, statusMessage } from '@tsdi/common';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { HttpBadRequestError, HttpError, HttpForbiddenError, HttpInternalServerError, HttpNotFoundError, HttpUnauthorizedError } from '../errors';
import { HttpContext } from './context';
import { HTTP_SERVEROPTIONS } from './options';
import { map, Observable } from 'rxjs';


// @Injectable({ static: true })
// export class HttpExecptionFinalizeFilter extends ExecptionFilter<HttpContext> {
//     catchError(context: HttpContext, err: any, caught: Observable<any>): any {

//         //finllay defalt send error.
//         let headerSent = false;
//         if (context.sent || !context.writable) {
//             headerSent = err.headerSent = true
//         }

//         // nothing we can do here other
//         // than delegate to the app-level
//         // handler and log.
//         if (headerSent) {
//             return
//         }

//         const res = context.response;

//         // first unset all headers
//         if (isFunction(res.getHeaderNames)) {
//             res.getHeaderNames().forEach(name => res.removeHeader(name))
//         } else {
//             (res as any)._headers = {} // Node < 7.7
//         }

//         // then set those specified
//         if (err.headers) context.setHeader(err.headers);

//         // force text/plain
//         context.type = 'text';
//         let statusCode = (err.status || err.statusCode) as HttpStatusCode;
//         let msg;
//         if (err instanceof MessageExecption) {
//             msg = err.message
//         } else {
//             // ENOENT support
//             if (ENOENT === err.code) statusCode = 404;

//             // default to 500
//             if (!isNumber(statusCode) || !statusMessage[statusCode]) statusCode = 500;

//             // respond
//             msg = statusMessage[statusCode]
//         }

//         context.status = statusCode;
//         msg = Buffer.from(msg);
//         context.length = Buffer.byteLength(msg);
//         res.end(msg);
//         return err;
//     }

// }


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

    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: HttpContext, execption: ArgumentExecption) {
        ctx.execption = new HttpBadRequestError(ctx.get(HTTP_SERVEROPTIONS).detailError ? execption.message : undefined)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: HttpContext, execption: MissingModelFieldExecption) {
        ctx.execption = new HttpBadRequestError(ctx.get(HTTP_SERVEROPTIONS).detailError ? execption.message : undefined)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: HttpContext, execption: MissingParameterExecption) {
        ctx.execption = new HttpBadRequestError(ctx.get(HTTP_SERVEROPTIONS).detailError ? execption.message : undefined)
    }

}
