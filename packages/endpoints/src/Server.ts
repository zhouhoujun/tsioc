import { Abstract, Injector, isArray, ProvdierOf, toMutilProvdierOf } from '@tsdi/ioc';
import { ApplicationEvent, HandlerAppendService, Runner, Shutdown, isHandlerOptions } from '@tsdi/core';
import { RequestContext, RequestHandler, RequestInterceptorLike, Transport, RequestHandlerOptions } from '@tsdi/common';
import { ServiceHandler } from './ServiceHandler';
import { Observable } from 'rxjs';


/**
 * microservice.
 */
@Abstract()
export abstract class MicroService<TRequest = any, TResponse = any, TContext extends RequestContext = RequestContext> {

    /**
     * injector
     */
    abstract get injector(): Injector;
    /**
     * micro service handler
     */
    abstract get handler(): RequestHandler<TRequest, TResponse, TContext>;


    @Runner()
    async start() {
        if (this.injector.ready) await this.injector.ready;
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
export abstract class Server<TRequest = any, TResponse = any, TContext extends RequestContext = RequestContext>
    extends MicroService<TRequest, TResponse, TContext> implements HandlerAppendService<TRequest, Observable<TResponse>, TContext> {

    get injector() {
        return this.handler.injector
    }

    /**
     * service request handler.
     */
    abstract get handler(): ServiceHandler<TRequest, TResponse, TContext>;

    /**
     * use interceptor for this handler.
     * @param inteceptor
     * @param order mutil order
     */
    use(inteceptor: ProvdierOf<RequestInterceptorLike<TRequest, TResponse, TContext>>, order?: number): this;
    /**
     * use interceptor for this handler.
     * @param inteceptors 
     */
    use(inteceptors: ProvdierOf<RequestInterceptorLike<TRequest, TResponse, TContext>>[]): this;
    /**
     * use and append hanlder options.
     * @param options 
     */
    use(options: RequestHandlerOptions<TRequest, TResponse, TContext>): this;
    use(options: ProvdierOf<RequestInterceptorLike<TRequest, TResponse, TContext>> | ProvdierOf<RequestInterceptorLike<TRequest, TResponse, TContext>>[] | RequestHandlerOptions<TRequest, TResponse, TContext>, order?: number): this {
        this.handler.append(
            isArray(options) ? { interceptors: options }
                : ((isHandlerOptions(options) ? options : { interceptors: [toMutilProvdierOf(options as ProvdierOf<RequestInterceptorLike<TRequest, TResponse, TContext>>, order)] })
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