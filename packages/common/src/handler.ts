import { Abstract, composeInterceptors, createInjector, Exception, Handler, Injector, InterceptingHandler, InterceptorLike, InvokeProviders, ProvdierOf, StaticProvider, Token, toObservable, Type } from '@tsdi/ioc';
import { AbstractConfigableHandler, ConfigableHandler, GuardLike, normalizeConfigableHandlerOptions, PipeTransform } from '@tsdi/core';
import { defer, mergeMap, Observable, throwError } from 'rxjs';
import { RequestContext } from './context';
import { ForbiddenException } from './exceptions';
import { RequestInterceptorFn, RequestInterceptorLike } from './interceptor';
import { TransferInterceptorFactory, TransferSide } from './transfer';
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
export class RequestInterceptingHandler<TReq = any, TRes = any, TContext extends RequestContext = RequestContext> extends InterceptingHandler<TReq, Observable<TRes>, TContext> implements RequestHandler<TReq, TRes, TContext> {

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


    transfers?: TransferInterceptorFactory[];


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
@Abstract()
export abstract class ConfigableRequestHandler<
    TReq = any,
    TRes = any,
    TContext extends RequestContext = RequestContext
> extends AbstractConfigableHandler<TReq, Observable<TRes>, TContext> {

    /**
     * append handler options.
     * @param options 
     */
    abstract append(options: RequestHandlerOptions<TReq, TRes, TContext> & { transfers?: ProvdierOf<RequestInterceptorLike[]> }): this;
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
export class DefaultRequestHandler<
    TReq = any, TRes = any,
    TContext extends RequestContext = RequestContext
> extends ConfigableHandler<TReq, Observable<TRes>, TContext> implements ConfigableRequestHandler<TReq, TRes, TContext> {

    override append(options: RequestHandlerOptions<TReq, TRes, TContext> & { transfers?: ProvdierOf<RequestInterceptorLike[]> }): this {
        super.append(options);
        const config = options as RequestHandlerOptions;
        if (config.transfers) {
            this.regMulti(config.transfersToken!, config.transfers);
            this.resetChain();
        }
        return this;
    }

    override handle(input: TReq, context: TContext): Observable<TRes> {
        return defer(() => this.canHandle(input, context))
            .pipe(
                mergeMap(r => {
                    if (r === true) return this.run(input, context) as Observable<TRes>;
                    return throwError(() => this.forbiddenError());
                })
            )
    }

    protected override generateInterceptorFn(fns: InterceptorLike[]): RequestInterceptorFn {
        const options = this.options as RequestHandlerOptions & { features?: RequestHandlerOptions };
        if (options.side === TransferSide.server) {
            const transfersToken = options.transfersToken ?? options.features?.transfersToken;
            const transfers = transfersToken ? this.injector.get(transfersToken, []) : [];
            if (transfers?.length) {
                fns.unshift(...transfers)
            }
        }
        return composeInterceptors(fns);
    }

    protected override generateBackendFn(): RequestHandlerFn {
        const handler = super.generateBackendFn() as RequestHandlerFn;
        const options = this.options as RequestHandlerOptions & { features?: RequestHandlerOptions };
        if (options.side === TransferSide.client) {
            const transfersToken = options.transfersToken ?? options.features?.transfersToken;
            const transfers = transfersToken ? this.injector.get(transfersToken, []) : [];
            if (transfers?.length) {
                const interceptorFn = composeInterceptors(transfers) as RequestInterceptorFn;
                return (req: TReq, context: RequestContext) => interceptorFn(req, handler, context);
            }
        }

        return handler
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
export function createRequestHandler<TReq = any, TRes = any>(injector: Injector, options: RequestHandlerOptions<TReq, TRes>): ConfigableRequestHandler<TReq, TRes> {
    normalizeConfigableHandlerOptions(options);
    options.enableTypeChain ??= true;
    const Type = options.handlerType ?? DefaultRequestHandler;
    return new Type(createInjector(injector, options, options.handlerType), options) as ConfigableRequestHandler<TReq, TRes>;
}

