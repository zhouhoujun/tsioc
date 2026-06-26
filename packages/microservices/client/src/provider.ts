import { ArgumentException, Injector, ProvdierOf, Provider, StaticProvider, isArray, isBoolean, isFunction, toProvider, toProviders, token } from '@tsdi/ioc';
import { GuardLike } from '@tsdi/core';
import {
    matchTransport, TransportConfig, RequestInterceptorLike, TransferFilterFactory,
    AbstractRequest, ResponseEvent, RequestFilterLike, RequestHandlerLike, RequestContext,
} from '@tsdi/common';
import { getClientFiltersToken, getClientGuardsToken, getClientInterceptorsToken, getClientTransferFiltersToken } from './tokens';
import { ClientConfig, CircuitBreakerOptions, DiscoveryOptions, LoadBalanceOptions, RetryOptions, ClientFeatureOptions, ClientFeature, ClientFeatureFn, ClientFeatureKind, ClientFeatureLike, ClientOptions, ClientTransportFeature } from './options';
import { requestTimeoutInterceptor } from './interceptors/timeout';
import { loadBalanceInterceptor, circuitBreakerInterceptor, discoverInterceptor, retryInterceptor } from './interceptors/features';
import { CircuitBreakerStrategy } from './strategies/CircuitBreakerStrategy';
import { ClientDiscoveryStrategy } from './strategies/ClientDiscoveryStrategy';
import { ClientLoadBalanceStrategy } from './strategies/LoadBalanceStrategy';
import { RetryStrategy } from './strategies/RetryStrategy';
import { DefaultCircuitBreakerStrategy, DefaultClientDiscoveryStrategy, DefaultClientLoadBalanceStrategy, DefaultRetryStrategy } from './strategies/defaults';



/**
 * Configures microservice client with features, like Spring Cloud.
 * 配置微服务客户端特性，类似 Spring Cloud
 * @param features
 * @returns
 */
export function provideClient(...features: ClientFeatureLike<ClientFeatureKind>[]): Provider[] {

    const allFeatures = features.flatMap(f => f as (ClientFeature<ClientFeatureKind> | ClientFeatureFn<Exclude<ClientFeatureKind, ClientFeatureKind.Transport>>));
    const transports = allFeatures.filter(f => !isFunction(f) && f.kind === ClientFeatureKind.Transport) as ClientTransportFeature[];

    if (!transports.length) {
        throw new ArgumentException('micro client transport feature is required.');
    }

    const providers: Provider[] = [];

    transports.forEach(ts => {
        const kinds = new Map<ClientFeatureKind, Provider[]>();
        const config = ts.config as ClientConfig & TransportConfig;
        allFeatures.forEach(f => {
            if ((f as ClientTransportFeature).kind === ClientFeatureKind.Transport) {
                return;
            }
            const fs = isFunction(f) ? f(config) : f;
            (isArray(fs) ? fs : [fs]).forEach(feature => {
                if (feature.config && !matchTransport(feature.config, config)) {
                    return;
                }
                const pdrs = kinds.get(feature.kind);
                if (pdrs) {
                    pdrs.push(...feature.providers);
                } else {
                    kinds.set(feature.kind, feature.providers.slice(0));
                }
            });
        });

        if (!kinds.has(ClientFeatureKind.Transfer)) {
            const transferFeature = withTransfers()(config);
            const transfers = Array.isArray(transferFeature) ? transferFeature : [transferFeature];
            transfers.forEach(feature => {
                const pdrs = kinds.get(feature.kind);
                if (pdrs) {
                    pdrs.push(...feature.providers);
                } else {
                    kinds.set(feature.kind, feature.providers.slice(0));
                }
            });
        }

        Array.from(kinds.keys()).sort((a, b) => a - b).forEach(k => {
            providers.push(...kinds.get(k)!);
        });

        providers.push(
            ...ts.providers
        );

    });

    return providers;

}

export function makeClientFeature<T extends ClientFeatureKind>(kind: T, providers: Provider[], config?: ClientConfig): ClientFeature<T> {
    return {
        kind,
        config,
        providers
    }
}

function normalizeClientTransferFilters(result: any): RequestFilterLike[] {
    const filters = result && !isArray(result) && result.filters ? result.filters : (isArray(result) ? result : [result]);
    return (filters ?? []).filter(Boolean).filter((item: any) => isFunction(item) || typeof item?.doFilter === 'function');
}

export function resolveClientTransferFilters<TReq = any, TRes = any>(
    injector: Injector,
    config: ClientConfig<TReq, TRes>
): RequestFilterLike<TReq, TRes, RequestContext>[] {
    const transferToken = getClientTransferFiltersToken(config);
    const registered = injector.get(transferToken, null) as RequestFilterLike<TReq, TRes, RequestContext>[] | null;
    if (registered?.length) {
        return registered;
    }
    if (config.features.defaultTransfer) {
        return normalizeClientTransferFilters(config.features.defaultTransfer(config)) as RequestFilterLike<TReq, TRes, RequestContext>[];
    }
    return [];
}

export function wrapClientBackendWithTransfer<TReq = any, TRes = any>(
    injector: Injector,
    config: ClientConfig<TReq, TRes>,
    backend: RequestHandlerLike<TReq, TRes, RequestContext>
): RequestHandlerLike<TReq, TRes, RequestContext> {
    const transferFilters = resolveClientTransferFilters(injector, config);
    if (!transferFilters.length) {
        return backend;
    }
    return ((input: TReq, context: RequestContext) => {
        const chain = transferFilters.reduceRight<(req: TReq, ctx: RequestContext) => any>((next, filterLike) => {
            const filterFn = isFunction(filterLike)
                ? filterLike as any
                : (req: TReq, downstream: any, ctx: RequestContext) => filterLike.doFilter(req, { handle: downstream }, ctx);
            return (req: TReq, ctx: RequestContext) => filterFn(req, (innerReq: TReq, innerCtx: RequestContext) => next(innerReq, innerCtx), ctx);
        }, (req: TReq, ctx: RequestContext) => isFunction(backend) ? backend(req, ctx) : backend.handle(req, ctx));
        return chain(input, context);
    }) as RequestHandlerLike<TReq, TRes, RequestContext>;
}

function isStrategyProvider<T>(value: any): value is ProvdierOf<T> {
    return isFunction(value) || (!!value && typeof value === 'object' && (
        'useClass' in value ||
        'useValue' in value ||
        'useFactory' in value ||
        'useExisting' in value
    ));
}

function normalizeFeatureOptions<T>(options?: T): T {
    return (options ?? {}) as T;
}

function buildStrategyFeatureProviders<TOptions, TStrategy>(
    config: ClientConfig,
    strategyToken: any,
    optionsToken: any,
    interceptor: RequestInterceptorLike,
    defaultFactory: new (options: TOptions) => TStrategy,
    input?: TOptions | ProvdierOf<RequestInterceptorLike>
): Provider[] {
    const interceptorToken = getClientInterceptorsToken(config);
    if (isStrategyProvider<RequestInterceptorLike>(input)) {
        return [toProvider(interceptorToken, input, true)];
    }
    const options = normalizeFeatureOptions<TOptions>(input as TOptions | undefined);
    return [
        { provide: optionsToken, useValue: options },
        { provide: strategyToken, useFactory: (opts: TOptions) => new defaultFactory(opts), deps: [optionsToken] },
        { provide: interceptorToken, useValue: interceptor, multi: true }
    ];
}


/**
 * Adds service discovery to the micro client, like Spring Cloud Eureka/Consul.
 * 添加服务发现到微服务客户端，类似 Spring Cloud Eureka/Consul
 * @see {@link provideClient}
 * @publicApi
 */
export function withDiscovery(options?: DiscoveryOptions | ProvdierOf<RequestInterceptorLike>): ClientFeatureFn<ClientFeatureKind.Discovery> {
    return (config) => {
        return makeClientFeature(
            ClientFeatureKind.Discovery,
            buildStrategyFeatureProviders<DiscoveryOptions, ClientDiscoveryStrategy>(
                config,
                ClientDiscoveryStrategy,
                MICRO_CLIENT_DISCOVERY_OPTIONS,
                discoverInterceptor,
                DefaultClientDiscoveryStrategy,
                options
            ),
            config
        );
    }
}

/**
 * Adds load balancing to the micro client, like Spring Cloud LoadBalancer/Ribbon.
 * 添加负载均衡到微服务客户端，类似 Spring Cloud LoadBalancer/Ribbon
 * @see {@link provideClient}
 * @publicApi
 */
export function withLoadBalance(options?: LoadBalanceOptions | ProvdierOf<RequestInterceptorLike>): ClientFeatureFn<ClientFeatureKind.LoadBalance> {
    return (config) => {
        return makeClientFeature(
            ClientFeatureKind.LoadBalance,
            buildStrategyFeatureProviders<LoadBalanceOptions, ClientLoadBalanceStrategy>(
                config,
                ClientLoadBalanceStrategy,
                MICRO_CLIENT_LOADBALANCE_OPTIONS,
                loadBalanceInterceptor,
                DefaultClientLoadBalanceStrategy,
                options
            ),
            config
        );
    }
}

/**
 * Adds circuit breaker to the micro client, like Spring Cloud Resilience4j.
 * 添加断路器到微服务客户端，类似 Spring Cloud Resilience4j
 * @see {@link provideClient}
 * @publicApi
 */
export function withCircuitBreaker(options?: CircuitBreakerOptions | ProvdierOf<RequestInterceptorLike>): ClientFeatureFn<ClientFeatureKind.CircuitBreaker> {
    return (config) => {
        return makeClientFeature(
            ClientFeatureKind.CircuitBreaker,
            buildStrategyFeatureProviders<CircuitBreakerOptions, CircuitBreakerStrategy>(
                config,
                CircuitBreakerStrategy,
                MICRO_CLIENT_CIRCUIT_BREAKER_OPTIONS,
                circuitBreakerInterceptor,
                DefaultCircuitBreakerStrategy,
                options
            ),
            config
        );
    }
}

/**
 * Adds retry policy to the micro client, like Spring Cloud Retry.
 * 添加重试策略到微服务客户端，类似 Spring Cloud Retry
 * @see {@link provideClient}
 * @publicApi
 */
export function withRetry(options?: RetryOptions | ProvdierOf<RequestInterceptorLike>): ClientFeatureFn<ClientFeatureKind.Retry> {
    return (config) => {
        return makeClientFeature(
            ClientFeatureKind.Retry,
            buildStrategyFeatureProviders<RetryOptions, RetryStrategy>(
                config,
                RetryStrategy,
                MICRO_CLIENT_RETRY_OPTIONS,
                retryInterceptor,
                DefaultRetryStrategy,
                options
            ),
            config
        );
    }
}

/**
 * Adds timeout interceptor to the micro client.
 * 添加超时拦截器到微服务客户端
 * @see {@link provideClient}
 * @publicApi
 */
export function withTimeout(timeout?: number): ClientFeatureFn<ClientFeatureKind.Interceptors> {
    return (config) => {
        const tk = getClientInterceptorsToken(config);
        return makeClientFeature(
            ClientFeatureKind.Interceptors,
            [{
                provide: tk,
                useValue: requestTimeoutInterceptor(timeout),
                multi: true
            }],
            config
        );
    }
}

/**
 * Adds interceptors to the micro client.
 * 添加拦截器到微服务客户端
 * @see {@link provideClient}
 * @publicApi
 */
export function withInterceptors(
    ...interceptors: ProvdierOf<RequestInterceptorLike>[]
): ClientFeatureFn<ClientFeatureKind.Interceptors> {
    return (config) => {
        const tk = getClientInterceptorsToken(config);
        return makeClientFeature(
            ClientFeatureKind.Interceptors,
            interceptors.map((u) => toProvider(tk, u, true)),
            config
        );
    }
}

/**
 * Adds guards to the micro client.
 * 添加守卫到微服务客户端
 * @see {@link provideClient}
 * @publicApi
 */
export function withGuards(...guards: ProvdierOf<GuardLike>[]): ClientFeatureFn<ClientFeatureKind.Guards> {
    return (config) => {
        const tk = getClientGuardsToken(config);
        return makeClientFeature(
            ClientFeatureKind.Guards,
            guards.map((f) => toProvider(tk, f, true)),
            config
        );
    }
}

/**
 * Adds filters to the micro client.
 * 添加过滤器到微服务客户端
 * @see {@link provideClient}
 * @publicApi
 */
export function withFilters(...filters: ProvdierOf<RequestFilterLike>[]): ClientFeatureFn<ClientFeatureKind.Filters> {
    return (config) => {
        const tk = getClientFiltersToken(config);
        return makeClientFeature(
            ClientFeatureKind.Filters,
            filters.map((f) => toProvider(tk, f, true)),
            config
        );
    }
}

/**
 * Adds transfer interceptors to the micro client.
 * 添加传输拦截器到微服务客户端
 * @see {@link provideClient}
 * @publicApi
 */
export function withTransfers(
    ...selectors: TransferFilterFactory[]
): ClientFeatureFn<ClientFeatureKind.Transfer> {
    return (config) => {
        const filterToken = getClientTransferFiltersToken(config);
        const providers: Provider[] = [];
        const resolvedSelectors = selectors.length ? selectors : (config.features.defaultTransfer ? [config.features.defaultTransfer] : []);
        resolvedSelectors.forEach((fac) => {
            const result = fac(config) as any;
            const filters = result && !isArray(result) && result.filters ? result.filters : (isArray(result) ? result : [result]);
            const normalized = (filters ?? []).filter(Boolean);
            if (normalized.length) {
                providers.push(...toProviders(filterToken, normalized, true));
            }
        });
        return makeClientFeature(
            ClientFeatureKind.Transfer,
            providers,
            config
        );
    }
}


export const MICRO_CLIENT_DISCOVERY_OPTIONS = token<DiscoveryOptions>('MICRO_CLIENT_DISCOVERY_OPTIONS');
export const MICRO_CLIENT_LOADBALANCE_OPTIONS = token<LoadBalanceOptions>('MICRO_CLIENT_LOADBALANCE_OPTIONS');
export const MICRO_CLIENT_CIRCUIT_BREAKER_OPTIONS = token<CircuitBreakerOptions>('MICRO_CLIENT_CIRCUIT_BREAKER_OPTIONS');
export const MICRO_CLIENT_RETRY_OPTIONS = token<RetryOptions>('MICRO_CLIENT_RETRY_OPTIONS');



const defaultClientOptions: Partial<ClientFeatureOptions> = {
    discovery: {},
    loadBalance: {},
    circuitBreaker: false,
    retry: false
};

/**
 * Combined feature builder for micro client, like Spring Cloud @EnableDiscoveryClient.
 * 微服务客户端组合特性构建器，类似 Spring Cloud @EnableDiscoveryClient
 * @see {@link provideClient}
 * @publicApi
 */
export function withFeatures(options?: ClientFeatureOptions): ClientFeatureFn<Exclude<ClientFeatureKind, ClientFeatureKind.Transport>> {
    const opts = { ...defaultClientOptions, ...options };
    return (config) => {
        const features: any[] = [];
        if (opts.filters) {
            features.push(withFilters(...opts.filters)(config));
        }
        if (opts.interceptors) {
            features.push(withInterceptors(...opts.interceptors)(config));
        }
        if (opts.guards) {
            features.push(withGuards(...opts.guards)(config));
        }
        if (opts.discovery) {
            features.push(withDiscovery(isBoolean(opts.discovery) ? undefined : opts.discovery)(config));
        }
        if (opts.loadBalance) {
            features.push(withLoadBalance(isBoolean(opts.loadBalance) ? undefined : opts.loadBalance)(config));
        }
        if (opts.circuitBreaker) {
            features.push(withCircuitBreaker(isBoolean(opts.circuitBreaker) ? undefined : opts.circuitBreaker)(config));
        }
        if (opts.retry) {
            features.push(withRetry(isBoolean(opts.retry) ? undefined : opts.retry)(config));
        }
        if (opts.timeout != null) {
            features.push(withTimeout(opts.timeout)(config));
        }

        features.push(withTransfers(...(isArray(opts.transfers) ? opts.transfers : []))(config));

        return features;
    }
}


export const CLIENT_CONFIGS = token<ClientOptions[]>('MICRO_CLIENT_CONFIGS');


/**
 * Provide micro client from DI.
 * 从依赖注入提供微服务客户端
 */
export function provideClientFromDi(options: TransportConfig): Provider[] {
    return [
        {
            provider: (injector) => {
                const configs = injector.get(CLIENT_CONFIGS, []).filter(c => matchTransport(options, c));
                if (!configs.length) throw new ArgumentException(`messings ${options.transport} microservice client configure` + (options.name ? `, ailas with name ${options.name}` : ''));
                const features: ClientFeatureLike<ClientFeatureKind>[] = [];
                const transports: ClientTransportFeature[] = [];
                configs.forEach(config => {
                    if (!config.transportFeature) throw new ArgumentException(`messings transportFeature ${options.transport} microservice client configure` + (options.name ? `, ailas with name ${options.name}` : ''));
                    features.push(withFeatures(config.features));
                    transports.push(config.transportFeature(config, configs.length == 1 && config.asDefault));
                });

                return provideClient(
                    ...features,
                    transports
                ) as StaticProvider[];
            }
        }
    ]
}
