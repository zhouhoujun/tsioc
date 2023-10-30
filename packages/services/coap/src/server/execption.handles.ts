
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

    constructor(private responer: Responder) {

    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: AssetContext, execption: BadRequestExecption) {
        execption.status = CoapStatuCode.BadRequest;
        this.responer.sendExecption(ctx, execption)
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: AssetContext, execption: UnauthorizedExecption) {
        execption.status = CoapStatuCode.Unauthorized;
        this.responer.sendExecption(ctx, execption)
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: AssetContext, execption: ForbiddenExecption) {
        execption.status = CoapStatuCode.Forbidden;
        this.responer.sendExecption(ctx, execption)
    }

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: AssetContext, execption: NotFoundExecption) {
        execption.status = CoapStatuCode.NotFound;
        this.responer.sendExecption(ctx, execption)
    }

    @ExecptionHandler(MethodNotAllowedExecption)
    notAllowedExecption(ctx: AssetContext, execption: MethodNotAllowedExecption) {
        execption.status = CoapStatuCode.MethodNotAllowed;
        this.responer.sendExecption(ctx, execption)
    }

    @ExecptionHandler(NotAcceptableExecption)
    notAcceptableExecption(ctx: AssetContext, execption: NotAcceptableExecption) {
        execption.status = CoapStatuCode.NotAcceptable;
        this.responer.sendExecption(ctx, execption)
    }

    @ExecptionHandler(RequestTimeoutExecption)
    timeoutExecpotion(ctx: AssetContext, execption: NotAcceptableExecption) {
        execption.status = CoapStatuCode.NotFound;
        this.responer.sendExecption(ctx, execption)
    }


    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: AssetContext, execption: UnsupportedMediaTypeExecption) {
        execption.status = CoapStatuCode.UnsupportedContentFormat;
        this.responer.sendExecption(ctx, execption)
    }

    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: AssetContext, execption: InternalServerExecption) {
        execption.status = CoapStatuCode.InternalServerError;
        this.responer.sendExecption(ctx, execption)
    }


    @ExecptionHandler(NotImplementedExecption)
    notImplementedError(ctx: AssetContext, execption: NotImplementedExecption) {
        execption.status = CoapStatuCode.NotImplemented;
        this.responer.sendExecption(ctx, execption)
    }


    @ExecptionHandler(BadGatewayExecption)
    badGatewayError(ctx: AssetContext, execption: BadGatewayExecption) {
        execption.status = CoapStatuCode.BadGateway;
        this.responer.sendExecption(ctx, execption)
    }

    @ExecptionHandler(ServiceUnavailableExecption)
    ServiceUnavailableError(ctx: AssetContext, execption: ServiceUnavailableExecption) {
        execption.status = CoapStatuCode.ServiceUnavailable;
        this.responer.sendExecption(ctx, execption)
    }

    @ExecptionHandler(GatewayTimeoutExecption)
    gatewayTimeoutError(ctx: AssetContext, execption: GatewayTimeoutExecption) {
        execption.status = CoapStatuCode.GatewayTimeout;
        this.responer.sendExecption(ctx, execption)
    }

    @ExecptionHandler(NotSupportedExecption)
    notSupportedError(ctx: AssetContext, execption: NotSupportedExecption) {
        execption.status = CoapStatuCode.BadGateway;
        this.responer.sendExecption(ctx, execption)
    }


    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: AssetContext, err: ArgumentExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, '4.00');
        this.responer.sendExecption(ctx, execption)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: AssetContext, err: MissingModelFieldExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, '4.00');
        this.responer.sendExecption(ctx, execption)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: AssetContext, err: MissingParameterExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, '4.00');
        this.responer.sendExecption(ctx, execption)
    }

    protected detailError(ctx: AssetContext): boolean {
        return ctx.get(SHOW_DETAIL_ERROR) == true
    }

}
