import { ArgumentException, Injectable, MissingParameterException, isNil } from '@tsdi/ioc';
import { ExceptionHandler, InvalidJsonException, NotHandleException } from '@tsdi/core';
import {
    BadRequestException, ForbiddenException, InternalServerException, HttpStatusCode,
    MethodNotAllowedException, NotAcceptableException, NotImplementedException, BadGatewayException,
    ServiceUnavailableException, GatewayTimeoutException, NotSupportedException, RequestTimeoutException,
    NotFoundException, UnauthorizedException, UnsupportedMediaTypeException, MessageException
} from '@tsdi/common';
import { MissingModelFieldException } from '@tsdi/repository';
import { AbstractRequestContext } from '../AbstractRequestContext';




@Injectable({ static: true })
export class HttpExceptionHandlers {

    constructor() { }


    @ExceptionHandler(InvalidJsonException)
    badJsonException(ctx: AbstractRequestContext, execption: InvalidJsonException) {
        let exp: MessageException;
        if (isNil(ctx.body)) {
            exp = new InternalServerException(execption.message, HttpStatusCode.InternalServerError);
        } else {
            exp = new BadRequestException(execption.message, HttpStatusCode.BadRequest);
        }
        ctx.throwException(exp)
    }

    @ExceptionHandler(NotHandleException)
    notHanldeException(ctx: AbstractRequestContext, err: NotHandleException) {
        const execption = new InternalServerException(this.detailError(ctx) ? err.message : undefined);
        ctx.throwException(execption)
    }
    

    @ExceptionHandler(BadRequestException)
    badReqException(ctx: AbstractRequestContext, execption: BadRequestException) {
        execption.status = HttpStatusCode.BadRequest;
        ctx.throwException(execption)
    }

    @ExceptionHandler(UnauthorizedException)
    unauthorized(ctx: AbstractRequestContext, execption: UnauthorizedException) {
        execption.status = HttpStatusCode.Unauthorized;
        ctx.throwException(execption)
    }

    @ExceptionHandler(ForbiddenException)
    forbiddenException(ctx: AbstractRequestContext, execption: ForbiddenException) {
        execption.status = HttpStatusCode.Forbidden;
        ctx.throwException(execption)
    }

    @ExceptionHandler(NotFoundException)
    notFoundException(ctx: AbstractRequestContext, execption: NotFoundException) {
        execption.status = HttpStatusCode.NotFound;
        ctx.throwException(execption)
    }

    @ExceptionHandler(MethodNotAllowedException)
    notAllowedException(ctx: AbstractRequestContext, execption: MethodNotAllowedException) {
        execption.status = HttpStatusCode.MethodNotAllowed;
        ctx.throwException(execption)
    }


    @ExceptionHandler(NotAcceptableException)
    notAcceptableException(ctx: AbstractRequestContext, execption: NotAcceptableException) {
        execption.status = HttpStatusCode.NotAcceptable;
        ctx.throwException(execption)
    }


    @ExceptionHandler(RequestTimeoutException)
    timeoutExecpotion(ctx: AbstractRequestContext, execption: NotAcceptableException) {
        execption.status = HttpStatusCode.RequestTimeout;
        ctx.throwException(execption)
    }


    @ExceptionHandler(UnsupportedMediaTypeException)
    unsupported(ctx: AbstractRequestContext, execption: UnsupportedMediaTypeException) {
        execption.status = HttpStatusCode.UnsupportedMediaType;
        ctx.throwException(execption)
    }


    @ExceptionHandler(InternalServerException)
    internalServerError(ctx: AbstractRequestContext, execption: InternalServerException) {
        execption.status = HttpStatusCode.InternalServerError;
        ctx.throwException(execption)
    }

    @ExceptionHandler(NotImplementedException)
    notImplementedError(ctx: AbstractRequestContext, execption: NotImplementedException) {
        execption.status = HttpStatusCode.NotImplemented;
        ctx.throwException(execption)
    }


    @ExceptionHandler(BadGatewayException)
    badGatewayError(ctx: AbstractRequestContext, execption: BadGatewayException) {
        execption.status = HttpStatusCode.BadGateway;
        ctx.throwException(execption)
    }

    @ExceptionHandler(ServiceUnavailableException)
    ServiceUnavailableError(ctx: AbstractRequestContext, execption: ServiceUnavailableException) {
        execption.status = HttpStatusCode.ServiceUnavailable;
        ctx.throwException(execption)
    }

    @ExceptionHandler(GatewayTimeoutException)
    gatewayTimeoutError(ctx: AbstractRequestContext, execption: GatewayTimeoutException) {
        execption.status = HttpStatusCode.GatewayTimeout;
        ctx.throwException(execption)
    }

    @ExceptionHandler(NotSupportedException)
    notSupportedError(ctx: AbstractRequestContext, execption: NotSupportedException) {
        execption.status = HttpStatusCode.BadGateway;
        ctx.throwException(execption)
    }


    @ExceptionHandler(ArgumentException)
    anguException(ctx: AbstractRequestContext, err: ArgumentException) {
        const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwException(execption)
    }

    @ExceptionHandler(MissingModelFieldException)
    missFieldException(ctx: AbstractRequestContext, err: MissingModelFieldException) {
        const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwException(execption)
    }

    @ExceptionHandler(MissingParameterException)
    missException(ctx: AbstractRequestContext, err: MissingParameterException) {
        const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwException(execption)
    }

    protected detailError(ctx: AbstractRequestContext): boolean {
        return ctx.detailError === true;
    }
}
