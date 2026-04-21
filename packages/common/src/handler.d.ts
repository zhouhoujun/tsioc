import { Exception, Handler, Injector, InterceptingHandler, InterceptorLike, InvokeProviders, ProvdierOf, StaticProvider, Token, Type } from '@tsdi/ioc';
import { AbstractConfigableHandler, ConfigableHandler, GuardLike, PipeTransform } from '@tsdi/core';
import { Observable } from 'rxjs';
import { RequestContext } from './context';
import { RequestInterceptorFn, RequestInterceptorLike } from './interceptor';
import { TransferSide } from './transfer';
import { RequestFilterLike } from './filter';
/**
 * Requset handler
 */
export interface RequestHandler<TReq = any, TRes = any, TContext extends RequestContext = RequestContext> extends Handler<TReq, Observable<TRes>, TContext> {
    /**
     * handle.
     *
     * 处理句柄
     * @param input handle input.
     * @param context handle with context.
     * @param tail next tail.
     */
    handle(input: TReq, context: TContext): Observable<TRes>;
    /**
     * on destroy.
     */
    onDestroy?(): void;
}
/**
 * Request handler function.
 */
export type RequestHandlerFn<TReq = any, TRes = any, TContext extends RequestContext = RequestContext> = (input: TReq, context: TContext) => Observable<TRes>;
/**
 * Request handler like.
 */
export type RequestHandlerLike<TReq = any, TRes = any, TContext extends RequestContext = RequestContext> = RequestHandlerFn<TReq, TRes, TContext> | RequestHandler<TReq, TRes, TContext>;
/**
 * Request intercepting handler.
 */
export declare class RequestInterceptingHandler<TReq = any, TRes = any, TContext extends RequestContext = RequestContext> extends InterceptingHandler<TReq, Observable<TRes>, TContext> implements RequestHandler<TReq, TRes, TContext> {
}
/**
 * Request handler options.
 *
 * 传输节点配置
 */
export interface RequestHandlerOptions<TReq = any, TRes = any, TContext extends RequestContext = RequestContext> extends InvokeProviders {
    /**
     * An array of dependency-injection tokens used to look up `GuardLike()`
     * handlers, in order to determine if the current user is allowed to
     * activate the component. By default, any user can activate.
     */
    guards?: ProvdierOf<GuardLike<TReq>>[];
    /**
     * interceptors of handler.
     */
    interceptors?: ProvdierOf<RequestInterceptorLike<TReq, TRes, TContext>>[];
    /**
     * pipes for the handler.
     */
    pipes?: StaticProvider<PipeTransform>[];
    /**
     * filters of handler.
     */
    filters?: ProvdierOf<RequestFilterLike<TReq, TRes>>[];
    /**
     * backend.
     */
    backend?: ProvdierOf<RequestHandlerLike<TReq, TRes, TContext>>;
    transfers?: ProvdierOf<RequestInterceptorLike[]>;
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
    interceptorsToken?: Token<RequestInterceptorLike<TReq, TRes, TContext>[]>;
    /**
     * guards tokens.
     */
    guardsToken?: Token<GuardLike<TReq, TContext>[]>;
    /**
     * filter tokens.
     */
    filtersToken?: Token<RequestFilterLike<TReq, TRes, TContext>[]>;
    backendToken?: Token<RequestHandlerLike<TReq, TRes, TContext>>;
    transfersToken?: Token<RequestInterceptorLike[]>;
    side?: TransferSide;
}
/**
 * configable request handler.
 */
export declare abstract class ConfigableRequestHandler<TReq = any, TRes = any, TContext extends RequestContext = RequestContext> extends AbstractConfigableHandler<TReq, Observable<TRes>, TContext> {
    /**
     * append handler options.
     * @param options
     */
    abstract append(options: RequestHandlerOptions<TReq, TRes, TContext> & {
        transfers?: ProvdierOf<RequestInterceptorLike[]>;
    }): this;
    /**
     * handle request.
     * @param input
     * @param context
     */
    abstract handle(input: TReq, context: TContext): Observable<TRes>;
}
/**
 * Request handler.
 *
 * 传输节点
 */
export declare class DefaultRequestHandler<TReq = any, TRes = any, TContext extends RequestContext = RequestContext> extends ConfigableHandler<TReq, Observable<TRes>, TContext> implements ConfigableRequestHandler<TReq, TRes, TContext> {
    append(options: RequestHandlerOptions<TReq, TRes, TContext> & {
        transfers?: ProvdierOf<RequestInterceptorLike[]>;
    }): this;
    handle(input: TReq, context: TContext): Observable<TRes>;
    protected generateInterceptorFn(fns: InterceptorLike[]): RequestInterceptorFn;
    protected generateBackendFn(): RequestHandlerFn;
    protected forbiddenError(): Exception;
}
/**
 * create request handler.
 *
 * 创建传输节点处理器实例化对象
 * @param context
 * @param options
 * @returns
 */
export declare function createRequestHandler<TReq = any, TRes = any>(injector: Injector, options: RequestHandlerOptions<TReq, TRes>): ConfigableRequestHandler<TReq, TRes>;
