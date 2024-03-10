import { Abstract, Execption, Injector, ProvdierOf, Token, refl } from '@tsdi/ioc';
import { InvocationOptions, HandlerService } from '@tsdi/core';
import { MiddlewareLike } from './middleware';
import { MiddlewareService } from './middleware.service';
import { TransportContext } from '../TransportContext';
import { TransportEndpoint } from '../TransportEndpoint';


/**
 * middleware options.
 */
export interface MiddlewareOpts<T extends TransportContext = any> {
    middlewaresToken?: Token<MiddlewareLike<T>[]>;
    middlewares?: ProvdierOf<MiddlewareLike<T>>[];
}

/**
 * transport middleware endpoint options.
 * 
 * 含中间件的传输节点配置
 */
export interface MiddlewareEndpointOptions<T extends TransportContext = any, TArg = any> extends InvocationOptions<T, TArg>, MiddlewareOpts<T> {
    
}



/**
 * transport middleware endpoint.
 * 
 * 含中间件的传输节点
 */

export class MiddlewareEndpoint<TInput extends TransportContext = any, TOutput = any> extends TransportEndpoint<TInput, TOutput, MiddlewareEndpointOptions<TInput>> implements HandlerService, MiddlewareService {

    use(middlewares: ProvdierOf<MiddlewareLike<TInput>> | ProvdierOf<MiddlewareLike<TInput>>[], order?: number): this {
        this.regMulti(this.options.midddlesToken, middlewares, order, type => refl.getDef(type).abstract || Reflect.getMetadataKeys(type).length > 0);
        this.reset();
        return this;
    }
}

/**
 * create transport endpoint.
 * 
 * 创建含中间件的传输节点实例化对象
 * @param injector 
 * @param options 
 * @returns 
 */
export function createMiddlewareEndpoint<TCtx extends TransportContext, TOutput>(injector: Injector, options: MiddlewareEndpointOptions<TCtx>): MiddlewareEndpoint<TCtx, TOutput> {
    return MIDDLEEARE_ENDPOINT_IMPL.create(injector, options)
}

export const MIDDLEEARE_ENDPOINT_IMPL = {
    create<TCtx extends TransportContext, TOutput>(injector: Injector, options: MiddlewareEndpointOptions<TCtx>): MiddlewareEndpoint<TCtx, TOutput> {
        throw new Execption('not implemented.')
    }
}
