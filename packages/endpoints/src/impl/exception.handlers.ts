import { ArgumentException, Injectable, MissingParameterException, isNil } from '@tsdi/ioc';
import { ExceptionHandler, InvalidJsonException, NotHandleException } from '@tsdi/core';
import {
    BadRequestException, ForbiddenException, InternalServerException, HttpStatusCode,
    MethodNotAllowedException, NotAcceptableException, NotImplementedException, BadGatewayException,
    ServiceUnavailableException, GatewayTimeoutException, NotSupportedException, RequestTimeoutException,
    NotFoundException, UnauthorizedException, UnsupportedMediaTypeException, MessageException
} from '@tsdi/common';
import { MissingModelFieldException } from '@tsdi/repository';
import { RespondContext } from '../context';




@Injectable({ static: true })
export class HttpExceptionHandlers {

    constructor() { }


    @ExceptionHandler(InvalidJsonException)
    badJsonException(ctx: RespondContext, execption: InvalidJsonException) {
        let exp: MessageException;
        if (isNil(ctx.body)) {
            exp = new InternalServerException(execption.message, HttpStatusCode.InternalServerError);
        } else {
            exp = new BadRequestException(execption.message, HttpStatusCode.BadRequest);
        }
        ctx.throwException(exp)
    }

    @ExceptionHandler(NotHandleException)
    notHanldeException(ctx: RespondContext, err: NotHandleException) {
        const execption = new InternalServerException(this.detailError(ctx) ? err.message : undefined);
        ctx.throwException(execption)
    }
    

    @ExceptionHandler(BadRequestException)
    badReqException(ctx: RespondContext, execption: BadRequestException) {
        execption.status = HttpStatusCode.BadRequest;
        ctx.throwException(execption)
    }

    @ExceptionHandler(UnauthorizedException)
    unauthorized(ctx: RespondContext, execption: UnauthorizedException) {
        execption.status = HttpStatusCode.Unauthorized;
        ctx.throwException(execption)
    }

    @ExceptionHandler(ForbiddenException)
    forbiddenException(ctx: RespondContext, execption: ForbiddenException) {
        execption.status = HttpStatusCode.Forbidden;
        ctx.throwException(execption)
    }

    @ExceptionHandler(NotFoundException)
    notFoundException(ctx: RespondContext, execption: NotFoundException) {
        execption.status = HttpStatusCode.NotFound;
        ctx.throwException(execption)
    }

    @ExceptionHandler(MethodNotAllowedException)
    notAllowedException(ctx: RespondContext, execption: MethodNotAllowedException) {
        execption.status = HttpStatusCode.MethodNotAllowed;
        ctx.throwException(execption)
    }


    @ExceptionHandler(NotAcceptableException)
    notAcceptableException(ctx: RespondContext, execption: NotAcceptableException) {
        execption.status = HttpStatusCode.NotAcceptable;
        ctx.throwException(execption)
    }


    @ExceptionHandler(RequestTimeoutException)
    timeoutExecpotion(ctx: RespondContext, execption: NotAcceptableException) {
        execption.status = HttpStatusCode.RequestTimeout;
        ctx.throwException(execption)
    }


    @ExceptionHandler(UnsupportedMediaTypeException)
    unsupported(ctx: RespondContext, execption: UnsupportedMediaTypeException) {
        execption.status = HttpStatusCode.UnsupportedMediaType;
        ctx.throwException(execption)
    }


    @ExceptionHandler(InternalServerException)
    internalServerError(ctx: RespondContext, execption: InternalServerException) {
        execption.status = HttpStatusCode.InternalServerError;
        ctx.throwException(execption)
    }

    @ExceptionHandler(NotImplementedException)
    notImplementedError(ctx: RespondContext, execption: NotImplementedException) {
        execption.status = HttpStatusCode.NotImplemented;
        ctx.throwException(execption)
    }


    @ExceptionHandler(BadGatewayException)
    badGatewayError(ctx: RespondContext, execption: BadGatewayException) {
        execption.status = HttpStatusCode.BadGateway;
        ctx.throwException(execption)
    }

    @ExceptionHandler(ServiceUnavailableException)
    ServiceUnavailableError(ctx: RespondContext, execption: ServiceUnavailableException) {
        execption.status = HttpStatusCode.ServiceUnavailable;
        ctx.throwException(execption)
    }

    @ExceptionHandler(GatewayTimeoutException)
    gatewayTimeoutError(ctx: RespondContext, execption: GatewayTimeoutException) {
        execption.status = HttpStatusCode.GatewayTimeout;
        ctx.throwException(execption)
    }

    @ExceptionHandler(NotSupportedException)
    notSupportedError(ctx: RespondContext, execption: NotSupportedException) {
        execption.status = HttpStatusCode.BadGateway;
        ctx.throwException(execption)
    }


    @ExceptionHandler(ArgumentException)
    anguException(ctx: RespondContext, err: ArgumentException) {
        const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwException(execption)
    }

    @ExceptionHandler(MissingModelFieldException)
    missFieldException(ctx: RespondContext, err: MissingModelFieldException) {
        const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwException(execption)
    }

    @ExceptionHandler(MissingParameterException)
    missException(ctx: RespondContext, err: MissingParameterException) {
        const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwException(execption)
    }

    protected detailError(ctx: RespondContext): boolean {
        return ctx.serverOptions.detailError === true;
    }
}
