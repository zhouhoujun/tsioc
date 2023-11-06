
import {
    BadGatewayExecption, BadRequestExecption, ForbiddenExecption, ServiceUnavailableExecption,
    GatewayTimeoutExecption, InternalServerExecption, MethodNotAllowedExecption, NotAcceptableExecption,
    NotFoundExecption, NotImplementedExecption, NotSupportedExecption, RequestTimeoutExecption,
    UnauthorizedExecption, UnsupportedMediaTypeExecption
} from '@tsdi/common';
import { ArgumentExecption, Injectable, MissingParameterExecption } from '@tsdi/ioc';
import { ExecptionHandler } from '@tsdi/core';
import { AssetContext, Responder, SHOW_DETAIL_ERROR } from '@tsdi/endpoints';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { CoapStatuCode } from '../status';


@Injectable({ static: true })
export class CoapExecptionHandlers {

    constructor() {

    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: AssetContext, execption: BadRequestExecption) {
        execption.status = CoapStatuCode.BadRequest;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: AssetContext, execption: UnauthorizedExecption) {
        execption.status = CoapStatuCode.Unauthorized;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: AssetContext, execption: ForbiddenExecption) {
        execption.status = CoapStatuCode.Forbidden;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: AssetContext, execption: NotFoundExecption) {
        execption.status = CoapStatuCode.NotFound;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(MethodNotAllowedExecption)
    notAllowedExecption(ctx: AssetContext, execption: MethodNotAllowedExecption) {
        execption.status = CoapStatuCode.MethodNotAllowed;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(NotAcceptableExecption)
    notAcceptableExecption(ctx: AssetContext, execption: NotAcceptableExecption) {
        execption.status = CoapStatuCode.NotAcceptable;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(RequestTimeoutExecption)
    timeoutExecpotion(ctx: AssetContext, execption: NotAcceptableExecption) {
        execption.status = CoapStatuCode.NotFound;
       ctx.throwExecption(execption)
    }


    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: AssetContext, execption: UnsupportedMediaTypeExecption) {
        execption.status = CoapStatuCode.UnsupportedContentFormat;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: AssetContext, execption: InternalServerExecption) {
        execption.status = CoapStatuCode.InternalServerError;
       ctx.throwExecption(execption)
    }


    @ExecptionHandler(NotImplementedExecption)
    notImplementedError(ctx: AssetContext, execption: NotImplementedExecption) {
        execption.status = CoapStatuCode.NotImplemented;
       ctx.throwExecption(execption)
    }


    @ExecptionHandler(BadGatewayExecption)
    badGatewayError(ctx: AssetContext, execption: BadGatewayExecption) {
        execption.status = CoapStatuCode.BadGateway;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(ServiceUnavailableExecption)
    ServiceUnavailableError(ctx: AssetContext, execption: ServiceUnavailableExecption) {
        execption.status = CoapStatuCode.ServiceUnavailable;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(GatewayTimeoutExecption)
    gatewayTimeoutError(ctx: AssetContext, execption: GatewayTimeoutExecption) {
        execption.status = CoapStatuCode.GatewayTimeout;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(NotSupportedExecption)
    notSupportedError(ctx: AssetContext, execption: NotSupportedExecption) {
        execption.status = CoapStatuCode.BadGateway;
       ctx.throwExecption(execption)
    }


    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: AssetContext, err: ArgumentExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, '4.00');
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: AssetContext, err: MissingModelFieldExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, '4.00');
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: AssetContext, err: MissingParameterExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, '4.00');
       ctx.throwExecption(execption)
    }

    protected detailError(ctx: AssetContext): boolean {
        return ctx.get(SHOW_DETAIL_ERROR) == true
    }

}
