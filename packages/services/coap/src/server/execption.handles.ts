
import {
    BadGatewayExecption, BadRequestExecption, ForbiddenExecption, ServiceUnavailableExecption,
    GatewayTimeoutExecption, InternalServerExecption, MethodNotAllowedExecption, NotAcceptableExecption,
    NotFoundExecption, NotImplementedExecption, NotSupportedExecption, RequestTimeoutExecption,
    UnauthorizedExecption, UnsupportedMediaTypeExecption
} from '@tsdi/common';
import { ArgumentExecption, Injectable, MissingParameterExecption } from '@tsdi/ioc';
import { ExecptionHandler } from '@tsdi/core';
import { TransportContext, SHOW_DETAIL_ERROR } from '@tsdi/endpoints';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { CoapStatuCode } from '../status';


@Injectable({ static: true })
export class CoapExecptionHandlers {

    constructor() {

    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: TransportContext, execption: BadRequestExecption) {
        execption.status = CoapStatuCode.BadRequest;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: TransportContext, execption: UnauthorizedExecption) {
        execption.status = CoapStatuCode.Unauthorized;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: TransportContext, execption: ForbiddenExecption) {
        execption.status = CoapStatuCode.Forbidden;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: TransportContext, execption: NotFoundExecption) {
        execption.status = CoapStatuCode.NotFound;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(MethodNotAllowedExecption)
    notAllowedExecption(ctx: TransportContext, execption: MethodNotAllowedExecption) {
        execption.status = CoapStatuCode.MethodNotAllowed;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(NotAcceptableExecption)
    notAcceptableExecption(ctx: TransportContext, execption: NotAcceptableExecption) {
        execption.status = CoapStatuCode.NotAcceptable;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(RequestTimeoutExecption)
    timeoutExecpotion(ctx: TransportContext, execption: NotAcceptableExecption) {
        execption.status = CoapStatuCode.NotFound;
       ctx.throwExecption(execption)
    }


    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: TransportContext, execption: UnsupportedMediaTypeExecption) {
        execption.status = CoapStatuCode.UnsupportedContentFormat;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: TransportContext, execption: InternalServerExecption) {
        execption.status = CoapStatuCode.InternalServerError;
       ctx.throwExecption(execption)
    }


    @ExecptionHandler(NotImplementedExecption)
    notImplementedError(ctx: TransportContext, execption: NotImplementedExecption) {
        execption.status = CoapStatuCode.NotImplemented;
       ctx.throwExecption(execption)
    }


    @ExecptionHandler(BadGatewayExecption)
    badGatewayError(ctx: TransportContext, execption: BadGatewayExecption) {
        execption.status = CoapStatuCode.BadGateway;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(ServiceUnavailableExecption)
    ServiceUnavailableError(ctx: TransportContext, execption: ServiceUnavailableExecption) {
        execption.status = CoapStatuCode.ServiceUnavailable;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(GatewayTimeoutExecption)
    gatewayTimeoutError(ctx: TransportContext, execption: GatewayTimeoutExecption) {
        execption.status = CoapStatuCode.GatewayTimeout;
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(NotSupportedExecption)
    notSupportedError(ctx: TransportContext, execption: NotSupportedExecption) {
        execption.status = CoapStatuCode.BadGateway;
       ctx.throwExecption(execption)
    }


    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: TransportContext, err: ArgumentExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, '4.00');
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: TransportContext, err: MissingModelFieldExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, '4.00');
       ctx.throwExecption(execption)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: TransportContext, err: MissingParameterExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, '4.00');
       ctx.throwExecption(execption)
    }

    protected detailError(ctx: TransportContext): boolean {
        return ctx.get(SHOW_DETAIL_ERROR) == true
    }

}
