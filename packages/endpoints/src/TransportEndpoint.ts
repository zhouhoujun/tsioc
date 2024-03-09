import { Execption, Injector, InvocationContext, Token } from '@tsdi/ioc';
import { ConfigableHandler, ConfigableHandlerOptions, HandlerService } from '@tsdi/core';
import { TransportContext } from './TransportContext';
import { Router } from './router/router';
import { ForbiddenExecption } from '@tsdi/common/transport';

/**
 * Transport endpoint.
 * 
 * 传输节点
 */
export class TransportEndpoint<TInput extends TransportContext = TransportContext, TOutput = any> extends ConfigableHandler<TInput, TOutput> implements HandlerService {

    protected override forbiddenError(): Execption {
        return new ForbiddenExecption()
    }
}

/**
 * Transport endpoint options.
 * 
 * 传输节点配置
 */
export interface TransportEndpointOptions<T extends TransportContext = TransportContext> extends ConfigableHandlerOptions<T> {

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
export function createTransportEndpoint<TCtx extends TransportContext, TOutput>(injector: Injector | InvocationContext, options: TransportEndpointOptions<TCtx>): TransportEndpoint<TCtx, TOutput> {
    return new TransportEndpoint(injector, options)
}

