import { Abstract, Token } from '@tsdi/ioc';
import { ConfigableRequestHandler, RequestContext, RequestHandler, RequestHandlerOptions } from '@tsdi/common';
import { Router } from './router/router';
import { MiddlewareLike } from './middleware/middleware';
import { Vaildator } from './vaildator';



/**
 * service configable request handler
 */
@Abstract()
export abstract class ServiceHandler<TReq = any, TRes = any, TContext extends RequestContext = RequestContext>
    extends ConfigableRequestHandler<TReq, TRes, TContext> implements RequestHandler<TReq, TRes, TContext> {

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
export interface ServiceHandlerOptions<TReq = any, TRes = any, TContext extends RequestContext = RequestContext> extends RequestHandlerOptions<TReq, TRes, TContext> {

    vaildatorsToken?: Token<Vaildator[]>;
    routerToken?: Token<Router>;
    middlewaresToken?: Token<MiddlewareLike[]>;
}
