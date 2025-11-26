import { ArgumentException, Injectable, MissingParameterException, isNil } from '@tsdi/ioc';
import { ExceptionHandler, InvalidJsonException, NotHandleException } from '@tsdi/core';
import {
    BadRequestException, InternalServerException, MessageException
} from '@tsdi/common/transport';
import { MissingModelFieldException } from '@tsdi/repository';





@Injectable({
    static: true
})
export class DefaultExceptionHandlers {

    constructor() { }


    @ExceptionHandler(InvalidJsonException)
    badJsonException(ctx: RequestContext, execption: InvalidJsonException) {
        let exp: MessageException;
        if (isNil(ctx.body)) {
            exp = new InternalServerException(execption.message);
        } else {
            exp = new BadRequestException(execption.message);
        }
        ctx.throwException(exp)
    }

    @ExceptionHandler(NotHandleException)
    notHanldeException(ctx: RequestContext, err: NotHandleException) {
        const execption = new InternalServerException(this.detailError(ctx) ? err.message : undefined);
        ctx.throwException(execption)
    }


    @ExceptionHandler(ArgumentException)
    anguException(ctx: RequestContext, err: ArgumentException) {
        const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined);
        ctx.throwException(execption)
    }

    @ExceptionHandler(MissingModelFieldException)
    missFieldException(ctx: RequestContext, err: MissingModelFieldException) {
        const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined);
        ctx.throwException(execption)
    }

    @ExceptionHandler(MissingParameterException)
    missException(ctx: RequestContext, err: MissingParameterException) {
        const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined);
        ctx.throwException(execption)
    }

    protected detailError(ctx: RequestContext): boolean {
        return ctx.serverOptions.detailError == true;
    }
}
