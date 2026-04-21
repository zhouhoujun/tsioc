import { Token } from '@tsdi/ioc';
import { VaildatorLike } from '@tsdi/core';
import { ConfigableRequestHandler, Incoming, Outgoing, RequestContext, RequestHandler, RequestHandlerOptions } from '@tsdi/common';
import { Router } from './router/router';
import { MiddlewareLike } from './middleware/middleware';
/**
 * service configable request handler
 */
export declare abstract class ServiceHandler<TReq = any, TRes = any, TContext extends RequestContext = RequestContext> extends ConfigableRequestHandler<TReq, TRes, TContext> implements RequestHandler<TReq, TRes, TContext> {
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
    requestVaildatorsToken?: Token<VaildatorLike<Incoming, TContext>[]>;
    responseVaildatorsToken?: Token<VaildatorLike<Outgoing, TContext>[]>;
    routerToken?: Token<Router>;
    middlewaresToken?: Token<MiddlewareLike[]>;
}
