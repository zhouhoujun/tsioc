import { Abstract, Type } from '@tsdi/ioc';
import { ConfigableRequestHandler, RequestContext, RequestHandler, RequestHandlerOptions } from '@tsdi/common';
import { AbstractRequestContext } from './AbstractRequestContext';
// import { Router } from './router/router';



/**
 * service configable request handler
 */
@Abstract()
export abstract class ServiceHandler<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext>
    extends ConfigableRequestHandler<TInput, TOutput, TContext> implements RequestHandler<TInput, TOutput, TContext> {

    /**
     * is this equals to target or not
     * @param target 
     */
    abstract equals?(target: any): boolean;
}



/**
 * Service configable Request handler options.
 * 
 * 传输节点配置
 */
export interface ServiceHandlerOptions<T extends AbstractRequestContext = AbstractRequestContext> extends RequestHandlerOptions<T> {
    classType?: Type<RequestHandler>;

    // /**
    //  * backend of endpoint. defaut `Router`
    //  */
    // backend?: Token<Router> | Router;
}
