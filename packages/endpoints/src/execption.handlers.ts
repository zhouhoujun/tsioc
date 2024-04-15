import { ArgumentExecption, Injectable, MissingParameterExecption, isNil, tokenId } from '@tsdi/ioc';
import { ExecptionHandler } from '@tsdi/core';
import { HttpStatusCode } from '@tsdi/common';
import {
    BadRequestExecption, InternalServerExecption, InvalidJsonException, MessageExecption
} from '@tsdi/common/transport';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { RequestContext } from '@tsdi/endpoints';




@Injectable()
export class DefaultExecptionHandlers {

    constructor() { }


    @ExecptionHandler(InvalidJsonException)
    badJsonExecption(ctx: RequestContext, execption: InvalidJsonException) {
        let exp: MessageExecption;
        if (isNil(ctx.body)) {
            exp = new InternalServerExecption(execption.message, HttpStatusCode.InternalServerError);
        } else {
            exp = new BadRequestExecption(execption.message, HttpStatusCode.BadRequest);
        }
        ctx.throwExecption(exp)
    }


    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: RequestContext, err: ArgumentExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: RequestContext, err: MissingModelFieldExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: RequestContext, err: MissingParameterExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined, HttpStatusCode.BadRequest);
        ctx.throwExecption(execption)
    }

    protected detailError(ctx: RequestContext): boolean {
        return ctx.serverOptions.detailError == true;
    }
}
