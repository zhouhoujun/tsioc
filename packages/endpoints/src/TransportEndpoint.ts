import { Abstract, Execption, Injector, Token } from '@tsdi/ioc';
import { EndpointOptions, EndpointService, ConfigableEndpoint } from '@tsdi/core';
import { TransportContext } from './TransportContext';
import { Router } from './router/router';

/**
 * Transport endpoint.
 * 
 * 传输节点
 */
@Abstract()
export abstract class TransportEndpoint<TInput extends TransportContext = TransportContext, TOutput = any> extends ConfigableEndpoint<TInput, TOutput> implements EndpointService {

}

/**
 * Transport endpoint options.
 * 
 * 传输节点配置
 */
export interface TransportEndpointOptions<T extends TransportContext = TransportContext> extends EndpointOptions<T> {

    /**
     * backend of endpoint. defaut `Router`
     */
    backend?: Token<Router> | Router;
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
