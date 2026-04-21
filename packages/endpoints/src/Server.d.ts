import { Injector, ProvdierOf } from '@tsdi/ioc';
import { ApplicationEvent, HandlerAppendService } from '@tsdi/core';
import { RequestContext, RequestHandler, RequestInterceptorLike, Transport, RequestHandlerOptions } from '@tsdi/common';
import { ServiceHandler } from './ServiceHandler';
import { Observable } from 'rxjs';
/**
 * microservice.
 */
export declare abstract class MicroService<TRequest = any, TResponse = any, TContext extends RequestContext = RequestContext> {
    /**
     * injector
     */
    abstract get injector(): Injector;
    /**
     * micro service handler
     */
    abstract get handler(): RequestHandler<TRequest, TResponse, TContext>;
    start(): Promise<any>;
    close(): Promise<void>;
    protected abstract onStart(): Promise<any>;
    protected abstract onShutdown(): Promise<any>;
}
/**
 * abstract server.
 *
 * 微服务
 */
export declare abstract class Server<TRequest = any, TResponse = any, TContext extends RequestContext = RequestContext> extends MicroService<TRequest, TResponse, TContext> implements HandlerAppendService<TRequest, Observable<TResponse>, TContext> {
    get injector(): Injector;
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
}
/**
 *  bind Server event.
 */
export declare class BindServerEvent<T = any> extends ApplicationEvent {
    readonly server: T;
    readonly transport: Transport;
    constructor(server: T, transport: Transport, target: any);
}
