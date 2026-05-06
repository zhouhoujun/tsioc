import { ArgumentException, ProvdierOf, Provider, StaticProvider, isArray, isBoolean, isFunction, toProvider, toProviders, token } from '@tsdi/ioc';
import { GuardLike } from '@tsdi/core';
import {
    matchTransport, TransportConfig, RequestInterceptorLike, TransferInterceptorFactory,
    UrlClientIncomingFactory, TopicClientIncomingFactory, AbstractRequest, ResponseEvent, RequestFilterLike,
} from '@tsdi/common';
import { getClientFiltersToken, getClientGuardsToken, getClientInterceptorsToken, getClientTransfersToken } from './tokens';
import { ClientConfig, CircuitBreakerOptions, DiscoveryOptions, LoadBalanceOptions, RetryOptions, ClientFeatureOptions } from './options';



/**
 * Identifies a particular kind of `ClientFeature`.
 * 标识特定类型的微客户端特性
 * @publicApi
 */
export enum ClientFeatureKind {
    Configure,
    Guards,
    Filters,
    Interceptors,
    BodySerialize,
    Fetch,
    ResponseEvent,
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


/**
 * Adds service discovery to the micro client, like Spring Cloud Eureka/Consul.
 * 添加服务发现到微服务客户端，类似 Spring Cloud Eureka/Consul
 * @see {@link provideClient}
 * @publicApi
 */
export function withDiscovery(options?: boolean | DiscoveryOptions): ClientFeatureFn<ClientFeatureKind.Discovery> {
    return (config) => {
        return makeClientFeature(
            ClientFeatureKind.Discovery,
            [
                { provide: MICRO_CLIENT_DISCOVERY_OPTIONS, useValue: isBoolean(options) ? {} : (options ?? {}) }
            ],
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
export function withLoadBalance(options?: boolean | LoadBalanceOptions): ClientFeatureFn<ClientFeatureKind.LoadBalance> {
    return (config) => {
        return makeClientFeature(
            ClientFeatureKind.LoadBalance,
            [
                { provide: MICRO_CLIENT_LOADBALANCE_OPTIONS, useValue: isBoolean(options) ? {} : (options ?? {}) }
            ],
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
export function withCircuitBreaker(options?: boolean | CircuitBreakerOptions): ClientFeatureFn<ClientFeatureKind.CircuitBreaker> {
    return (config) => {
        return makeClientFeature(
            ClientFeatureKind.CircuitBreaker,
            [
                { provide: MICRO_CLIENT_CIRCUIT_BREAKER_OPTIONS, useValue: isBoolean(options) ? {} : (options ?? {}) }
            ],
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
export function withRetry(options?: boolean | RetryOptions): ClientFeatureFn<ClientFeatureKind.Retry> {
    return (config) => {
        return makeClientFeature(
            ClientFeatureKind.Retry,
            [
                { provide: MICRO_CLIENT_RETRY_OPTIONS, useValue: isBoolean(options) ? {} : (options ?? {}) }
            ],
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
export function withClientInterceptors(
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
export function withClientGuards(...guards: ProvdierOf<GuardLike>[]): ClientFeatureFn<ClientFeatureKind.Guards> {
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
export function withClientFilters(...filters: ProvdierOf<RequestFilterLike>[]): ClientFeatureFn<ClientFeatureKind.Filters> {
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
export function withClientTransfers(
    ...selectors: TransferInterceptorFactory[]
): ClientFeatureFn<ClientFeatureKind.Transfer> {
    return (config) => {
        const tk = getClientTransfersToken(config);
        const providers: Provider[] = [
            UrlClientIncomingFactory,
            TopicClientIncomingFactory,
        ];
        if (!selectors.length && config.features.defaultTransfer) {
            selectors.push(config.features.defaultTransfer);
        }
        selectors.forEach((fac) => {
            const itps = fac(config);
            if (isArray(itps)) {
                providers.push(...toProviders(tk, itps, true));
            } else {
                providers.push(toProvider(tk, itps, true));
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
    discovery: true,
    loadBalance: true,
    circuitBreaker: false,
    retry: false
};

/**
 * Combined feature builder for micro client, like Spring Cloud @EnableDiscoveryClient.
 * 微服务客户端组合特性构建器，类似 Spring Cloud @EnableDiscoveryClient
 * @see {@link provideClient}
 * @publicApi
 */
export function withClientFeatures(options?: ClientFeatureOptions): ClientFeatureFn<Exclude<ClientFeatureKind, ClientFeatureKind.Transport>> {
    const opts = { ...defaultClientOptions, ...options };
    return (config) => {
        const features: any[] = [];
        if (opts.filters) {
            features.push(withClientFilters(...opts.filters)(config));
        }
        if (opts.interceptors) {
            features.push(withClientInterceptors(...opts.interceptors)(config));
        }
        if (opts.guards) {
            features.push(withClientGuards(...opts.guards)(config));
        }
        if (opts.discovery) {
            features.push(withDiscovery(opts.discovery)(config));
        }
        if (opts.loadBalance) {
            features.push(withLoadBalance(opts.loadBalance)(config));
        }
        if (opts.circuitBreaker) {
            features.push(withCircuitBreaker(opts.circuitBreaker)(config));
        }
        if (opts.retry) {
            features.push(withRetry(opts.retry)(config));
        }

        features.push(withClientTransfers(...(isArray(opts.transfers) ? opts.transfers : []))(config));

        return features;
    }
}


export interface ClientOptions<
    TReq extends AbstractRequest<any> = AbstractRequest<any>,
    TRes extends ResponseEvent<any> = ResponseEvent<any>,
> extends ClientConfig<TReq, TRes> {
    transportFeature?: (options: ClientOptions<TReq, TRes>, asDefault?: boolean) => ClientTransportFeature;
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
                    features.push(withClientFeatures(config.features));
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
