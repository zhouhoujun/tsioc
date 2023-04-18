import {
    BadRequestExecption, ExecptionHandler, ForbiddenExecption, InternalServerExecption,
    NotFoundExecption, UnauthorizedExecption, UnsupportedMediaTypeExecption
} from '@tsdi/core';
import { ArgumentExecption, Injectable, MissingParameterExecption } from '@tsdi/ioc';
import { HttpStatusCode } from '@tsdi/common';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { HttpBadRequestError, HttpError, HttpForbiddenError, HttpInternalServerError, HttpNotFoundError, HttpUnauthorizedError } from '../errors';
import { HttpContext } from './context';
import { HTTP_SERVER_OPTS } from './options';



@Injectable({ static: true })
export class HttpExecptionHandlers {

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: HttpContext, execption: NotFoundExecption) {
        ctx.execption = new HttpNotFoundError(execption.message)
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: HttpContext, execption: ForbiddenExecption) {
        ctx.execption = new HttpForbiddenError(execption.message)
    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: HttpContext, execption: BadRequestExecption) {
        ctx.execption = new HttpBadRequestError(execption.message)
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: HttpContext, execption: UnauthorizedExecption) {
        ctx.execption = new HttpUnauthorizedError(execption.message)
    }

    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: HttpContext, execption: InternalServerExecption) {
        ctx.execption = new HttpInternalServerError(execption.message)
    }

    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: HttpContext, execption: UnsupportedMediaTypeExecption) {
        ctx.execption = new HttpError(HttpStatusCode.UnsupportedMediaType, execption.message)
    }

    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: HttpContext, execption: ArgumentExecption) {
        ctx.execption = new HttpBadRequestError(ctx.get(HTTP_SERVER_OPTS).detailError ? execption.message : undefined)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: HttpContext, execption: MissingModelFieldExecption) {
        ctx.execption = new HttpBadRequestError(ctx.get(HTTP_SERVER_OPTS).detailError ? execption.message : undefined)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: HttpContext, execption: MissingParameterExecption) {
        ctx.execption = new HttpBadRequestError(ctx.get(HTTP_SERVER_OPTS).detailError ? execption.message : undefined)
    }

}
