import { Abstract, Token } from '@tsdi/ioc';
import { AbstractConfigableHandler, InvocationOptions } from '@tsdi/core';
import { RequestContext } from './RequestContext';
import { Router } from './router/router';
import { RequestHandler } from './RequestHandler';



/**
 * configable request handler
 */
@Abstract()
export abstract class AbstractRequestHandler<TInput extends RequestContext = RequestContext, TOptions extends RequestHandlerOptions<TInput> = RequestHandlerOptions<TInput>>
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
export interface RequestHandlerOptions<T extends RequestContext = RequestContext, TArg = any> extends InvocationOptions<T, TArg> {

    /**
     * backend of endpoint. defaut `Router`
     */
    backend?: Token<Router> | Router;
}
