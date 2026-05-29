import { ProvdierOf, Provider, Token } from '@tsdi/ioc';
import { MessageReaderFactory } from '@tsdi/core';
import { PatternFormatter, RequestContext, RequestHandlerOptions, TransferConfig, TransferInterceptorFactory, TransferSide } from '@tsdi/common';
import { ConnectionPoolOptions } from './pool';



export enum ClientFeatureKind {
    Configure,
    Guards,
    Filters,
    Interceptors,
    BodySerialize,
    Fetch,
    Response,
    Transfer,
    Transport,
    Discovery,
    LoadBalance,
    CircuitBreaker,
    Retry
}

export interface ClientFeature<Kind extends ClientFeatureKind = ClientFeatureKind> {
    kind: Kind;
    config?: ClientConfig;
    providers: Provider[];
}

export interface ClientTransportFeature {
    kind: ClientFeatureKind.Transport;
    config: ClientConfig;
    providers: Provider[];
}

export type ClientFeatureFn<Kind extends Exclude<ClientFeatureKind, ClientFeatureKind.Transport>> = (config: ClientConfig) => ClientFeature<Kind> | ClientFeature<Kind>[];

export type ClientFeatureLike<Kind extends ClientFeatureKind> = ClientFeature<Kind> | ClientFeature<Kind>[] | ClientFeatureFn<Exclude<ClientFeatureKind, ClientFeatureKind.Transport>> | ClientFeatureFn<Exclude<ClientFeatureKind, ClientFeatureKind.Transport>>[];

export interface ClientFeatureOptions<TReq = any, TRes = any, TContext extends RequestContext = RequestContext> extends RequestHandlerOptions<TReq, TRes, TContext> {
    /**
     * timeout
     */
    timeout?: number;
    defaultTransfer?: TransferInterceptorFactory;
    discovery?: boolean | DiscoveryOptions;
    loadBalance?: boolean | LoadBalanceOptions;
    circuitBreaker?: boolean | CircuitBreakerOptions;
    retry?: boolean | RetryOptions;
    messageReaderFactory?: ProvdierOf<MessageReaderFactory>;
    messagerReaderFactory?: ProvdierOf<MessageReaderFactory>;
}



/**
 * Client options.
 */
export interface ClientConfig<TReq = any, TRes = any, TContext extends RequestContext = RequestContext> extends TransferConfig {

    side: TransferSide.client;

    features: ClientFeatureOptions<TReq, TRes, TContext>;
    /**
     * url
     */
    url?: string;
    // /**
    //  * authority base url.
    //  */
    // authority?: string;

    formatter?: Token<PatternFormatter>;
    /**
     * as default client or not.
     */
    asDefault?: boolean;

    /**
     * connection pool options.
     */
    pool?: ConnectionPoolOptions;

}

/**
 * Service discovery options.
 * 服务发现选项
 */
export interface DiscoveryOptions {
    /**
     * discovery server host.
     * 发现服务器地址
     */
    host?: string;
    /**
     * discovery server port.
     * 发现服务器端口
     */
    port?: number;
    /**
     * service name to discover.
     * 要发现的服务名称
     */
    serviceName?: string;
    /**
     * prefer ip address or not.
     * 是否优先使用IP地址
     */
    preferIpAddress?: boolean;
    /**
     * heartbeat interval in milliseconds.
     * 心跳间隔（毫秒）
     */
    heartbeatInterval?: number;
}

/**
 * Load balance strategy type.
 * 负载均衡策略类型
 */
export enum LoadBalanceStrategy {
    /**
     * round robin strategy.
     * 轮询策略
     */
    RoundRobin,
    /**
     * random strategy.
     * 随机策略
     */
    Random,
    /**
     * weighted round robin strategy.
     * 加权轮询策略
     */
    WeightedRoundRobin,
    /**
     * least connections strategy.
     * 最少连接策略
     */
    LeastConnections
}

/**
 * Load balance options.
 * 负载均衡选项
 */
export interface LoadBalanceOptions {
    /**
     * load balance strategy.
     * 负载均衡策略
     */
    strategy?: LoadBalanceStrategy;
    /**
     * retry on same instance or not.
     * 是否在同一实例上重试
     */
    retryOnSame?: boolean;
    /**
     * service instances cache ttl in milliseconds.
     * 服务实例缓存过期时间（毫秒）
     */
    cacheTtl?: number;
}

/**
 * Circuit breaker options, like Spring Cloud Resilience4j.
 * 断路器选项，类似 Spring Cloud Resilience4j
 */
export interface CircuitBreakerOptions {
    /**
     * failure rate threshold (0-1) to open circuit.
     * 打开断路器的失败率阈值（0-1）
     */
    failureRateThreshold?: number;
    /**
     * slow call rate threshold (0-1).
     * 慢调用率阈值（0-1）
     */
    slowCallRateThreshold?: number;
    /**
     * wait duration in open state in milliseconds.
     * 断路器打开状态等待时间（毫秒）
     */
    waitDurationInOpenState?: number;
    /**
     * permitted number of calls in half-open state.
     * 半开状态允许的调用数量
     */
    permittedNumberOfCallsInHalfOpenState?: number;
    /**
     * sliding window size.
     * 滑动窗口大小
     */
    slidingWindowSize?: number;
    /**
     * slow call duration threshold in milliseconds.
     * 慢调用持续时间阈值（毫秒）
     */
    slowCallDurationThreshold?: number;
}

/**
 * Retry options, like Spring Cloud Retry.
 * 重试选项，类似 Spring Cloud Retry
 */
export interface RetryOptions {
    /**
     * max retry attempts.
     * 最大重试次数
     */
    maxAttempts?: number;
    /**
     * wait duration between retries in milliseconds.
     * 重试间隔等待时间（毫秒）
     */
    waitDuration?: number;
    /**
     * retry on which exceptions.
     * 对哪些异常进行重试
     */
    retryOnExceptions?: (new (...args: any[]) => Error)[];
    /**
     * exponential backoff multiplier.
     * 指数退避乘数
     */
    backoffMultiplier?: number;
}

export interface ClientOptions<TReq = any, TRes = any, TContext extends RequestContext = RequestContext> extends ClientConfig<TReq, TRes, TContext> {
    messageReaderFactory?: ProvdierOf<MessageReaderFactory>;
    transportFeature?: (options: ClientOptions<TReq, TRes, TContext>, asDefault?: boolean) => ClientTransportFeature;
}

export function resolveClientMessageReaderFactory<TReq = any, TRes = any, TContext extends RequestContext = RequestContext>(
    options: Partial<ClientOptions<TReq, TRes, TContext>>,
    defaultFactory: ProvdierOf<MessageReaderFactory>
): ProvdierOf<MessageReaderFactory> {
    return options.messageReaderFactory
        ?? options.features?.messageReaderFactory
        ?? options.features?.messagerReaderFactory
        ?? defaultFactory;
}
