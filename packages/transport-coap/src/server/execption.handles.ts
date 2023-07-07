import {
    AssetContext, BadGatewayExecption, BadRequestExecption, ExecptionHandler, ForbiddenExecption,
    GatewayTimeoutExecption, InternalServerExecption, MethodNotAllowedExecption, NotAcceptableExecption,
    NotFoundExecption, NotImplementedExecption, NotSupportedExecption, RequestTimeoutExecption, ServiceUnavailableExecption,
    UnauthorizedExecption, UnsupportedMediaTypeExecption
} from '@tsdi/core';
import { ArgumentExecption, Injectable, MissingParameterExecption } from '@tsdi/ioc';
import { ErrorRespondAdapter } from '@tsdi/transport';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { COAP_SERV_OPTS } from './options';
import { CoapStatuCode } from '../status';


@Injectable({ static: true })
export class CoapExecptionHandlers {

    constructor(private adpater: ErrorRespondAdapter) {

    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: AssetContext, execption: BadRequestExecption) {
        execption.status = CoapStatuCode.BadRequest;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: AssetContext, execption: UnauthorizedExecption) {
        execption.status = CoapStatuCode.Unauthorized;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: AssetContext, execption: ForbiddenExecption) {
        execption.status = CoapStatuCode.Forbidden;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: AssetContext, execption: NotFoundExecption) {
        execption.status = CoapStatuCode.NotFound;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(MethodNotAllowedExecption)
    notAllowedExecption(ctx: AssetContext, execption: MethodNotAllowedExecption) {
        execption.status = CoapStatuCode.MethodNotAllowed;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(NotAcceptableExecption)
    notAcceptableExecption(ctx: AssetContext, execption: NotAcceptableExecption) {
        execption.status = CoapStatuCode.NotAcceptable;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(RequestTimeoutExecption)
    timeoutExecpotion(ctx: AssetContext, execption: NotAcceptableExecption) {
        execption.status = CoapStatuCode.NotFound;
        this.adpater.respond(ctx, execption)
    }


    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: AssetContext, execption: UnsupportedMediaTypeExecption) {
        execption.status = CoapStatuCode.UnsupportedContentFormat;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: AssetContext, execption: InternalServerExecption) {
        execption.status = CoapStatuCode.InternalServerError;
        this.adpater.respond(ctx, execption)
    }


    @ExecptionHandler(NotImplementedExecption)
    notImplementedError(ctx: AssetContext, execption: NotImplementedExecption) {
        execption.status = CoapStatuCode.NotImplemented;
        this.adpater.respond(ctx, execption)
    }


    @ExecptionHandler(BadGatewayExecption)
    badGatewayError(ctx: AssetContext, execption: BadGatewayExecption) {
        execption.status = CoapStatuCode.BadGateway;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(ServiceUnavailableExecption)
    ServiceUnavailableError(ctx: AssetContext, execption: ServiceUnavailableExecption) {
        execption.status = CoapStatuCode.ServiceUnavailable;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(GatewayTimeoutExecption)
    gatewayTimeoutError(ctx: AssetContext, execption: GatewayTimeoutExecption) {
        execption.status = CoapStatuCode.GatewayTimeout;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(NotSupportedExecption)
    notSupportedError(ctx: AssetContext, execption: NotSupportedExecption) {
        execption.status = CoapStatuCode.BadGateway;
        this.adpater.respond(ctx, execption)
    }


    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: AssetContext, err: ArgumentExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, '4.00');
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: AssetContext, err: MissingModelFieldExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, '4.00');
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: AssetContext, err: MissingParameterExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, '4.00');
        this.adpater.respond(ctx, execption)
    }

    protected detailError(ctx: AssetContext): boolean {
        return ctx.get(COAP_SERV_OPTS).detailError == true
    }

}
