import { Injector, InvocationContext, ProvdierOf, createContext, refl } from '@tsdi/ioc';
import { HandlerService, Backend, normalizeConfigableHandlerOptions } from '@tsdi/core';
import { MiddlewareLike } from '../middleware/middleware';
import { MiddlewareService } from '../middleware/middleware.service';
import { RequestContext } from '../RequestContext';
import { MiddlewareBackend } from '../middleware/middleware.compose';
import { MiddlewareHandler, MiddlewareHandlerOptions } from '../middleware/middleware.endpoint';
import { DefaultRequestHandler } from './request.handler';


/**
 * middleware hanlder.
 * 
 * 含中间件的传输节点
 */

export class DefaultMiddlewareHandler<TInput extends RequestContext = any, TOptions extends MiddlewareHandlerOptions = MiddlewareHandlerOptions>
    extends DefaultRequestHandler<TInput, TOptions> implements MiddlewareHandler<TInput>, HandlerService, MiddlewareService {

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
    options = normalizeConfigableHandlerOptions(options);
    return new DefaultMiddlewareHandler(createContext(context, options), options)
}
