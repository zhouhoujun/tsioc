import { Abstract, Type, Token } from '@tsdi/ioc';
import { AbstractConfigableHandler, InvocationHandlerOptions } from '@tsdi/core';
import { RequestHandler } from '@tsdi/common';
import { RespondContext } from './context';
import { Router } from './router/router';



/**
 * configable request handler
 */
@Abstract()
export abstract class AbstractRequestHandler<TInput extends RespondContext = RespondContext, TOptions extends RequestHandlerOptions<TInput> = RequestHandlerOptions<TInput>>
    extends AbstractConfigableHandler<TInput, any, TOptions> implements RequestHandler<TInput> {

    /**
     * is this equals to target or not
     * @param target 
     */
    abstract equals?(target: any): boolean;
}



/**
 * Request handler options.
 * 
 * 传输节点配置
 */
export interface RequestHandlerOptions<T extends RespondContext = RespondContext> extends InvocationHandlerOptions<T> {
    classType?: Type<RequestHandler>;

    /**
     * backend of endpoint. defaut `Router`
     */
    backend?: Token<Router> | Router;
}
