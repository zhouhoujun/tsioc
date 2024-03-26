import { Execption, Injector, InvocationContext, Token, createContext, isInjector } from '@tsdi/ioc';
import { ConfigableHandler, HandlerService, InvocationOptions } from '@tsdi/core';
import { ForbiddenExecption } from '@tsdi/common/transport';
import { RequestContext } from './RequestContext';
import { Router } from './router/router';
import { RequestHandler } from './RequestHandler';

/**
 * Endpoint handler.
 * 
 * 传输节点
 */
export class EndpointHandler<TInput extends RequestContext = RequestContext, TOptions extends EndpointOptions<TInput> = EndpointOptions<TInput>>
    extends ConfigableHandler<TInput, any, TOptions> implements RequestHandler<TInput>, HandlerService {
    
    getOptions(): TOptions {
        return this.options;
    }

    protected override forbiddenError(): Execption {
        return new ForbiddenExecption()
    }
}

/**
 * Endpoint handler options.
 * 
 * 传输节点配置
 */
export interface EndpointOptions<T extends RequestContext = RequestContext, TArg = any> extends InvocationOptions<T, TArg> {

    /**
     * backend of endpoint. defaut `Router`
     */
    backend?: Token<Router> | Router;
}

/**
 * create endpoint handler.
 * 
 * 创建传输节点处理器实例化对象
 * @param context 
 * @param options 
 * @returns 
 */
export function createEndpoint<TInput extends RequestContext>(context: Injector | InvocationContext, options: EndpointOptions<TInput>): EndpointHandler<TInput> {
    return new EndpointHandler(isInjector(context) ? createContext(context, options) : context, options)
}

