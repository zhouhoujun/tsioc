import { Abstract, Exception, getType, Handler, Injector, InterceptingHandler, InterceptorFn, InvokeProviders, ProvdierOf, StaticProvider, Token, toObservable, Type } from '@tsdi/ioc';
import { AbstractConfigableHandler, ConfigableHandler, FilterLike, GuardLike, normalizeConfigableHandlerOptions, PipeTransform } from '@tsdi/core';
import { Observable } from 'rxjs';
import { RequestContext } from './context';
import { ForbiddenException } from './exceptions';
import { RequestInterceptorLike } from './interceptor';


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

    /**
     * on destroy.
     */
    onDestroy?(): void;
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
export interface RequestHandlerOptions<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> extends InvokeProviders {

    /**
     * An array of dependency-injection tokens used to look up `GuardLike()`
     * handlers, in order to determine if the current user is allowed to
     * activate the component. By default, any user can activate.
     */
    guards?: ProvdierOf<GuardLike<TInput>>[];
    /**
     * interceptors of handler.
     */
    interceptors?: ProvdierOf<RequestInterceptorLike<TInput, TOutput, TContext>>[];
    /**
     * pipes for the handler.
     */
    pipes?: StaticProvider<PipeTransform>[];
    /**
     * filters of handler.
     */
    filters?: ProvdierOf<FilterLike<TInput, TOutput>>[];
    /**
     * backend.
     */
    backend?: ProvdierOf<RequestHandlerLike<TInput, TOutput, TContext>>;


    handlerType?: Type<RequestHandler>;
    
    /**
     * enable input type filters and interceptors chain for handler.
     */
    enableTypeChain?: boolean;
    /**
     * execption handlers
     */
    execptionHandlers?: Type<any> | Type[] | null;

    /**
     * interceptors token.
     */
    interceptorsToken?: Token<RequestInterceptorLike<TInput, TOutput, TContext>[]>;

    /**
     * guards tokens.
     */
    guardsToken?: Token<GuardLike<TInput, TContext>[]>;
    /**
     * filter tokens.
     */
    filtersToken?: Token<FilterLike<TInput, TOutput, TContext>[]>;



    backendToken?: Token<RequestHandlerLike<TInput, TOutput, TContext>>;

}


/**
 * configable request handler.
 */
@Abstract()
export abstract class ConfigableRequestHandler<
    TInput = any,
    TOutput = any,
    TContext extends RequestContext = RequestContext
> extends AbstractConfigableHandler<TInput, TOutput, TContext> {
    /**
     * handle request.
     * @param input 
     * @param context 
     */
    abstract handle(input: TInput, context: TContext): Observable<TOutput>;
}

/**
 * Request handler.
 * 
 * 传输节点
 */
export class DefaultRequestHandler<
    TInput = any, TOutput = any,
    TContext extends RequestContext = RequestContext
>
    extends ConfigableHandler<TInput, TOutput, TContext> implements ConfigableRequestHandler<TInput, TOutput, TContext> {

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
export function createRequestHandler<TInput = any, TOutput = any>(injector: Injector, options: RequestHandlerOptions<TInput, TOutput>): ConfigableRequestHandler<TInput, TOutput> {
    normalizeConfigableHandlerOptions(options);
    const Type = options.handlerType ?? DefaultRequestHandler;
    return new Type(injector, options, options) as ConfigableRequestHandler<TInput, TOutput>;
}

