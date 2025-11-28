import { ArgumentException, Injectable, MissingParameterException, isNil } from '@tsdi/ioc';
import { ExceptionHandler, InvalidJsonException, NotHandleException } from '@tsdi/core';
import {
    BadRequestException, InternalServerException, MessageException
} from '@tsdi/common';
import { MissingModelFieldException } from '@tsdi/repository';
import { AbstractRequestContext } from './AbstractRequestContext';





@Injectable({
    static: true
})
export class DefaultExceptionHandlers {

    constructor() { }


    @ExceptionHandler(InvalidJsonException)
    badJsonException(ctx: AbstractRequestContext, execption: InvalidJsonException) {
        let exp: MessageException;
        if (isNil(ctx.body)) {
            exp = new InternalServerException(execption.message);
        } else {
            exp = new BadRequestException(execption.message);
        }
        ctx.throwException(exp)
    }

    @ExceptionHandler(NotHandleException)
    notHanldeException(ctx: AbstractRequestContext, err: NotHandleException) {
        const execption = new InternalServerException(this.detailError(ctx) ? err.message : undefined);
        ctx.throwException(execption)
    }


    @ExceptionHandler(ArgumentException)
    anguException(ctx: AbstractRequestContext, err: ArgumentException) {
        const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined);
        ctx.throwException(execption)
    }

    @ExceptionHandler(MissingModelFieldException)
    missFieldException(ctx: AbstractRequestContext, err: MissingModelFieldException) {
        const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined);
        ctx.throwException(execption)
    }

    @ExceptionHandler(MissingParameterException)
    missException(ctx: AbstractRequestContext, err: MissingParameterException) {
        const execption = new BadRequestException(this.detailError(ctx) ? err.message : undefined);
        ctx.throwException(execption)
    }

    protected detailError(ctx: AbstractRequestContext): boolean {
        return ctx.serverOptions.detailError == true;
    }
}
