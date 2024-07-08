import { ArgumentExecption, Injectable, MissingParameterExecption, isNil } from '@tsdi/ioc';
import { ExecptionHandler, InvalidJsonException, NotHandleExecption } from '@tsdi/core';
import { HttpStatusCode } from '@tsdi/common';
import {
    BadRequestExecption, ForbiddenExecption, InternalServerExecption,
    MethodNotAllowedExecption, NotAcceptableExecption, NotImplementedExecption, BadGatewayExecption,
    ServiceUnavailableExecption, GatewayTimeoutExecption, NotSupportedExecption, RequestTimeoutExecption,
    NotFoundExecption, UnauthorizedExecption, UnsupportedMediaTypeExecption, MessageExecption
} from '@tsdi/common/transport';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { HttpContext } from './server/context';




@Injectable({ static: true })
export class HttpExecptionHandlers {

    constructor() { }


    @ExecptionHandler(InvalidJsonException)
    badJsonExecption(ctx: HttpContext, execption: InvalidJsonException) {
        let exp: MessageExecption;
        if (isNil(ctx.body)) {
            exp = new InternalServerExecption(execption.message, HttpStatusCode.InternalServerError);
        } else {
            exp = new BadRequestExecption(execption.message, HttpStatusCode.BadRequest);
        }
        ctx.respondExecption(exp)
    }

    @ExecptionHandler(NotHandleExecption)
    notHanldeExecption(ctx: HttpContext, err: NotHandleExecption) {
        const execption = new InternalServerExecption(this.detailError(ctx) ? err.message : undefined);
        ctx.respondExecption(execption)
    }
    

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: HttpContext, execption: BadRequestExecption) {
        execption.status = HttpStatusCode.BadRequest;
        ctx.respondExecption(execption)
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: HttpContext, execption: UnauthorizedExecption) {
        execption.status = HttpStatusCode.Unauthorized;
        ctx.respondExecption(execption)
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: HttpContext, execption: ForbiddenExecption) {
        execption.status = HttpStatusCode.Forbidden;
        ctx.respondExecption(execption)
    }

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: HttpContext, execption: NotFoundExecption) {
        execption.status = HttpStatusCode.NotFound;
        ctx.respondExecption(execption)
    }

    @ExecptionHandler(MethodNotAllowedExecption)
    notAllowedExecption(ctx: HttpContext, execption: MethodNotAllowedExecption) {
        execption.status = HttpStatusCode.MethodNotAllowed;
        ctx.respondExecption(execption)
    }


    @ExecptionHandler(NotAcceptableExecption)
    notAcceptableExecption(ctx: HttpContext, execption: NotAcceptableExecption) {
        execption.status = HttpStatusCode.NotAcceptable;
        ctx.respondExecption(execption)
    }


    @ExecptionHandler(RequestTimeoutExecption)
    timeoutExecpotion(ctx: HttpContext, execption: NotAcceptableExecption) {
        execption.status = HttpStatusCode.RequestTimeout;
        ctx.respondExecption(execption)
    }


    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: HttpContext, execption: UnsupportedMediaTypeExecption) {
        execption.status = HttpStatusCode.UnsupportedMediaType;
        ctx.respondExecption(execption)
    }


    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: HttpContext, execption: InternalServerExecption) {
        execption.status = HttpStatusCode.InternalServerError;
        ctx.respondExecption(execption)
    }

    @ExecptionHandler(NotImplementedExecption)
    notImplementedError(ctx: HttpContext, execption: NotImplementedExecption) {
        execption.status = HttpStatusCode.NotImplemented;
        ctx.respondExecption(execption)
    }


    @ExecptionHandler(BadGatewayExecption)
    badGatewayError(ctx: HttpContext, execption: BadGatewayExecption) {
        execption.status = HttpStatusCode.BadGateway;
        ctx.respondExecption(execption)
    }

    @ExecptionHandler(ServiceUnavailableExecption)
    ServiceUnavailableError(ctx: HttpContext, execption: ServiceUnavailableExecption) {
        execption.status = HttpStatusCode.ServiceUnavailable;
        ctx.respondExecption(execption)
    }

    @ExecptionHandler(GatewayTimeoutExecption)
    gatewayTimeoutError(ctx: HttpContext, execption: GatewayTimeoutExecption) {
        execption.status = HttpStatusCode.GatewayTimeout;
        ctx.respondExecption(execption)
    }

    @ExecptionHandler(NotSupportedExecption)
    notSupportedError(ctx: HttpContext, execption: NotSupportedExecption) {
        execption.status = HttpStatusCode.BadGateway;
        ctx.respondExecption(execption)
    }


    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: HttpContext, err: ArgumentExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.respondExecption(execption)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: HttpContext, err: MissingModelFieldExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.respondExecption(execption)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: HttpContext, err: MissingParameterExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.respondExecption(execption)
    }

    protected detailError(ctx: HttpContext): boolean {
        return ctx.serverOptions.detailError === true;
    }
}
