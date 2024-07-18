import { ProvdierOf, Token } from '@tsdi/ioc';
import { HandlerService } from '@tsdi/core';
import { MiddlewareLike } from './middleware';
import { MiddlewareService } from './middleware.service';
import { RequestContext } from '../RequestContext';
import { AbstractRequestHandler, RequestHandlerOptions } from '../AbstractRequestHandler';


/**
 * middleware options.
 */
export interface MiddlewareOpts<T extends RequestContext = any> {
    middlewaresToken?: Token<MiddlewareLike<T>[]>;
    middlewares?: ProvdierOf<MiddlewareLike<T>>[];
}

/**
 * transport middleware handler options.
 * 
 * 含中间件的传输节点配置
 */
export interface MiddlewareHandlerOptions<T extends RequestContext = any, TArg = any> extends RequestHandlerOptions<T, TArg>, MiddlewareOpts<T> {

}



/**
 * middleware hanlder.
 * 
 * 含中间件的传输节点
 */

export abstract class MiddlewareHandler<TInput extends RequestContext = any, TOptions extends MiddlewareHandlerOptions = MiddlewareHandlerOptions>
    extends AbstractRequestHandler<TInput, TOptions> implements HandlerService, MiddlewareService {

   abstract use(middlewares: ProvdierOf<MiddlewareLike<TInput>> | ProvdierOf<MiddlewareLike<TInput>>[], order?: number): this;

}