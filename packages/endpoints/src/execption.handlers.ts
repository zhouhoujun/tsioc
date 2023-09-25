import { Abstract, ArgumentExecption, Injectable, MissingParameterExecption, tokenId } from '@tsdi/ioc';
import { ExecptionHandler } from '@tsdi/core';
import {
    HttpStatusCode, BadRequestExecption, ForbiddenExecption, InternalServerExecption,
    MethodNotAllowedExecption, NotAcceptableExecption, NotImplementedExecption, BadGatewayExecption,
    ServiceUnavailableExecption, GatewayTimeoutExecption, NotSupportedExecption, RequestTimeoutExecption,
    NotFoundExecption, UnauthorizedExecption, UnsupportedMediaTypeExecption
} from '@tsdi/common';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { Responder } from './Responder';
import { TransportContext } from './TransportContext';


export const SHOW_DETAIL_ERROR = tokenId<boolean>('SHOW_DETAIL_ERROR');



@Injectable()
export class TransportExecptionHandlers {

    constructor() {}

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: TransportContext, execption: BadRequestExecption) {
        execption.status = HttpStatusCode.BadRequest;
        ctx.get(Responder).sendExecption(ctx, execption)
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: TransportContext, execption: UnauthorizedExecption) {
        execption.status = HttpStatusCode.Unauthorized;
        ctx.get(Responder).sendExecption(ctx, execption)
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: TransportContext, execption: ForbiddenExecption) {
        execption.status = HttpStatusCode.Forbidden;
        ctx.get(Responder).sendExecption(ctx, execption)
    }

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: TransportContext, execption: NotFoundExecption) {
        execption.status = HttpStatusCode.NotFound;
        ctx.get(Responder).sendExecption(ctx, execption)
    }

    @ExecptionHandler(MethodNotAllowedExecption)
    notAllowedExecption(ctx: TransportContext, execption: MethodNotAllowedExecption) {
        execption.status = HttpStatusCode.MethodNotAllowed;
        ctx.get(Responder).sendExecption(ctx, execption)
    }


    @ExecptionHandler(NotAcceptableExecption)
    notAcceptableExecption(ctx: TransportContext, execption: NotAcceptableExecption) {
        execption.status = HttpStatusCode.NotAcceptable;
        ctx.get(Responder).sendExecption(ctx, execption)
    }


    @ExecptionHandler(RequestTimeoutExecption)
    timeoutExecpotion(ctx: TransportContext, execption: NotAcceptableExecption) {
        execption.status = HttpStatusCode.RequestTimeout;
        ctx.get(Responder).sendExecption(ctx, execption)
    }


    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: TransportContext, execption: UnsupportedMediaTypeExecption) {
        execption.status = HttpStatusCode.UnsupportedMediaType;
        ctx.get(Responder).sendExecption(ctx, execption)
    }


    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: TransportContext, execption: InternalServerExecption) {
        execption.status = HttpStatusCode.InternalServerError;
        ctx.get(Responder).sendExecption(ctx, execption)
    }

    @ExecptionHandler(NotImplementedExecption)
    notImplementedError(ctx: TransportContext, execption: NotImplementedExecption) {
        execption.status = HttpStatusCode.NotImplemented;
        ctx.get(Responder).sendExecption(ctx, execption)
    }


    @ExecptionHandler(BadGatewayExecption)
    badGatewayError(ctx: TransportContext, execption: BadGatewayExecption) {
        execption.status = HttpStatusCode.BadGateway;
        ctx.get(Responder).sendExecption(ctx, execption)
    }

    @ExecptionHandler(ServiceUnavailableExecption)
    ServiceUnavailableError(ctx: TransportContext, execption: ServiceUnavailableExecption) {
        execption.status = HttpStatusCode.ServiceUnavailable;
        ctx.get(Responder).sendExecption(ctx, execption)
    }

    @ExecptionHandler(GatewayTimeoutExecption)
    gatewayTimeoutError(ctx: TransportContext, execption: GatewayTimeoutExecption) {
        execption.status = HttpStatusCode.GatewayTimeout;
        ctx.get(Responder).sendExecption(ctx, execption)
    }

    @ExecptionHandler(NotSupportedExecption)
    notSupportedError(ctx: TransportContext, execption: NotSupportedExecption) {
        execption.status = HttpStatusCode.BadGateway;
        ctx.get(Responder).sendExecption(ctx, execption)
    }


    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: TransportContext, err: ArgumentExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.get(Responder).sendExecption(ctx, execption)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: TransportContext, err: MissingModelFieldExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.get(Responder).sendExecption(ctx, execption)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: TransportContext, err: MissingParameterExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.get(Responder).sendExecption(ctx, execption)
    }

    protected detailError(ctx: TransportContext): boolean {
        return ctx.get(SHOW_DETAIL_ERROR) === true;
    }
}
