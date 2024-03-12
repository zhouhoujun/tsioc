import { Execption, Injector, InvocationContext, Token, createContext, isInjector } from '@tsdi/ioc';
import { ConfigableHandler, HandlerService, InvocationOptions } from '@tsdi/core';
import { ForbiddenExecption } from '@tsdi/common/transport';
import { RequestContext } from './RequestContext';
import { Router } from './router/router';
import { RequestHandler } from './RequestHandler';

/**
 * Transport endpoint.
 * 
 * 传输节点
 */
export class TransportEndpoint<TInput extends RequestContext = RequestContext, TOutput = any, TOptions extends TransportEndpointOptions<TInput> = TransportEndpointOptions<TInput>>
    extends ConfigableHandler<TInput, TOutput, TOptions> implements RequestHandler<TInput>, HandlerService {

    protected override forbiddenError(): Execption {
        return new ForbiddenExecption()
    }
}

/**
 * Transport endpoint options.
 * 
 * 传输节点配置
 */
export interface TransportEndpointOptions<T extends RequestContext = RequestContext, TArg = any> extends InvocationOptions<T, TArg> {

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
export function createTransportEndpoint<TCtx extends RequestContext, TOutput>(injector: Injector | InvocationContext, options: TransportEndpointOptions<TCtx>): TransportEndpoint<TCtx, TOutput> {
    return new TransportEndpoint(isInjector(injector) ? injector : createContext(injector, options), options)
}

