import {
    BadRequestExecption, ExecptionHandler, ForbiddenExecption, InternalServerExecption,
    NotFoundExecption, UnauthorizedExecption, UnsupportedMediaTypeExecption, HttpStatusCode
} from '@tsdi/core';
import { ArgumentExecption, Injectable, MissingParameterExecption } from '@tsdi/ioc';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { ErrorRespondAdapter } from '@tsdi/transport';
import { HttpBadRequestError, HttpError, HttpForbiddenError, HttpInternalServerError, HttpNotFoundError, HttpUnauthorizedError } from '../errors';
import { HttpContext } from './context';
import { HTTP_SERV_OPTS } from './options';



@Injectable({ static: true })
export class HttpExecptionHandlers {

    constructor(private adpater: ErrorRespondAdapter) {

    }

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: HttpContext, execption: NotFoundExecption) {
        execption = new HttpNotFoundError(execption.message);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: HttpContext, execption: ForbiddenExecption) {
        execption = new HttpForbiddenError(execption.message);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: HttpContext, execption: BadRequestExecption) {
        execption = new HttpBadRequestError(execption.message);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: HttpContext, execption: UnauthorizedExecption) {
        execption = new HttpUnauthorizedError(execption.message);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: HttpContext, execption: InternalServerExecption) {
        execption = new HttpInternalServerError(execption.message);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: HttpContext, execption: UnsupportedMediaTypeExecption) {
        execption = new HttpError(HttpStatusCode.UnsupportedMediaType, execption.message);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: HttpContext, err: ArgumentExecption) {
        const execption = new HttpBadRequestError(ctx.get(HTTP_SERV_OPTS).detailError ? err.message : undefined);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: HttpContext, err: MissingModelFieldExecption) {
        const execption = new HttpBadRequestError(ctx.get(HTTP_SERV_OPTS).detailError ? err.message : undefined);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: HttpContext, err: MissingParameterExecption) {
        const execption = new HttpBadRequestError(ctx.get(HTTP_SERV_OPTS).detailError ? err.message : undefined);
        this.adpater.respond(ctx, execption)
    }

}
