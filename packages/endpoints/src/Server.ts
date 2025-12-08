import { Abstract, InterceptorLike, InvocationContext, isArray, ProvdierOf, toMutilProvdierOf } from '@tsdi/ioc';
import { ApplicationEvent, HandlerAppendService, Runner, Shutdown, HandlerOptions, isHandlerOptions } from '@tsdi/core';
import { RequestHandler, RequestInterceptorLike, Transport } from '@tsdi/common';
import { AbstractRequestContext } from './AbstractRequestContext';
import { ServiceHandler } from './ServiceHandler';
import { ServiceConfig } from './server.options';
// import { RequestHandler } from './RequestHandler';
// import { TOutgoing } from '@tsdi/common/transport';


/**
 * microservice.
 */
@Abstract()
export abstract class MicroService<TRequest = any, TResponse = any, TContext extends AbstractRequestContext = AbstractRequestContext> {

    /**
     * context
     */
    abstract get context(): InvocationContext;
    /**
     * micro service handler
     */
    abstract get handler(): RequestHandler<TRequest, TResponse, TContext>;

    @Runner()
    async start() {
        if (this.context.ready) await this.context.ready;
        return await this.onStart()
    }

    @Shutdown()
    async close() {
        await this.onShutdown();
        this.handler.onDestroy?.();
    }

    protected abstract onStart(): Promise<any>;

    protected abstract onShutdown(): Promise<any>;

}


/**
 * abstract server.
 * 
 * 微服务
 */
@Abstract()
export abstract class Server<TRequest = any, TResponse = any, TContext extends AbstractRequestContext = AbstractRequestContext>
    extends MicroService<TRequest, TResponse, TContext> implements HandlerAppendService<TRequest, TResponse, TContext> {

    /**
     * service request handler.
     */
    abstract get handler(): ServiceHandler<TRequest, TResponse, TContext>;

    /**
     * use interceptor for this handler.
     * @param inteceptor
     * @param order mutil order
     */
    use(inteceptor: ProvdierOf<InterceptorLike<TRequest, TResponse, TContext>>, order?: number): this;
    /**
     * use interceptor for this handler.
     * @param inteceptors 
     */
    use(inteceptors: ProvdierOf<InterceptorLike<TRequest, TResponse, TContext>>[]): this;
    /**
     * use and append hanlder options.
     * @param options 
     */
    use(options: HandlerOptions<TRequest, TResponse, TContext>): this;
    use(options: ProvdierOf<InterceptorLike<TRequest, TResponse, TContext>> | ProvdierOf<InterceptorLike<TRequest, TResponse, TContext>>[] | HandlerOptions<TRequest, TResponse, TContext>, order?: number): this {
        this.handler.append(
            isArray(options) ? { interceptors: options }
                : ((isHandlerOptions(options) ? options : { interceptors: [toMutilProvdierOf(options as ProvdierOf<InterceptorLike<TRequest, TResponse, TContext>>, order)] })
                )
        )
        return this;
    }

}

/**
 *  bind Server event.
 */
export class BindServerEvent<T = any> extends ApplicationEvent {

    constructor(readonly server: T, readonly transport: Transport, target: any) {
        super(target)
    }

}