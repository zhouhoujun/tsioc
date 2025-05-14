// import { ArgumentException, Injectable, MissingParameterException, isNil } from '@tsdi/ioc';
// import { ExceptionHandler, InvalidJsonException, NotHandleException } from '@tsdi/core';
// import { HttpStatusCode } from '@tsdi/common';
// import {
//     BadRequestException, ForbiddenException, InternalServerException,
//     MethodNotAllowedException, NotAcceptableException, NotImplementedException, BadGatewayException,
//     ServiceUnavailableException, GatewayTimeoutException, NotSupportedException, RequestTimeoutException,
//     NotFoundException, UnauthorizedException, UnsupportedMediaTypeException, MessageException
// } from '@tsdi/common/transport';
// import { MissingModelFieldException } from '@tsdi/repository';
// import { HttpContext } from './server/context';




// @Injectable({ static: true })
// export class HttpExceptionHandlers {

//     constructor() { }


//     @ExceptionHandler(InvalidJsonException)
//     badJsonException(ctx: HttpContext, execption: InvalidJsonException) {
//         let exp: MessageException;
//         if (isNil(ctx.body)) {
//             exp = new InternalServerException(execption.message, HttpStatusCode.InternalServerError);
//         } else {
//             exp = new BadRequestException(execption.message, HttpStatusCode.BadRequest);
//         }
//         ctx.throwException(exp)
//     }

//     @ExceptionHandler(NotHandleException)
//     notHanldeException(ctx: HttpContext, err: NotHandleException) {
//         const execption = new InternalServerException(this.detailError(ctx) ? err.message : undefined);
//         ctx.throwException(execption)
//     }
    

//     @ExceptionHandler(BadRequestException)
//     badReqException(ctx: HttpContext, execption: BadRequestException) {
//         execption.status = HttpStatusCode.BadRequest;
//         ctx.throwException(execption)
//     }

//     @ExceptionHandler(UnauthorizedException)
//     unauthorized(ctx: HttpContext, execption: UnauthorizedException) {
//         execption.status = HttpStatusCode.Unauthorized;
//         ctx.throwException(execption)
//     }

//     @ExceptionHandler(ForbiddenException)
//     forbiddenException(ctx: HttpContext, execption: ForbiddenException) {
//         execption.status = HttpStatusCode.Forbidden;
//         ctx.throwException(execption)
//     }

//     @ExceptionHandler(NotFoundException)
//     notFoundException(ctx: HttpContext, execption: NotFoundException) {
//         execption.status = HttpStatusCode.NotFound;
//         ctx.throwException(execption)
//     }

//     @ExceptionHandler(MethodNotAllowedException)
//     notAllowedException(ctx: HttpContext, execption: MethodNotAllowedException) {
//         execption.status = HttpStatusCode.MethodNotAllowed;
//         ctx.throwException(execption)
//     }


//     @ExceptionHandler(NotAcceptableException)
//     notAcceptableException(ctx: HttpContext, execption: NotAcceptableException) {
//         execption.status = HttpStatusCode.NotAcceptable;
//         ctx.throwException(execption)
//     }


//     @ExceptionHandler(RequestTimeoutException)
//     timeoutExecpotion(ctx: HttpContext, execption: NotAcceptableException) {
//         execption.status = HttpStatusCode.RequestTimeout;
//         ctx.throwException(execption)
//     }


//     @ExceptionHandler(UnsupportedMediaTypeException)
//     unsupported(ctx: HttpContext, execption: UnsupportedMediaTypeException) {
//         execption.status = HttpStatusCode.UnsupportedMediaType;
//         ctx.throwException(execption)
//     }


//     @ExceptionHandler(InternalServerException)
//     internalServerError(ctx: HttpContext, execption: InternalServerException) {
//         execption.status = HttpStatusCode.InternalServerError;
//         ctx.throwException(execption)
//     }

//     @ExceptionHandler(NotImplementedException)
//     notImplementedError(ctx: HttpContext, execption: NotImplementedException) {
//         execption.status = HttpStatusCode.NotImplemented;
//         ctx.throwException(execption)
//     }


//     @ExceptionHandler(BadGatewayException)
//     badGatewayError(ctx: HttpContext, execption: BadGatewayException) {
//         execption.status = HttpStatusCode.BadGateway;
//         ctx.throwException(execption)
//     }

//     @ExceptionHandler(ServiceUnavailableException)
//     ServiceUnavailableError(ctx: HttpContext, execption: ServiceUnavailableException) {
//         execption.status = HttpStatusCode.ServiceUnavailable;
//         ctx.throwException(execption)
//     }

//     @ExceptionHandler(GatewayTimeoutException)
//     gatewayTimeoutError(ctx: HttpContext, execption: GatewayTimeoutException) {
//         execption.status = HttpStatusCode.GatewayTimeout;
//         ctx.throwException(execption)
//     }

//     @ExceptionHandler(NotSupportedException)
//     notSupportedError(ctx: HttpContext, execption: NotSupportedException) {
//         execption.status = HttpStatusCode.BadGateway;
//         ctx.throwException(execption)
//     }


//     @ExceptionHandler(ArgumentException)
//     anguException(ctx: HttpContext, err: ArgumentException) {
//         const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
//         ctx.throwException(execption)
//     }

//     @ExceptionHandler(MissingModelFieldException)
//     missFieldException(ctx: HttpContext, err: MissingModelFieldException) {
//         const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
//         ctx.throwException(execption)
//     }

//     @ExceptionHandler(MissingParameterException)
//     missException(ctx: HttpContext, err: MissingParameterException) {
//         const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
//         ctx.throwException(execption)
//     }

//     protected detailError(ctx: HttpContext): boolean {
//         return ctx.serverOptions.detailError === true;
//     }
// }
