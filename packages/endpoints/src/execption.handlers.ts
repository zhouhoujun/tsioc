import { ArgumentExecption, Injectable, MissingParameterExecption, isNil } from '@tsdi/ioc';
import { ExecptionHandler, InvalidJsonException, NotHandleExecption } from '@tsdi/core';
import {
    BadRequestExecption, InternalServerExecption, MessageExecption
} from '@tsdi/common/transport';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { RequestContext } from './RequestContext';





@Injectable({
    static: true
})
export class DefaultExecptionHandlers {

    constructor() { }


    @ExecptionHandler(InvalidJsonException)
    badJsonExecption(ctx: RequestContext, execption: InvalidJsonException) {
        let exp: MessageExecption;
        if (isNil(ctx.body)) {
            exp = new InternalServerExecption(execption.message);
        } else {
            exp = new BadRequestExecption(execption.message);
        }
        ctx.throwExecption(exp)
    }

    @ExecptionHandler(NotHandleExecption)
    notHanldeExecption(ctx: RequestContext, err: NotHandleExecption) {
        const execption = new InternalServerExecption(this.detailError(ctx) ? err.message : undefined);
        ctx.throwExecption(execption)
    }


    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: RequestContext, err: ArgumentExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined);
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: RequestContext, err: MissingModelFieldExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined);
        ctx.throwExecption(execption)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: RequestContext, err: MissingParameterExecption) {
        const execption = new BadRequestExecption(this.detailError(ctx) ? err.message : undefined);
        ctx.throwExecption(execption)
    }

    protected detailError(ctx: RequestContext): boolean {
        return ctx.serverOptions.detailError == true;
    }
}
