import { Abstract, ArgumentException, Context, Inject, Injector, Optional } from '@tsdi/ioc';
import { Shutdown } from '@tsdi/core';
import { AbstractRequest, Pattern, ResponseEvent, RequestInitOpts, RequestOptions, RequestContext, createRequestContext, REQUEST } from '@tsdi/common';
import { Observable, throwError, defer, mergeMap, catchError } from 'rxjs';
import { ClientHandler } from './ClientHandler';
import { ClientConfig } from './options';


/**
 * Abstract microservice client. Extends base client with Spring Cloud-style features.
 * 抽象微服务客户端，扩展基础客户端添加 Spring Cloud 风格特性
 */
@Abstract()
export abstract class AbstractClient<
    TRequest extends AbstractRequest<any> = AbstractRequest<any>,
    TResponse extends ResponseEvent<any> = ResponseEvent<any>,
    TReqOptions extends RequestOptions = RequestOptions
> {

    protected get injector(): Injector {
        return this.handler.injector;
    }

    /**
     * micro client handler.
     * 微服务客户端处理器
     */
    protected abstract get handler(): ClientHandler<TRequest, TResponse>;

    /**
     * micro client config.
     * 微服务客户端配置
     */
    protected abstract get config(): ClientConfig<TRequest, TResponse>;

    /**
     * Sends a request to microservice.
     * 向微服务发送请求
     */
    send<R = any>(pattern: Pattern, options?: TReqOptions): Observable<R>;
    send(req: TRequest): Observable<TResponse>;
    send(req: TRequest | Pattern, options?: TReqOptions): Observable<any> {
        if (!req) {
            return throwError(() => new ArgumentException('Invalid message'));
        }
        return defer(() => this.injector.ready)
            .pipe(
                mergeMap(() => this.discover()),
                catchError((err, caught) => {
                    return throwError(() => this.onError(err));
                }),
                mergeMap(() => this.handleRequest(req, options))
            );
    }

    /**
     * Discover service instance via service discovery.
     * 通过服务发现发现服务实例
     */
    protected discover(): Promise<any> | Observable<any> {
        // Default: no discovery, override in concrete implementations
        return Promise.resolve();
    }

    /**
     * Handle request with load balancing.
     * 通过负载均衡处理请求
     */
    protected handleRequest(first: Pattern | TRequest, options: TReqOptions = {} as any): Observable<any> {
        const req = this.buildRequest(first, options);
        let context = options.context;
        if (!context) {
            context = createRequestContext(this.injector);
            context.set(REQUEST, req as any);
            this.initContext(context, req);
        }
        return this.handler.handle(req, context);
    }

    /**
     * Build request from pattern and options.
     * 根据模式和选项构建请求
     */
    protected abstract buildRequest(first: TRequest | Pattern, options: TReqOptions & ResponseAs): TRequest;

    /**
     * Initialize request context.
     * 初始化请求上下文
     */
    protected abstract initContext(context: Context, req: TRequest): void;

    protected onError(err: Error): Error {
        return err;
    }

    @Shutdown()
    close(): Promise<void> {
        this.injector.onDestroy();
        return this.onShutdown();
    }

    /**
     * Shutdown handler.
     * 关闭处理器
     */
    protected abstract onShutdown(): Promise<void>;
}

/**
 * Response as options.
 * 响应类型选项
 */
export interface ResponseAs {
    observe?: 'body' | 'events' | 'response' | 'emit';
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
}
