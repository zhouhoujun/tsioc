import { Abstract, ArgumentException, Context, Injector, Optional } from '@tsdi/ioc';
import { Shutdown } from '@tsdi/core';
import { Pattern, RequestOptions, createRequestContext, RequestContext, REQUEST, ResponseAs } from '@tsdi/common';
import { defer, Observable, throwError, catchError, finalize, mergeMap, of, concatMap } from 'rxjs';
import { ClientHandler } from './ClientHandler';
import { ClientDiscoveryStrategy } from './strategies/ClientDiscoveryStrategy';

/**
 * Abstract microservice client. Extends base client with Spring Cloud-style features.
 * 抽象微服务客户端，扩展基础客户端添加 Spring Cloud 风格特性
 */
@Abstract()
export abstract class AbstractClient<
    TRequest,
    TResponse,
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
     * Optional discovery strategy for service discovery.
     * 可选的服务发现策略
     */
    protected get discoveryStrategy(): ClientDiscoveryStrategy | null {
        return this.injector.get(ClientDiscoveryStrategy, null);
    }

    /**
     * Sends a request to microservice.
     * 向微服务发送请求
     */
    send<R = any>(pattern: Pattern, options?: TReqOptions & {
        observe?: 'body';
        responseType?: 'json';
    }): Observable<R>;
    send<R = any>(pattern: Pattern, options: TReqOptions & {
        observe: 'response' | 'emit' | 'observe';
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
    }): Observable<R>;
    send(req: TRequest): Observable<TResponse>;
    send(req: TRequest | Pattern, options?: TReqOptions & ResponseAs): Observable<unknown> {
        if (!req) {
            return throwError(() => new ArgumentException('Invalid message'));
        }
        return defer(() => this.injector.ready)
            .pipe(
                mergeMap(() => this.request(req, options)),
                catchError((err) => throwError(() => this.onError(err)))
            );
    }

    protected request(first: Pattern | TRequest, options: TReqOptions & {
        observe?: 'body';
        responseType?: 'json';
    } = {} as TReqOptions & { observe?: 'body'; responseType?: 'json' }): Observable<unknown> {
        const req = this.buildRequest(first, options);
        let context = options.context;
        if (!context) {
            context = createRequestContext(this.injector);
            context.set(REQUEST, req as any);
            this.strategyInitContext(context, req);
        }
        return of(req).pipe(
                concatMap((req: TRequest) => this.handler.handle(req, context)),
                finalize(() => context.onDestroy())
            );
    }

    protected onError(err: Error): Error {
        return err;
    }

    /**
     * Initialize context using strategy if available.
     * 使用策略初始化上下文（如果可用）
     */
    protected strategyInitContext(context: RequestContext, req: TRequest): void {
        // Let concrete implementation handle this
        this.initContext(context, req);
    }

    /**
     * build request.
     * 构建请求
     */
    protected abstract buildRequest(first: TRequest | Pattern, options: TReqOptions & ResponseAs): TRequest;

    /**
     * Legacy init context method - override in concrete implementations.
     * 传统初始化上下文方法 - 在具体实现中覆盖
     */
    protected abstract initContext(context: Context, req: TRequest): void;

    @Shutdown()
    async close(): Promise<void> {
        try {
            await this.strategyOnShutdown();
        } finally {
            this.injector.onDestroy();
        }
    }

    /**
     * Shutdown using strategies if available.
     * 使用策略关闭（如果可用）
     */
    protected strategyOnShutdown(): Promise<void> {
        // Shutdown all strategies
        const promises: Promise<void>[] = [];
        const discovery = this.discoveryStrategy;
        if (discovery) {
            promises.push(discovery.onShutdown());
        }
        return Promise.all(promises).then(() => this.onShutdown());
    }

    /**
     * Legacy shutdown method - override in concrete implementations.
     * 传统关闭方法 - 在具体实现中覆盖
     */
    protected abstract onShutdown(): Promise<void>;
}
