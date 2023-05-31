import {
    BadRequestExecption, ExecptionHandler, ForbiddenExecption, InternalServerExecption, MessageExecption,
    NotFoundExecption, UnauthorizedExecption, UnsupportedMediaTypeExecption, HttpStatusCode
} from '@tsdi/core';
import { ArgumentExecption, Injectable, MissingParameterExecption } from '@tsdi/ioc';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { ErrorRespondAdapter } from '@tsdi/transport';
import { RedisContext } from './context';
import { REDIS_SERV_OPTS } from './options';



@Injectable({ static: true })
export class RedisExecptionHandlers {

    constructor(private adpater: ErrorRespondAdapter) {

    }

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: RedisContext, execption: NotFoundExecption) {
        execption.status = HttpStatusCode.NotFound;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: RedisContext, execption: ForbiddenExecption) {
        execption.status = HttpStatusCode.Forbidden;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: RedisContext, execption: BadRequestExecption) {
        execption.status = HttpStatusCode.BadRequest;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: RedisContext, execption: UnauthorizedExecption) {
        execption.status = HttpStatusCode.Unauthorized;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: RedisContext, execption: InternalServerExecption) {
        execption.status = HttpStatusCode.InternalServerError;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: RedisContext, execption: UnsupportedMediaTypeExecption) {
        execption = new MessageExecption(execption.message, HttpStatusCode.UnsupportedMediaType);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: RedisContext, err: ArgumentExecption) {
        const execption = new BadRequestExecption(ctx.get(REDIS_SERV_OPTS).detailError ? err.message : undefined, HttpStatusCode.BadRequest);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: RedisContext, err: MissingModelFieldExecption) {
        const execption = new BadRequestExecption(ctx.get(REDIS_SERV_OPTS).detailError ? err.message : undefined, HttpStatusCode.BadRequest);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: RedisContext, err: MissingParameterExecption) {
        const execption = new BadRequestExecption(ctx.get(REDIS_SERV_OPTS).detailError ? err.message : undefined, HttpStatusCode.BadRequest);
        this.adpater.respond(ctx, execption)
    }

}
