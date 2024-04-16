import { ArgumentExecption, Injectable, MissingParameterExecption, isNil, tokenId } from '@tsdi/ioc';
import { ExecptionHandler } from '@tsdi/core';
import { HttpStatusCode } from '@tsdi/common';
import {
    BadRequestExecption, ForbiddenExecption, InternalServerExecption,
    MethodNotAllowedExecption, NotAcceptableExecption, NotImplementedExecption, BadGatewayExecption,
    ServiceUnavailableExecption, GatewayTimeoutExecption, NotSupportedExecption, RequestTimeoutExecption,
    NotFoundExecption, UnauthorizedExecption, UnsupportedMediaTypeExecption, InvalidJsonException, MessageExecption
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
        ctx.throwExecption(exp)
    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: HttpContext, execption: BadRequestExecption) {
        execption.status = HttpStatusCode.BadRequest;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: HttpContext, execption: UnauthorizedExecption) {
        execption.status = HttpStatusCode.Unauthorized;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: HttpContext, execption: ForbiddenExecption) {
        execption.status = HttpStatusCode.Forbidden;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: HttpContext, execption: NotFoundExecption) {
        execption.status = HttpStatusCode.NotFound;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(MethodNotAllowedExecption)
    notAllowedExecption(ctx: HttpContext, execption: MethodNotAllowedExecption) {
        execption.status = HttpStatusCode.MethodNotAllowed;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(NotAcceptableExecption)
    notAcceptableExecption(ctx: HttpContext, execption: NotAcceptableExecption) {
        execption.status = HttpStatusCode.NotAcceptable;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(RequestTimeoutExecption)
    timeoutExecpotion(ctx: HttpContext, execption: NotAcceptableExecption) {
        execption.status = HttpStatusCode.RequestTimeout;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: HttpContext, execption: UnsupportedMediaTypeExecption) {
        execption.status = HttpStatusCode.UnsupportedMediaType;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: HttpContext, execption: InternalServerExecption) {
        execption.status = HttpStatusCode.InternalServerError;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(NotImplementedExecption)
    notImplementedError(ctx: HttpContext, execption: NotImplementedExecption) {
        execption.status = HttpStatusCode.NotImplemented;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(BadGatewayExecption)
    badGatewayError(ctx: HttpContext, execption: BadGatewayExecption) {
        execption.status = HttpStatusCode.BadGateway;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(ServiceUnavailableExecption)
    ServiceUnavailableError(ctx: HttpContext, execption: ServiceUnavailableExecption) {
        execption.status = HttpStatusCode.ServiceUnavailable;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(GatewayTimeoutExecption)
    gatewayTimeoutError(ctx: HttpContext, execption: GatewayTimeoutExecption) {
        execption.status = HttpStatusCode.GatewayTimeout;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(NotSupportedExecption)
    notSupportedError(ctx: HttpContext, execption: NotSupportedExecption) {
        execption.status = HttpStatusCode.BadGateway;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: HttpContext, err: ArgumentExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: HttpContext, err: MissingModelFieldExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: HttpContext, err: MissingParameterExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwExecption(execption)
    }

    protected detailError(ctx: HttpContext): boolean {
        return ctx.serverOptions.detailError === true;
    }
}
