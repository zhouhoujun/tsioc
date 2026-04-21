import { ArgumentException, MissingParameterException } from '@tsdi/ioc';
import { InvalidJsonException, NotHandleException } from '@tsdi/core';
import { BadRequestException, ForbiddenException, InternalServerException, MethodNotAllowedException, NotAcceptableException, NotImplementedException, BadGatewayException, ServiceUnavailableException, GatewayTimeoutException, NotSupportedException, NotFoundException, UnauthorizedException, UnsupportedMediaTypeException } from '@tsdi/common';
import { MissingModelFieldException } from '@tsdi/repository';
import { AbstractRequestContext } from '../AbstractRequestContext';
export declare class HttpExceptionHandlers {
    constructor();
    badJsonException(ctx: AbstractRequestContext, execption: InvalidJsonException): void;
    notHanldeException(ctx: AbstractRequestContext, err: NotHandleException): void;
    badReqException(ctx: AbstractRequestContext, execption: BadRequestException): void;
    unauthorized(ctx: AbstractRequestContext, execption: UnauthorizedException): void;
    forbiddenException(ctx: AbstractRequestContext, execption: ForbiddenException): void;
    notFoundException(ctx: AbstractRequestContext, execption: NotFoundException): void;
    notAllowedException(ctx: AbstractRequestContext, execption: MethodNotAllowedException): void;
    notAcceptableException(ctx: AbstractRequestContext, execption: NotAcceptableException): void;
    timeoutExecpotion(ctx: AbstractRequestContext, execption: NotAcceptableException): void;
    unsupported(ctx: AbstractRequestContext, execption: UnsupportedMediaTypeException): void;
    internalServerError(ctx: AbstractRequestContext, execption: InternalServerException): void;
    notImplementedError(ctx: AbstractRequestContext, execption: NotImplementedException): void;
    badGatewayError(ctx: AbstractRequestContext, execption: BadGatewayException): void;
    ServiceUnavailableError(ctx: AbstractRequestContext, execption: ServiceUnavailableException): void;
    gatewayTimeoutError(ctx: AbstractRequestContext, execption: GatewayTimeoutException): void;
    notSupportedError(ctx: AbstractRequestContext, execption: NotSupportedException): void;
    anguException(ctx: AbstractRequestContext, err: ArgumentException): void;
    missFieldException(ctx: AbstractRequestContext, err: MissingModelFieldException): void;
    missException(ctx: AbstractRequestContext, err: MissingParameterException): void;
    protected detailError(ctx: AbstractRequestContext): boolean;
}
