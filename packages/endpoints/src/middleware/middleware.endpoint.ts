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
 * transport middleware handler options.
 * 
 * 含中间件的传输节点配置
 */
export interface MiddlewareHandlerOptions<T extends RequestContext = any, TArg = any> extends EndpointOptions<T, TArg>, MiddlewareOpts<T> {

}



/**
 * middleware hanlder.
 * 
 * 含中间件的传输节点
 */

export class MiddlewareHandler<TInput extends RequestContext = any, TOptions extends MiddlewareHandlerOptions = MiddlewareHandlerOptions>
    extends EndpointHandler<TInput, TOptions> implements RequestHandler<TInput>, HandlerService, MiddlewareService {

    use(middlewares: ProvdierOf<MiddlewareLike<TInput>> | ProvdierOf<MiddlewareLike<TInput>>[], order?: number): this {
        this.regMulti(this.options.middlewaresToken!, middlewares, order, type => refl.getDef(type).abstract || Reflect.getMetadataKeys(type).length > 0);
        this.reset();
        return this;
    }

    protected override getBackend(): Backend<TInput> {
        return new MiddlewareBackend(this.getMiddlewares());
    }

    protected getMiddlewares() {
        return this.injector.get(this.options.middlewaresToken!, []);
    }
}

/**
 * create middleware hanlder.
 * 
 * 创建含中间件的传输节点实例化对象
 * @param context 
 * @param options 
 * @returns 
 */
export function createMiddlewareEndpoint<TInput extends RequestContext>(context: Injector | InvocationContext, options: MiddlewareHandlerOptions<TInput>): MiddlewareHandler<TInput> {
    return new MiddlewareHandler(isInjector(context) ? createContext(context) : context, options)
}
