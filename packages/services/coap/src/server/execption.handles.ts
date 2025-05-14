import { ArgumentException, Injectable, MissingParameterException } from '@tsdi/ioc';
import { ExceptionHandler } from '@tsdi/core';
import {
    BadGatewayException, BadRequestException, ForbiddenException, ServiceUnavailableException,
    GatewayTimeoutException, InternalServerException, MethodNotAllowedException, NotAcceptableException,
    NotFoundException, NotImplementedException, NotSupportedException, RequestTimeoutException,
    UnauthorizedException, UnsupportedMediaTypeException
} from '@tsdi/common/transport';
import { RequestContext } from '@tsdi/endpoints';
import { MissingModelFieldException } from '@tsdi/repository';
import { CoapStatuCode } from '../status';


@Injectable({ static: true })
export class CoapExceptionHandlers {

    constructor() {

    }

    @ExceptionHandler(BadRequestException)
    badReqException(ctx: RequestContext, execption: BadRequestException) {
        execption.status = CoapStatuCode.BadRequest;
        ctx.throwException(execption)
    }

    @ExceptionHandler(UnauthorizedException)
    unauthorized(ctx: RequestContext, execption: UnauthorizedException) {
        execption.status = CoapStatuCode.Unauthorized;
        ctx.throwException(execption)
    }

    @ExceptionHandler(ForbiddenException)
    forbiddenException(ctx: RequestContext, execption: ForbiddenException) {
        execption.status = CoapStatuCode.Forbidden;
        ctx.throwException(execption)
    }

    @ExceptionHandler(NotFoundException)
    notFoundException(ctx: RequestContext, execption: NotFoundException) {
        execption.status = CoapStatuCode.NotFound;
        ctx.throwException(execption)
    }

    @ExceptionHandler(MethodNotAllowedException)
    notAllowedException(ctx: RequestContext, execption: MethodNotAllowedException) {
        execption.status = CoapStatuCode.MethodNotAllowed;
        ctx.throwException(execption)
    }

    @ExceptionHandler(NotAcceptableException)
    notAcceptableException(ctx: RequestContext, execption: NotAcceptableException) {
        execption.status = CoapStatuCode.NotAcceptable;
        ctx.throwException(execption)
    }

    @ExceptionHandler(RequestTimeoutException)
    timeoutExecpotion(ctx: RequestContext, execption: NotAcceptableException) {
        execption.status = CoapStatuCode.NotFound;
        ctx.throwException(execption)
    }


    @ExceptionHandler(UnsupportedMediaTypeException)
    unsupported(ctx: RequestContext, execption: UnsupportedMediaTypeException) {
        execption.status = CoapStatuCode.UnsupportedContentFormat;
        ctx.throwException(execption)
    }

    @ExceptionHandler(InternalServerException)
    internalServerError(ctx: RequestContext, execption: InternalServerException) {
        execption.status = CoapStatuCode.InternalServerError;
        ctx.throwException(execption)
    }


    @ExceptionHandler(NotImplementedException)
    notImplementedError(ctx: RequestContext, execption: NotImplementedException) {
        execption.status = CoapStatuCode.NotImplemented;
        ctx.throwException(execption)
    }


    @ExceptionHandler(BadGatewayException)
    badGatewayError(ctx: RequestContext, execption: BadGatewayException) {
        execption.status = CoapStatuCode.BadGateway;
        ctx.throwException(execption)
    }

    @ExceptionHandler(ServiceUnavailableException)
    ServiceUnavailableError(ctx: RequestContext, execption: ServiceUnavailableException) {
        execption.status = CoapStatuCode.ServiceUnavailable;
        ctx.throwException(execption)
    }

    @ExceptionHandler(GatewayTimeoutException)
    gatewayTimeoutError(ctx: RequestContext, execption: GatewayTimeoutException) {
        execption.status = CoapStatuCode.GatewayTimeout;
        ctx.throwException(execption)
    }

    @ExceptionHandler(NotSupportedException)
    notSupportedError(ctx: RequestContext, execption: NotSupportedException) {
        execption.status = CoapStatuCode.BadGateway;
        ctx.throwException(execption)
    }


    @ExceptionHandler(ArgumentException)
    anguException(ctx: RequestContext, err: ArgumentException) {
        const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined, '4.00');
        ctx.throwException(execption)
    }

    @ExceptionHandler(MissingModelFieldException)
    missFieldException(ctx: RequestContext, err: MissingModelFieldException) {
        const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined, '4.00');
        ctx.throwException(execption)
    }

    @ExceptionHandler(MissingParameterException)
    missException(ctx: RequestContext, err: MissingParameterException) {
        const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined, '4.00');
        ctx.throwException(execption)
    }

    protected detailError(ctx: RequestContext): boolean {
        return ctx.serverOptions.detailError == true
    }

}
