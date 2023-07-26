import { Abstract, Execption, Injector, ProvdierOf, Token } from '@tsdi/ioc';
import { EndpointOptions, EndpointService } from '@tsdi/core';
import { MiddlewareLike } from './middleware';
import { MiddlewareService } from './middleware.service';
import { AssetContext } from '../AssetContext';
import { TransportEndpoint } from '../TransportEndpoint';

/**
 * transport middleware endpoint.
 * 
 * 含中间件的传输节点
 */
@Abstract()
export abstract class MiddlewareEndpoint<TInput extends AssetContext, TOutput> extends TransportEndpoint<TInput, TOutput> implements EndpointService, MiddlewareService {

    abstract use(middlewares: ProvdierOf<MiddlewareLike<TInput>> | ProvdierOf<MiddlewareLike<TInput>>[], order?: number): this;
}

/**
 * transport middleware endpoint options.
 * 
 * 含中间件的传输节点配置
 */
export interface MiddlewareEndpointOptions<T extends AssetContext = any, TArg = any> extends EndpointOptions<T, TArg> {
    middlewaresToken?: Token<MiddlewareLike<T>[]>;
    middlewares?: ProvdierOf<MiddlewareLike<T>>[];
}

/**
 * create transport endpoint.
 * 
 * 创建含中间件的传输节点实例化对象
 * @param injector 
 * @param options 
 * @returns 
 */
export function createMiddlewareEndpoint<TCtx extends AssetContext, TOutput>(injector: Injector, options: MiddlewareEndpointOptions<TCtx>): MiddlewareEndpoint<TCtx, TOutput> {
    return MIDDLEEARE_ENDPOINT_IMPL.create(injector, options)
}

export const MIDDLEEARE_ENDPOINT_IMPL = {
    create<TCtx extends AssetContext, TOutput>(injector: Injector, options: MiddlewareEndpointOptions<TCtx>): MiddlewareEndpoint<TCtx, TOutput> {
        throw new Execption('not implemented.')
    }
}
