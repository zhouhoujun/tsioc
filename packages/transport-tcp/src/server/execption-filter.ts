import {
    BadRequestExecption, ExecptionHandler, ForbiddenExecption, InternalServerExecption, MessageExecption,
    NotFoundExecption, UnauthorizedExecption, UnsupportedMediaTypeExecption
} from '@tsdi/core';
import { ArgumentExecption, Injectable, MissingParameterExecption } from '@tsdi/ioc';
import { HttpStatusCode } from '@tsdi/common';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { ErrorRespondAdapter } from '@tsdi/transport';
import { TcpContext } from './context';
import { TCP_SERV_OPTS } from './options';



@Injectable({ static: true })
export class TcpExecptionHandlers {

    constructor(private adpater: ErrorRespondAdapter) {

    }

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: TcpContext, execption: NotFoundExecption) {
        execption.status = HttpStatusCode.NotFound;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: TcpContext, execption: ForbiddenExecption) {
        execption.status = HttpStatusCode.Forbidden;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: TcpContext, execption: BadRequestExecption) {
        execption.status = HttpStatusCode.BadRequest;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: TcpContext, execption: UnauthorizedExecption) {
        execption.status = HttpStatusCode.Unauthorized;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: TcpContext, execption: InternalServerExecption) {
        execption.status = HttpStatusCode.InternalServerError;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: TcpContext, execption: UnsupportedMediaTypeExecption) {
        execption = new MessageExecption(execption.message, HttpStatusCode.UnsupportedMediaType);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: TcpContext, err: ArgumentExecption) {
        const execption = new BadRequestExecption(ctx.get(TCP_SERV_OPTS).detailError ? err.message : undefined, HttpStatusCode.BadRequest);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: TcpContext, err: MissingModelFieldExecption) {
        const execption = new BadRequestExecption(ctx.get(TCP_SERV_OPTS).detailError ? err.message : undefined, HttpStatusCode.BadRequest);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: TcpContext, err: MissingParameterExecption) {
        const execption = new BadRequestExecption(ctx.get(TCP_SERV_OPTS).detailError ? err.message : undefined, HttpStatusCode.BadRequest);
        this.adpater.respond(ctx, execption)
    }

}
