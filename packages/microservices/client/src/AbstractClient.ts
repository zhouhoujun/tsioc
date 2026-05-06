import { Abstract, ArgumentException, Context, Injector, Optional } from '@tsdi/ioc';
import { Shutdown } from '@tsdi/core';
import { Pattern, RequestOptions, createRequestContext, RequestContext, REQUEST, ResponseAs } from '@tsdi/common';
import { defer, Observable, throwError, catchError, finalize, mergeMap, of, concatMap, map, timeout } from 'rxjs';
import { ClientHandler } from './ClientHandler';
import { IClientDiscoveryStrategy, CLIENT_DISCOVERY_STRATEGY } from './strategies/IClientDiscoveryStrategy';
import { ILoadBalanceStrategy, LOAD_BALANCE_STRATEGY } from './strategies/ILoadBalanceStrategy';
import { ICircuitBreakerStrategy, CIRCUIT_BREAKER_STRATEGY } from './strategies/ICircuitBreakerStrategy';
import { IRetryStrategy, RETRY_STRATEGY } from './strategies/IRetryStrategy';

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
    protected get discoveryStrategy(): IClientDiscoveryStrategy | null {
        return this.injector.get(CLIENT_DISCOVERY_STRATEGY, null);
    }

    /**
     * Optional load balance strategy.
     * 可选的负载均衡策略
     */
    protected get loadBalanceStrategy(): ILoadBalanceStrategy | null {
        return this.injector.get(LOAD_BALANCE_STRATEGY, null);
    }

    /**
     * Optional circuit breaker strategy.
     * 可选的断路器策略
     */
    protected get circuitBreakerStrategy(): ICircuitBreakerStrategy | null {
        return this.injector.get(CIRCUIT_BREAKER_STRATEGY, null);
    }

    /**
     * Optional retry strategy.
     * 可选的重试策略
     */
    protected get retryStrategy(): IRetryStrategy | null {
        return this.injector.get(RETRY_STRATEGY, null);
    }

    /**
     * Sends a request to microservice.
     * 向微服务发送请求
     */
    send<R = any>(pattern: Pattern, options?: TReqOptions & {
        observe?: 'body';
        responseType?: 'json';
    }): Observable<R>;
    send(req: TRequest): Observable<TResponse>;
    send(req: TRequest | Pattern, options?: TReqOptions & ResponseAs): Observable<any> {
        if (!req) {
            return throwError(() => new ArgumentException('Invalid message'));
        }
        return defer(() => this.injector.ready)
            .pipe(
                mergeMap(() => this.strategyDiscover()),
                catchError((err) => {
                    return throwError(() => this.onError(err));
                }),
                mergeMap(() => this.strategyChooseServer()),
                mergeMap(() => this.request(req, options)),
                this.strategyApplyCircuitBreaker(),
                this.strategyApplyRetry()
            );
    }

    /**
     * Discover service instance via discovery strategy.
     * 通过服务发现策略发现服务
     */
    protected strategyDiscover(): Promise<any> | Observable<any> {
        const strategy = this.discoveryStrategy;
        if (strategy) {
            return strategy.discover();
        }
        return this.discover();
    }

    /**
     * Choose server via load balance strategy.
     * 通过负载均衡策略选择服务实例
     */
    protected strategyChooseServer(): Promise<any> | Observable<any> {
        const strategy = this.loadBalanceStrategy;
        if (strategy) {
            return strategy.chooseServer();
        }
        return Promise.resolve();
    }

    /**
     * Apply circuit breaker via strategy.
     * 通过断路器策略应用断路器
     */
    protected strategyApplyCircuitBreaker<T>(): (source: Observable<T>) => Observable<T> {
        const strategy = this.circuitBreakerStrategy;
        if (strategy) {
            return (source) => source.pipe(
                catchError(err => {
                    if (strategy.isOpen()) {
                        return throwError(() => strategy.getOpenError());
                    }
                    return source;
                })
            );
        }
        return <T>(source: Observable<T>) => source;
    }

    /**
     * Apply retry via retry strategy.
     * 通过重试策略应用重试
     */
    protected strategyApplyRetry<T>(): (source: Observable<T>) => Observable<T> {
        const strategy = this.retryStrategy;
        if (strategy) {
            // Retry will be handled via the strategy's retry operator
            return (source) => strategy.retry(source);
        }
        return <T>(source: Observable<T>) => source;
    }

    protected request(first: Pattern | TRequest, options: TReqOptions & {
        observe?: 'body';
        responseType?: 'json';
    } = {} as any): Observable<any> {
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
     * Legacy discover method - override in concrete implementations.
     * 传统服务发现方法 - 在具体实现中覆盖
     */
    protected discover(): Promise<any> | Observable<any> {
        return Promise.resolve();
    }

    /**
     * Legacy init context method - override in concrete implementations.
     * 传统初始化上下文方法 - 在具体实现中覆盖
     */
    protected abstract initContext(context: Context, req: TRequest): void;

    @Shutdown()
    close(): Promise<void> {
        this.injector.onDestroy();
        return this.strategyOnShutdown();
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
