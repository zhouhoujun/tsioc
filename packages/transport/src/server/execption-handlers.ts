import {
    BadRequestExecption, ExecptionHandler, ForbiddenExecption, InternalServerExecption, MessageExecption,
    NotFoundExecption, UnauthorizedExecption, UnsupportedMediaTypeExecption, HttpStatusCode, AssetContext
} from '@tsdi/core';
import { Abstract, ArgumentExecption, MissingParameterExecption } from '@tsdi/ioc';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { ErrorRespondAdapter } from './error.respond';




@Abstract()
export abstract class TransportExecptionHandlers {

    constructor(private adpater: ErrorRespondAdapter) {

    }

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: AssetContext, execption: NotFoundExecption) {
        execption.status = HttpStatusCode.NotFound;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: AssetContext, execption: ForbiddenExecption) {
        execption.status = HttpStatusCode.Forbidden;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: AssetContext, execption: BadRequestExecption) {
        execption.status = HttpStatusCode.BadRequest;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: AssetContext, execption: UnauthorizedExecption) {
        execption.status = HttpStatusCode.Unauthorized;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: AssetContext, execption: InternalServerExecption) {
        execption.status = HttpStatusCode.InternalServerError;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: AssetContext, execption: UnsupportedMediaTypeExecption) {
        execption = new MessageExecption(execption.message, HttpStatusCode.UnsupportedMediaType);
        this.adpater.respond(ctx, execption)
    }

    protected abstract detailError(ctx: AssetContext): boolean;

    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: AssetContext, err: ArgumentExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: AssetContext, err: MissingModelFieldExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: AssetContext, err: MissingParameterExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        this.adpater.respond(ctx, execption)
    }

}
