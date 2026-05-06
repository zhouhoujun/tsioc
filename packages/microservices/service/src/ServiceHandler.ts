import { Abstract, ProvdierOf, Token } from '@tsdi/ioc';
import { VaildatorLike } from '@tsdi/core';
import { ConfigableRequestHandler, Incoming, Outgoing, RequestContext, RequestHandler, RequestHandlerOptions } from '@tsdi/common';
import { Router } from './router/router';
import { MiddlewareLike } from './middleware/middleware';

/**
 * Microservice service handler.
 * 微服务服务端处理器
 */
@Abstract()
export abstract class ServiceHandler<TReq = any, TRes = any, TContext extends RequestContext = RequestContext>
    extends ConfigableRequestHandler<TReq, TRes, TContext> implements RequestHandler<TReq, TRes, TContext> {

    /**
     * equals check.
     * 等于检查
     * @param target
     */
    abstract equals?(target: any): boolean;
}


/**
 * Microservice service handler options.
 * 微服务服务端处理器选项
 */
export interface ServiceHandlerOptions<TReq = any, TRes = any, TContext extends RequestContext = RequestContext> extends RequestHandlerOptions<TReq, TRes, TContext> {
    requestVaildatorsToken?: Token<VaildatorLike<Incoming, TContext>[]>;
    responseVaildatorsToken?: Token<VaildatorLike<Outgoing, TContext>[]>;
    routerToken?: Token<Router>;
    
    middlewares?: ProvdierOf<MiddlewareLike>[];
    middlewaresToken?: Token<MiddlewareLike[]>;
}
