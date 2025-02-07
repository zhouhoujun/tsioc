import { Abstract, ClassType, ProvdierOf, Token } from '@tsdi/ioc';
import { AbstractConfigableHandler, InvocationOptions } from '@tsdi/core';
import { RequestContext } from './RequestContext';
import { Router } from './router/router';
import { RequestHandler } from './RequestHandler';
import { MiddlewareLike, MiddlewareOpts } from './middleware/middleware';



/**
 * configable request handler
 */
@Abstract()
export abstract class AbstractRequestHandler<TInput extends RequestContext = RequestContext, TOptions extends RequestHandlerOptions<TInput> = RequestHandlerOptions<TInput>>
    extends AbstractConfigableHandler<TInput, any, TOptions> implements RequestHandler<TInput> {

    abstract use(middlewares: ProvdierOf<MiddlewareLike<TInput>> | ProvdierOf<MiddlewareLike<TInput>>[], order?: number): this;
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
export interface RequestHandlerOptions<T extends RequestContext = RequestContext, TArg = any> extends InvocationOptions<T, TArg>, MiddlewareOpts {
    classType?: ClassType<RequestHandler>;

    /**
     * backend of endpoint. defaut `Router`
     */
    backend?: Token<Router> | Router;
}
