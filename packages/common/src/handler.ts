import { Exception, getType, Handler, Injector, InterceptingHandler, InterceptorFn, toObservable, Type } from '@tsdi/ioc';
import { AbstractConfigableHandler, ConfigableHandler, ConfigableHandlerOptions, normalizeConfigableHandlerOptions } from '@tsdi/core';
import { Observable } from 'rxjs';
import { RequestContext } from './context';
import { ForbiddenException } from './exceptions';


/**
 * Requset handler
 */
export interface RequestHandler<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> extends Handler<TInput, TOutput, TContext> {
    /**
     * handle.
     * 
     * 处理句柄
     * @param input handle input.
     * @param context handle with context.
     * @param tail next tail.
     */
    handle(input: TInput, context: TContext): Observable<TOutput>;
}

/**
 * Request handler function.
 */
export type RequestHandlerFn<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> = (input: TInput, context: TContext) => Observable<TOutput>;


/**
 * Request handler like.
 */
export type RequestHandlerLike<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> = RequestHandlerFn<TInput, TOutput, TContext> | RequestHandler<TInput, TOutput, TContext>;

/**
 * Request intercepting handler.
 */
export class RequestInterceptingHandler<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> extends InterceptingHandler<TInput, TOutput, TContext> implements RequestHandler<TInput, TOutput, TContext> {
    handle(req: TInput, context: TContext): Observable<TOutput> {
        return toObservable(super.handle(req, context));
    }
}


/**
 * Request handler options.
 * 
 * 传输节点配置
 */
export interface RequestHandlerOptions<T = any> extends ConfigableHandlerOptions<T> {
    classType?: Type<RequestHandler>;

}



export abstract class ConfigableRequestHandler<
    TInput = any,
    TOutput = any,
    TOptions extends RequestHandlerOptions<TInput> = RequestHandlerOptions<TInput>,
    TContext extends RequestContext = RequestContext
> extends AbstractConfigableHandler<TInput, TOutput, TOptions, TContext> {

}

/**
 * Request handler.
 * 
 * 传输节点
 */
export class DefaultRequestHandler<
    TInput = any, TOutput = any,
    TOptions extends RequestHandlerOptions<TInput> = RequestHandlerOptions<TInput>,
    TContext extends RequestContext = RequestContext
>
    extends ConfigableHandler<TInput, TOutput, TOptions, TContext> implements ConfigableRequestHandler<TInput, TOutput, TOptions, TContext> {

    override handle(input: TInput, context: TContext): Observable<TOutput> {
        return toObservable(super.handle(input, context));
    }

    protected override getChain(input: TInput): InterceptorFn<TInput, TOutput> {
        return this.getChainOf(getType(input)) ?? super.getChain(input);
    }

    protected override forbiddenError(): Exception {
        return new ForbiddenException()
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
export function createRequestHandler<TInput extends RequestContext>(injector: Injector, options: RequestHandlerOptions<TInput>): RequestHandler<TInput> {
    options = normalizeConfigableHandlerOptions(options);
    const Type = options.classType ?? DefaultRequestHandler;
    return new Type(injector, options, options);
}

