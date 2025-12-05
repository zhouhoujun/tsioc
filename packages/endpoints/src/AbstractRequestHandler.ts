import { Abstract, Type, Token } from '@tsdi/ioc';
import { InvocationHandlerOptions } from '@tsdi/core';
import { ConfigableRequestHandler, RequestHandler } from '@tsdi/common';
import { AbstractRequestContext } from './AbstractRequestContext';
import { Router } from './router/router';



/**
 * configable request handler
 */
@Abstract()
export abstract class AbstractRequestHandler<TInput extends AbstractRequestContext = AbstractRequestContext>
    extends ConfigableRequestHandler<TInput, any> implements RequestHandler<TInput> {

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
export interface RequestHandlerOptions<T extends AbstractRequestContext = AbstractRequestContext> extends InvocationHandlerOptions<T> {
    classType?: Type<RequestHandler>;

    /**
     * backend of endpoint. defaut `Router`
     */
    backend?: Token<Router> | Router;
}
