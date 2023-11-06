import { ArgumentExecption, Injectable, MissingParameterExecption, isNil, tokenId } from '@tsdi/ioc';
import { ExecptionHandler } from '@tsdi/core';
import {
    HttpStatusCode, BadRequestExecption, ForbiddenExecption, InternalServerExecption,
    MethodNotAllowedExecption, NotAcceptableExecption, NotImplementedExecption, BadGatewayExecption,
    ServiceUnavailableExecption, GatewayTimeoutExecption, NotSupportedExecption, RequestTimeoutExecption,
    NotFoundExecption, UnauthorizedExecption, UnsupportedMediaTypeExecption, InvalidJsonException, MessageExecption
} from '@tsdi/common';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { TransportContext } from './TransportContext';


export const SHOW_DETAIL_ERROR = tokenId<boolean>('SHOW_DETAIL_ERROR');



@Injectable()
export class TransportExecptionHandlers {

    constructor() { }


    @ExecptionHandler(InvalidJsonException)
    badJsonExecption(ctx: TransportContext, execption: InvalidJsonException) {
        let exp: MessageExecption;
        if (isNil(ctx.body)) {
            exp = new InternalServerExecption(execption.message, HttpStatusCode.InternalServerError);
        } else {
            exp = new BadRequestExecption(execption.message, HttpStatusCode.BadRequest);
        }
        ctx.throwExecption(exp)
    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: TransportContext, execption: BadRequestExecption) {
        execption.status = HttpStatusCode.BadRequest;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: TransportContext, execption: UnauthorizedExecption) {
        execption.status = HttpStatusCode.Unauthorized;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: TransportContext, execption: ForbiddenExecption) {
        execption.status = HttpStatusCode.Forbidden;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: TransportContext, execption: NotFoundExecption) {
        execption.status = HttpStatusCode.NotFound;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(MethodNotAllowedExecption)
    notAllowedExecption(ctx: TransportContext, execption: MethodNotAllowedExecption) {
        execption.status = HttpStatusCode.MethodNotAllowed;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(NotAcceptableExecption)
    notAcceptableExecption(ctx: TransportContext, execption: NotAcceptableExecption) {
        execption.status = HttpStatusCode.NotAcceptable;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(RequestTimeoutExecption)
    timeoutExecpotion(ctx: TransportContext, execption: NotAcceptableExecption) {
        execption.status = HttpStatusCode.RequestTimeout;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: TransportContext, execption: UnsupportedMediaTypeExecption) {
        execption.status = HttpStatusCode.UnsupportedMediaType;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: TransportContext, execption: InternalServerExecption) {
        execption.status = HttpStatusCode.InternalServerError;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(NotImplementedExecption)
    notImplementedError(ctx: TransportContext, execption: NotImplementedExecption) {
        execption.status = HttpStatusCode.NotImplemented;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(BadGatewayExecption)
    badGatewayError(ctx: TransportContext, execption: BadGatewayExecption) {
        execption.status = HttpStatusCode.BadGateway;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(ServiceUnavailableExecption)
    ServiceUnavailableError(ctx: TransportContext, execption: ServiceUnavailableExecption) {
        execption.status = HttpStatusCode.ServiceUnavailable;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(GatewayTimeoutExecption)
    gatewayTimeoutError(ctx: TransportContext, execption: GatewayTimeoutExecption) {
        execption.status = HttpStatusCode.GatewayTimeout;
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(NotSupportedExecption)
    notSupportedError(ctx: TransportContext, execption: NotSupportedExecption) {
        execption.status = HttpStatusCode.BadGateway;
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: TransportContext, err: ArgumentExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: TransportContext, err: MissingModelFieldExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: TransportContext, err: MissingParameterExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwExecption(execption)
    }

    protected detailError(ctx: TransportContext): boolean {
        return ctx.get(SHOW_DETAIL_ERROR) === true;
    }
}
