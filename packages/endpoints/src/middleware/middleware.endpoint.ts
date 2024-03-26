import { Injector, InvocationContext, ProvdierOf, Token, createContext, isInjector, refl } from '@tsdi/ioc';
import { HandlerService, Backend } from '@tsdi/core';
import { MiddlewareLike } from './middleware';
import { MiddlewareService } from './middleware.service';
import { RequestContext } from '../RequestContext';
import { EndpointHandler, EndpointOptions } from '../EndpointHandler';
import { MiddlewareBackend } from './middleware.compose';
import { RequestHandler } from '../RequestHandler';


/**
 * middleware options.
 */
export interface MiddlewareOpts<T extends RequestContext = any> {
    middlewaresToken?: Token<MiddlewareLike<T>[]>;
    middlewares?: ProvdierOf<MiddlewareLike<T>>[];
}

/**
 * transport middleware endpoint options.
 * 
 * 含中间件的传输节点配置
 */
export interface MiddlewareEndpointOptions<T extends RequestContext = any, TArg = any> extends EndpointOptions<T, TArg>, MiddlewareOpts<T> {

}



/**
 * transport middleware endpoint.
 * 
 * 含中间件的传输节点
 */

export class MiddlewareEndpoint<TInput extends RequestContext = any, TOutput = any>
    extends EndpointHandler<TInput, TOutput, MiddlewareEndpointOptions<TInput>> implements RequestHandler<TInput>, HandlerService, MiddlewareService {

    use(middlewares: ProvdierOf<MiddlewareLike<TInput>> | ProvdierOf<MiddlewareLike<TInput>>[], order?: number): this {
        this.regMulti(this.options.middlewaresToken!, middlewares, order, type => refl.getDef(type).abstract || Reflect.getMetadataKeys(type).length > 0);
        this.reset();
        return this;
    }

    protected override getBackend(): Backend<TInput, TOutput> {
        return new MiddlewareBackend(this.getMiddlewares());
    }

    protected getMiddlewares() {
        return this.injector.get(this.options.middlewaresToken!, []);
    }
}

/**
 * create transport endpoint.
 * 
 * 创建含中间件的传输节点实例化对象
 * @param context 
 * @param options 
 * @returns 
 */
export function createMiddlewareEndpoint<TCtx extends RequestContext, TOutput>(context: Injector | InvocationContext, options: MiddlewareEndpointOptions<TCtx>): MiddlewareEndpoint<TCtx, TOutput> {
    return new MiddlewareEndpoint(isInjector(context) ? createContext(context) : context, options)
}
