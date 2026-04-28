import { Abstract, Injector, isArray, ProvdierOf, toMutilProvdierOf } from '@tsdi/ioc';
import { HandlerAppendService, Runner, Shutdown, isHandlerOptions } from '@tsdi/core';
import { RequestContext, RequestHandler, RequestInterceptorLike, RequestHandlerOptions, Transport } from '@tsdi/common';
import { ServiceHandler } from './MicroServiceHandler';
import { Observable } from 'rxjs';


/**
 * Abstract microservice, extends base MicroService with registration, health, graceful shutdown.
 * 抽象微服务，扩展基础微服务添加注册、健康检查、优雅关闭
 */
@Abstract()
export abstract class MicroService<TRequest = any, TResponse = any, TContext extends RequestContext = RequestContext> {

    abstract get injector(): Injector;

    abstract get handler(): RequestHandler<TRequest, TResponse, TContext>;

    @Runner()
    async start() {
        if (this.injector.ready) await this.injector.ready;
        await this.onRegister();
        return await this.onStart();
    }

    @Shutdown()
    async close() {
        await this.onGracefulShutdown();
        await this.onDeregister();
        await this.onShutdown();
        this.handler.onDestroy?.();
    }

    /**
     * Register service with discovery.
     * 向服务发现注册服务
     */
    protected onRegister(): Promise<any> {
        return Promise.resolve();
    }

    /**
     * Deregister service from discovery.
     * 从服务发现注销服务
     */
    protected onDeregister(): Promise<any> {
        return Promise.resolve();
    }

    /**
     * Graceful shutdown with in-flight request drain.
     * 优雅关闭，排空进行中的请求
     */
    protected onGracefulShutdown(): Promise<any> {
        return Promise.resolve();
    }

    protected abstract onStart(): Promise<any>;

    protected abstract onShutdown(): Promise<any>;
}


/**
 * Abstract server, like Spring Cloud @EnableEurekaClient.
 * 抽象微服务服务器，类似 Spring Cloud @EnableEurekaClient
 */
@Abstract()
export abstract class Service<TRequest = any, TResponse = any, TContext extends RequestContext = RequestContext>
    extends MicroService<TRequest, TResponse, TContext> implements HandlerAppendService<TRequest, Observable<TResponse>, TContext> {

    get injector() {
        return this.handler.injector;
    }

    abstract get handler(): ServiceHandler<TRequest, TResponse, TContext>;

    use(inteceptor: ProvdierOf<RequestInterceptorLike<TRequest, TResponse, TContext>>, order?: number): this;
    use(inteceptors: ProvdierOf<RequestInterceptorLike<TRequest, TResponse, TContext>>[]): this;
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
 * Bind microservice server event.
 * 绑定微服务服务器事件
 */
export class BindMicroServiceEvent<T = any> {
    constructor(readonly server: T, readonly transport: Transport, target: any) {
    }
}
