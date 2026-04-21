import { ArgumentException, MissingParameterException } from '@tsdi/ioc';
import { InvalidJsonException, NotHandleException } from '@tsdi/core';
import { MissingModelFieldException } from '@tsdi/repository';
import { AbstractRequestContext } from '../AbstractRequestContext';
export declare class DefaultExceptionHandlers {
    constructor();
    badJsonException(ctx: AbstractRequestContext, execption: InvalidJsonException): void;
    notHanldeException(ctx: AbstractRequestContext, err: NotHandleException): void;
    anguException(ctx: AbstractRequestContext, err: ArgumentException): void;
    missFieldException(ctx: AbstractRequestContext, err: MissingModelFieldException): void;
    missException(ctx: AbstractRequestContext, err: MissingParameterException): void;
    protected detailError(ctx: AbstractRequestContext): boolean;
}
