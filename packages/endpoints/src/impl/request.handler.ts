import { Execption, Injector, InvocationContext, createContext } from '@tsdi/ioc';
import { ConfigableHandler, normalizeConfigableHandlerOptions } from '@tsdi/core';
import { ForbiddenExecption } from '@tsdi/common/transport';
import { RequestContext } from '../RequestContext';
import { AbstractRequestHandler, RequestHandlerOptions } from '../AbstractRequestHandler';


/**
 * Request handler.
 * 
 * 传输节点
 */
export class DefaultRequestHandler<TInput extends RequestContext = RequestContext, TOptions extends RequestHandlerOptions<TInput> = RequestHandlerOptions<TInput>>
    extends ConfigableHandler<TInput, any, TOptions> implements AbstractRequestHandler<TInput, TOptions> {

    protected override forbiddenError(): Execption {
        return new ForbiddenExecption()
    }
}



/**
 * create request handler.
 * 
 * 创建传输节点处理器实例化对象
 * @param context 
 * @param options 
 * @returns 
 */
export function createRequestHandler<TInput extends RequestContext>(context: Injector | InvocationContext, options: RequestHandlerOptions<TInput>): AbstractRequestHandler<TInput> {
    options = normalizeConfigableHandlerOptions(options);
    return new DefaultRequestHandler(createContext(context, options), options)
}

