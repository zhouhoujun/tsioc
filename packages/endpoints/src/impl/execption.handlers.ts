import { ArgumentException, Injectable, MissingParameterException, isNil } from '@tsdi/ioc';
import { ExceptionHandler, InvalidJsonException, NotHandleException } from '@tsdi/core';
import { HttpStatusCode } from '@tsdi/common';
import {
    BadRequestException, ForbiddenException, InternalServerException,
    MethodNotAllowedException, NotAcceptableException, NotImplementedException, BadGatewayException,
    ServiceUnavailableException, GatewayTimeoutException, NotSupportedException, RequestTimeoutException,
    NotFoundException, UnauthorizedException, UnsupportedMediaTypeException, MessageException
} from '@tsdi/common/transport';
import { MissingModelFieldException } from '@tsdi/repository';
import { RequestContext } from '../RequestContext';




@Injectable({ static: true })
export class HttpExceptionHandlers {

    constructor() { }


    @ExceptionHandler(InvalidJsonException)
    badJsonException(ctx: RequestContext, execption: InvalidJsonException) {
        let exp: MessageException;
        if (isNil(ctx.body)) {
            exp = new InternalServerException(execption.message, HttpStatusCode.InternalServerError);
        } else {
            exp = new BadRequestException(execption.message, HttpStatusCode.BadRequest);
        }
        ctx.throwException(exp)
    }

    @ExceptionHandler(NotHandleException)
    notHanldeException(ctx: RequestContext, err: NotHandleException) {
        const execption = new InternalServerException(this.detailError(ctx) ? err.message : undefined);
        ctx.throwException(execption)
    }
    

    @ExceptionHandler(BadRequestException)
    badReqException(ctx: RequestContext, execption: BadRequestException) {
        execption.status = HttpStatusCode.BadRequest;
        ctx.throwException(execption)
    }

    @ExceptionHandler(UnauthorizedException)
    unauthorized(ctx: RequestContext, execption: UnauthorizedException) {
        execption.status = HttpStatusCode.Unauthorized;
        ctx.throwException(execption)
    }

    @ExceptionHandler(ForbiddenException)
    forbiddenException(ctx: RequestContext, execption: ForbiddenException) {
        execption.status = HttpStatusCode.Forbidden;
        ctx.throwException(execption)
    }

    @ExceptionHandler(NotFoundException)
    notFoundException(ctx: RequestContext, execption: NotFoundException) {
        execption.status = HttpStatusCode.NotFound;
        ctx.throwException(execption)
    }

    @ExceptionHandler(MethodNotAllowedException)
    notAllowedException(ctx: RequestContext, execption: MethodNotAllowedException) {
        execption.status = HttpStatusCode.MethodNotAllowed;
        ctx.throwException(execption)
    }


    @ExceptionHandler(NotAcceptableException)
    notAcceptableException(ctx: RequestContext, execption: NotAcceptableException) {
        execption.status = HttpStatusCode.NotAcceptable;
        ctx.throwException(execption)
    }


    @ExceptionHandler(RequestTimeoutException)
    timeoutExecpotion(ctx: RequestContext, execption: NotAcceptableException) {
        execption.status = HttpStatusCode.RequestTimeout;
        ctx.throwException(execption)
    }


    @ExceptionHandler(UnsupportedMediaTypeException)
    unsupported(ctx: RequestContext, execption: UnsupportedMediaTypeException) {
        execption.status = HttpStatusCode.UnsupportedMediaType;
        ctx.throwException(execption)
    }


    @ExceptionHandler(InternalServerException)
    internalServerError(ctx: RequestContext, execption: InternalServerException) {
        execption.status = HttpStatusCode.InternalServerError;
        ctx.throwException(execption)
    }

    @ExceptionHandler(NotImplementedException)
    notImplementedError(ctx: RequestContext, execption: NotImplementedException) {
        execption.status = HttpStatusCode.NotImplemented;
        ctx.throwException(execption)
    }


    @ExceptionHandler(BadGatewayException)
    badGatewayError(ctx: RequestContext, execption: BadGatewayException) {
        execption.status = HttpStatusCode.BadGateway;
        ctx.throwException(execption)
    }

    @ExceptionHandler(ServiceUnavailableException)
    ServiceUnavailableError(ctx: RequestContext, execption: ServiceUnavailableException) {
        execption.status = HttpStatusCode.ServiceUnavailable;
        ctx.throwException(execption)
    }

    @ExceptionHandler(GatewayTimeoutException)
    gatewayTimeoutError(ctx: RequestContext, execption: GatewayTimeoutException) {
        execption.status = HttpStatusCode.GatewayTimeout;
        ctx.throwException(execption)
    }

    @ExceptionHandler(NotSupportedException)
    notSupportedError(ctx: RequestContext, execption: NotSupportedException) {
        execption.status = HttpStatusCode.BadGateway;
        ctx.throwException(execption)
    }


    @ExceptionHandler(ArgumentException)
    anguException(ctx: RequestContext, err: ArgumentException) {
        const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwException(execption)
    }

    @ExceptionHandler(MissingModelFieldException)
    missFieldException(ctx: RequestContext, err: MissingModelFieldException) {
        const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwException(execption)
    }

    @ExceptionHandler(MissingParameterException)
    missException(ctx: RequestContext, err: MissingParameterException) {
        const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwException(execption)
    }

    protected detailError(ctx: RequestContext): boolean {
        return ctx.serverOptions.detailError === true;
    }
}
