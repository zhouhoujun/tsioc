import {
    HttpStatusCode, BadRequestExecption, ForbiddenExecption, InternalServerExecption,
    MethodNotAllowedExecption, NotAcceptableExecption, NotImplementedExecption, BadGatewayExecption,
    ServiceUnavailableExecption, GatewayTimeoutExecption, NotSupportedExecption, RequestTimeoutExecption,
    NotFoundExecption, UnauthorizedExecption, UnsupportedMediaTypeExecption
} from '@tsdi/common';
import { ExecptionHandler } from '@tsdi/core';
import { Abstract, ArgumentExecption, MissingParameterExecption } from '@tsdi/ioc';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { ErrorRespondAdapter } from './error.respond';
import { AssetContext } from '../AssetContext';



@Abstract()
export abstract class TransportExecptionHandlers {

    constructor(private adpater: ErrorRespondAdapter) {

    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: AssetContext, execption: BadRequestExecption) {
        execption.status = HttpStatusCode.BadRequest;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: AssetContext, execption: UnauthorizedExecption) {
        execption.status = HttpStatusCode.Unauthorized;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: AssetContext, execption: ForbiddenExecption) {
        execption.status = HttpStatusCode.Forbidden;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: AssetContext, execption: NotFoundExecption) {
        execption.status = HttpStatusCode.NotFound;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(MethodNotAllowedExecption)
    notAllowedExecption(ctx: AssetContext, execption: MethodNotAllowedExecption) {
        execption.status = HttpStatusCode.MethodNotAllowed;
        this.adpater.respond(ctx, execption)
    }


    @ExecptionHandler(NotAcceptableExecption)
    notAcceptableExecption(ctx: AssetContext, execption: NotAcceptableExecption) {
        execption.status = HttpStatusCode.NotAcceptable;
        this.adpater.respond(ctx, execption)
    }


    @ExecptionHandler(RequestTimeoutExecption)
    timeoutExecpotion(ctx: AssetContext, execption: NotAcceptableExecption) {
        execption.status = HttpStatusCode.RequestTimeout;
        this.adpater.respond(ctx, execption)
    }


    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: AssetContext, execption: UnsupportedMediaTypeExecption) {
        execption.status = HttpStatusCode.UnsupportedMediaType;
        this.adpater.respond(ctx, execption)
    }


    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: AssetContext, execption: InternalServerExecption) {
        execption.status = HttpStatusCode.InternalServerError;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(NotImplementedExecption)
    notImplementedError(ctx: AssetContext, execption: NotImplementedExecption) {
        execption.status = HttpStatusCode.NotImplemented;
        this.adpater.respond(ctx, execption)
    }


    @ExecptionHandler(BadGatewayExecption)
    badGatewayError(ctx: AssetContext, execption: BadGatewayExecption) {
        execption.status = HttpStatusCode.BadGateway;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(ServiceUnavailableExecption)
    ServiceUnavailableError(ctx: AssetContext, execption: ServiceUnavailableExecption) {
        execption.status = HttpStatusCode.ServiceUnavailable;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(GatewayTimeoutExecption)
    gatewayTimeoutError(ctx: AssetContext, execption: GatewayTimeoutExecption) {
        execption.status = HttpStatusCode.GatewayTimeout;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(NotSupportedExecption)
    notSupportedError(ctx: AssetContext, execption: NotSupportedExecption) {
        execption.status = HttpStatusCode.BadGateway;
        this.adpater.respond(ctx, execption)
    }


    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: AssetContext, err: ArgumentExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: AssetContext, err: MissingModelFieldExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: AssetContext, err: MissingParameterExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        this.adpater.respond(ctx, execption)
    }


    protected abstract detailError(ctx: AssetContext): boolean;
}
