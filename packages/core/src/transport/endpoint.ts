import { Abstract, Execption, Injector, ProvdierOf, Token } from '@tsdi/ioc';
import { EndpointOptions, EndpointService } from '../endpoints/endpoint.service';
import { ConfigableEndpoint } from '../endpoints/endpoint.factory';
import { MiddlewareLike } from './middleware';
import { MiddlewareService } from './middleware.service';
import { TransportContext } from './context';

/**
 * Transport endpoint.
 * 
 * 传输节点
 */
@Abstract()
export abstract class TransportEndpoint<TInput extends TransportContext, TOutput> extends ConfigableEndpoint<TInput, TOutput> implements EndpointService, MiddlewareService {

    abstract use(middlewares: ProvdierOf<MiddlewareLike<TInput>> | ProvdierOf<MiddlewareLike<TInput>>[], order?: number): this;
}

/**
 * Transport endpoint options.
 * 
 * 传输节点配置
 */
export interface TransportEndpointOptions<T extends TransportContext = any, TArg = any> extends EndpointOptions<T, TArg> {
    middlewaresToken?: Token<MiddlewareLike<T>[]>;
    middlewares?: ProvdierOf<MiddlewareLike<T>>[];
}

/**
 * create transport endpoint.
 * 
 * 创建传输节点实例化对象
 * @param injector 
 * @param options 
 * @returns 
 */
export function createTransportEndpoint<TCtx extends TransportContext, TOutput>(injector: Injector, options: TransportEndpointOptions<TCtx>): TransportEndpoint<TCtx, TOutput> {
    return TRANSPORT_ENDPOINT_IMPL.create(injector, options)
}

export const TRANSPORT_ENDPOINT_IMPL = {
    create<TCtx extends TransportContext, TOutput>(injector: Injector, options: TransportEndpointOptions<TCtx>): TransportEndpoint<TCtx, TOutput> {
        throw new Execption('not implemented.')
    }
}