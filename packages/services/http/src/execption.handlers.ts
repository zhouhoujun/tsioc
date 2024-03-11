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
import { RequestContext } from '@tsdi/endpoints';


export const SHOW_DETAIL_ERROR = tokenId<boolean>('SHOW_DETAIL_ERROR');



@Injectable()
export class TransportExecptionHandlers {

    constructor() { }


    @ExecptionHandler(InvalidJsonException)
    badJsonExecption(ctx: RequestContext, execption: InvalidJsonException) {
        let exp: MessageExecption;
        if (isNil(ctx.body)) {
            exp = new InternalServerExecption(execption.message, HttpStatusCode.InternalServerError);
        } else {
            exp = new BadRequestExecption(execption.message, HttpStatusCode.BadRequest);
        }
        ctx.throwExecption(exp)
    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: RequestContext, execption: BadRequestExecption) {
        execption.status = HttpStatusCode.BadRequest;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: RequestContext, execption: UnauthorizedExecption) {
        execption.status = HttpStatusCode.Unauthorized;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: RequestContext, execption: ForbiddenExecption) {
        execption.status = HttpStatusCode.Forbidden;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: RequestContext, execption: NotFoundExecption) {
        execption.status = HttpStatusCode.NotFound;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(MethodNotAllowedExecption)
    notAllowedExecption(ctx: RequestContext, execption: MethodNotAllowedExecption) {
        execption.status = HttpStatusCode.MethodNotAllowed;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(NotAcceptableExecption)
    notAcceptableExecption(ctx: RequestContext, execption: NotAcceptableExecption) {
        execption.status = HttpStatusCode.NotAcceptable;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(RequestTimeoutExecption)
    timeoutExecpotion(ctx: RequestContext, execption: NotAcceptableExecption) {
        execption.status = HttpStatusCode.RequestTimeout;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: RequestContext, execption: UnsupportedMediaTypeExecption) {
        execption.status = HttpStatusCode.UnsupportedMediaType;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: RequestContext, execption: InternalServerExecption) {
        execption.status = HttpStatusCode.InternalServerError;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(NotImplementedExecption)
    notImplementedError(ctx: RequestContext, execption: NotImplementedExecption) {
        execption.status = HttpStatusCode.NotImplemented;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(BadGatewayExecption)
    badGatewayError(ctx: RequestContext, execption: BadGatewayExecption) {
        execption.status = HttpStatusCode.BadGateway;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(ServiceUnavailableExecption)
    ServiceUnavailableError(ctx: RequestContext, execption: ServiceUnavailableExecption) {
        execption.status = HttpStatusCode.ServiceUnavailable;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(GatewayTimeoutExecption)
    gatewayTimeoutError(ctx: RequestContext, execption: GatewayTimeoutExecption) {
        execption.status = HttpStatusCode.GatewayTimeout;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(NotSupportedExecption)
    notSupportedError(ctx: RequestContext, execption: NotSupportedExecption) {
        execption.status = HttpStatusCode.BadGateway;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: RequestContext, err: ArgumentExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: RequestContext, err: MissingModelFieldExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: RequestContext, err: MissingParameterExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwExecption(execption)
    }

    protected detailError(ctx: RequestContext): boolean {
        return ctx.get(SHOW_DETAIL_ERROR) === true;
    }
}
