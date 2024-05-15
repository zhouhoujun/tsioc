import { ArgumentExecption, Injectable, MissingParameterExecption } from '@tsdi/ioc';
import { ExecptionHandler } from '@tsdi/core';
import {
    BadGatewayExecption, BadRequestExecption, ForbiddenExecption, ServiceUnavailableExecption,
    GatewayTimeoutExecption, InternalServerExecption, MethodNotAllowedExecption, NotAcceptableExecption,
    NotFoundExecption, NotImplementedExecption, NotSupportedExecption, RequestTimeoutExecption,
    UnauthorizedExecption, UnsupportedMediaTypeExecption
} from '@tsdi/common/transport';
import { RequestContext } from '@tsdi/endpoints';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { CoapStatuCode } from '../status';


@Injectable({ static: true })
export class CoapExecptionHandlers {

    constructor() {

    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: RequestContext, execption: BadRequestExecption) {
        execption.status = CoapStatuCode.BadRequest;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: RequestContext, execption: UnauthorizedExecption) {
        execption.status = CoapStatuCode.Unauthorized;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: RequestContext, execption: ForbiddenExecption) {
        execption.status = CoapStatuCode.Forbidden;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: RequestContext, execption: NotFoundExecption) {
        execption.status = CoapStatuCode.NotFound;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(MethodNotAllowedExecption)
    notAllowedExecption(ctx: RequestContext, execption: MethodNotAllowedExecption) {
        execption.status = CoapStatuCode.MethodNotAllowed;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(NotAcceptableExecption)
    notAcceptableExecption(ctx: RequestContext, execption: NotAcceptableExecption) {
        execption.status = CoapStatuCode.NotAcceptable;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(RequestTimeoutExecption)
    timeoutExecpotion(ctx: RequestContext, execption: NotAcceptableExecption) {
        execption.status = CoapStatuCode.NotFound;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: RequestContext, execption: UnsupportedMediaTypeExecption) {
        execption.status = CoapStatuCode.UnsupportedContentFormat;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: RequestContext, execption: InternalServerExecption) {
        execption.status = CoapStatuCode.InternalServerError;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(NotImplementedExecption)
    notImplementedError(ctx: RequestContext, execption: NotImplementedExecption) {
        execption.status = CoapStatuCode.NotImplemented;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(BadGatewayExecption)
    badGatewayError(ctx: RequestContext, execption: BadGatewayExecption) {
        execption.status = CoapStatuCode.BadGateway;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(ServiceUnavailableExecption)
    ServiceUnavailableError(ctx: RequestContext, execption: ServiceUnavailableExecption) {
        execption.status = CoapStatuCode.ServiceUnavailable;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(GatewayTimeoutExecption)
    gatewayTimeoutError(ctx: RequestContext, execption: GatewayTimeoutExecption) {
        execption.status = CoapStatuCode.GatewayTimeout;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(NotSupportedExecption)
    notSupportedError(ctx: RequestContext, execption: NotSupportedExecption) {
        execption.status = CoapStatuCode.BadGateway;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: RequestContext, err: ArgumentExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, '4.00');
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: RequestContext, err: MissingModelFieldExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, '4.00');
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: RequestContext, err: MissingParameterExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, '4.00');
        ctx.throwExecption(execption)
    }

    protected detailError(ctx: RequestContext): boolean {
        return ctx.serverOptions.detailError == true
    }

}
