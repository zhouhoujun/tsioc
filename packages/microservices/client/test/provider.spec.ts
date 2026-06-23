import expect = require('expect');
import { createInjector } from '@tsdi/ioc';
import { RequestInterceptorFn, Transport, TransferSide } from '@tsdi/common';
import {
    CLIENT_CONFIGS,
    MICRO_CLIENT_CIRCUIT_BREAKER_OPTIONS,
    MICRO_CLIENT_DISCOVERY_OPTIONS,
    MICRO_CLIENT_LOADBALANCE_OPTIONS,
    MICRO_CLIENT_RETRY_OPTIONS,
    provideClient,
    provideClientFromDi,
    withFeatures,
    withTransfers,
    withDiscovery,
    withLoadBalance,
    withCircuitBreaker,
    withRetry,
    withTimeout
} from '../src/provider';
import { ClientFeatureKind } from '../src/options';
import { getClientInterceptorsToken } from '../src/tokens';
import {
    CircuitBreakerStrategy,
    ClientDiscoveryStrategy,
    ClientLoadBalanceStrategy,
    DefaultCircuitBreakerStrategy,
    DefaultClientDiscoveryStrategy,
    DefaultClientLoadBalanceStrategy,
    DefaultRetryStrategy,
    RetryStrategy
} from '../src/strategies';

const createConfig = (name = 'alpha') => ({
    name,
    transport: Transport.TCP,
    side: TransferSide.client,
    microservice: true,
    features: {}
} as any);

const customFeatureInterceptor: RequestInterceptorFn = (input: any, next: any, context: any) => next({ ...input, custom: true }, context);

describe('client provider', () => {
    it('throws when transport feature is missing', () => {
        expect(() => provideClient(withDiscovery())).toThrow(/transport feature is required/);
    });

    it('orders feature providers before transport providers', () => {
        const config = createConfig();
        const providers = provideClient(
            withDiscovery(),
            withLoadBalance(),
            {
                kind: ClientFeatureKind.Transport,
                config,
                providers: [{ provide: 'transport-provider', useValue: 'transport-provider' }]
            }
        ) as any[];

        const names = providers.map((provider: any) => provider.provide);
        expect(names.indexOf(MICRO_CLIENT_DISCOVERY_OPTIONS)).toBeGreaterThanOrEqual(0);
        expect(names.indexOf(MICRO_CLIENT_LOADBALANCE_OPTIONS)).toBeGreaterThanOrEqual(0);
        expect(names.indexOf('transport-provider')).toBeGreaterThan(names.indexOf(MICRO_CLIENT_LOADBALANCE_OPTIONS));
    });

    it('ignores mismatched feature configs', () => {
        const config = createConfig('matched');
        const providers = provideClient(
            withDiscovery(),
            {
                kind: ClientFeatureKind.Filters,
                config: { ...config, name: 'other' },
                providers: [{ provide: 'should-not-appear', useValue: true }]
            },
            {
                kind: ClientFeatureKind.Transport,
                config,
                providers: []
            }
        ) as any[];

        expect(providers.some((provider: any) => provider.provide === 'should-not-appear')).toBe(false);
    });

    it('adds default discovery, loadBalance and transfer features', () => {
        const config = createConfig();
        const features = withFeatures()(config) as any[];
        const kinds = features.map(feature => feature.kind);
        expect(kinds).toContain(ClientFeatureKind.Discovery);
        expect(kinds).toContain(ClientFeatureKind.LoadBalance);
        expect(kinds).toContain(ClientFeatureKind.Transfer);
        expect(kinds).not.toContain(ClientFeatureKind.CircuitBreaker);
        expect(kinds).not.toContain(ClientFeatureKind.Retry);
    });

    it('uses explicit empty options when retry and circuit breaker are enabled', () => {
        const config = createConfig();
        const features = withFeatures({ retry: {}, circuitBreaker: {} })(config) as any[];
        const retry = features.find(feature => feature.kind === ClientFeatureKind.Retry);
        const breaker = features.find(feature => feature.kind === ClientFeatureKind.CircuitBreaker);
        const retryOptionProvider = retry.providers.find((provider: any) => provider.provide === MICRO_CLIENT_RETRY_OPTIONS);
        const breakerOptionProvider = breaker.providers.find((provider: any) => provider.provide === MICRO_CLIENT_CIRCUIT_BREAKER_OPTIONS);
        expect(retryOptionProvider.useValue).toEqual({});
        expect(breakerOptionProvider.useValue).toEqual({});
    });

    it('registers default strategies when feature options are provided', () => {
        const config = createConfig();
        const providers = provideClient(
            withDiscovery({ serviceName: 'svc-a' }),
            withLoadBalance({ cacheTtl: 3000 }),
            withCircuitBreaker({ slidingWindowSize: 3 }),
            withRetry({ maxAttempts: 2 }),
            {
                kind: ClientFeatureKind.Transport,
                config,
                providers: []
            }
        ) as any[];
        const injector = createInjector(providers);

        expect(injector.get(ClientDiscoveryStrategy)).toBeInstanceOf(DefaultClientDiscoveryStrategy);
        expect((injector.get(ClientDiscoveryStrategy) as DefaultClientDiscoveryStrategy).options).toEqual({ serviceName: 'svc-a' });
        expect(injector.get(ClientLoadBalanceStrategy)).toBeInstanceOf(DefaultClientLoadBalanceStrategy);
        expect((injector.get(ClientLoadBalanceStrategy) as DefaultClientLoadBalanceStrategy).options).toEqual({ cacheTtl: 3000 });
        expect(injector.get(CircuitBreakerStrategy)).toBeInstanceOf(DefaultCircuitBreakerStrategy);
        expect((injector.get(CircuitBreakerStrategy) as DefaultCircuitBreakerStrategy).options).toEqual({ slidingWindowSize: 3 });
        expect(injector.get(RetryStrategy)).toBeInstanceOf(DefaultRetryStrategy);
        expect((injector.get(RetryStrategy) as DefaultRetryStrategy).options).toEqual({ maxAttempts: 2 });
    });

    it('registers custom interceptors when feature receives ProvdierOf<RequestInterceptorLike>', () => {
        const config = createConfig();
        const providers = provideClient(
            withDiscovery(customFeatureInterceptor),
            withLoadBalance(customFeatureInterceptor),
            withCircuitBreaker(customFeatureInterceptor),
            withRetry(customFeatureInterceptor),
            {
                kind: ClientFeatureKind.Transport,
                config,
                providers: []
            }
        ) as any[];
        const injector = createInjector(providers);
        const interceptors = injector.get(getClientInterceptorsToken(config));

        expect(interceptors).toHaveLength(4);
        expect(interceptors.every((interceptor: any) => interceptor === customFeatureInterceptor)).toBe(true);
        expect(() => injector.get(ClientDiscoveryStrategy)).toThrow();
        expect(() => injector.get(ClientLoadBalanceStrategy)).toThrow();
        expect(() => injector.get(CircuitBreakerStrategy)).toThrow();
        expect(() => injector.get(RetryStrategy)).toThrow();
    });

    it('registers feature interceptors for discovery, load balance, circuit breaker and retry', () => {
        const config = createConfig();
        const interceptorToken = getClientInterceptorsToken(config);
        const discovery = withDiscovery()(config) as any;
        const loadBalance = withLoadBalance()(config) as any;
        const breakerFeatures = withFeatures({ circuitBreaker: {} })(config) as any[];
        const retryFeatures = withFeatures({ retry: {} })(config) as any[];
        const breaker = breakerFeatures.find((feature: any) => feature.kind === ClientFeatureKind.CircuitBreaker);
        const retry = retryFeatures.find((feature: any) => feature.kind === ClientFeatureKind.Retry);

        expect(discovery.providers.some((provider: any) => provider.provide === interceptorToken)).toBe(true);
        expect(loadBalance.providers.some((provider: any) => provider.provide === interceptorToken)).toBe(true);
        expect(breaker.providers.some((provider: any) => provider.provide === interceptorToken)).toBe(true);
        expect(retry.providers.some((provider: any) => provider.provide === interceptorToken)).toBe(true);
    });

    it('omits discovery and load balance features when disabled explicitly', () => {
        const config = createConfig();
        const features = withFeatures({ discovery: false, loadBalance: false })(config) as any[];
        const kinds = features.map(feature => feature.kind);
        expect(kinds).not.toContain(ClientFeatureKind.Discovery);
        expect(kinds).not.toContain(ClientFeatureKind.LoadBalance);
        expect(kinds).toContain(ClientFeatureKind.Transfer);
    });

    it('adds timeout interceptor when timeout feature is configured', () => {
        const config = createConfig();
        const features = withFeatures({ timeout: 1234 })(config) as any[];
        expect(features.some(feature => feature.kind === ClientFeatureKind.Interceptors)).toBe(true);
    });

    it('uses default transfer when no transfer factory is provided', () => {
        const config = createConfig();
        const transfer = withTransfers()({
            ...config,
            features: {
                defaultTransfer: () => [() => undefined]
            }
        } as any) as any;
        expect(transfer.providers.length).toBeGreaterThan(0);
    });

    it('uses default transfer without mutating selector state', () => {
        const config = createConfig();
        const transferFactory = () => [() => undefined];
        const featureA = withTransfers()({
            ...config,
            features: {
                defaultTransfer: transferFactory
            }
        } as any) as any;
        const featureB = withTransfers()({
            ...config,
            features: {
                defaultTransfer: transferFactory
            }
        } as any) as any;
        expect(featureA.providers.length).toBeGreaterThan(0);
        expect(featureB.providers.length).toBeGreaterThan(0);
    });

    it('throws when provideClientFromDi cannot find matching config', () => {
        const [provider] = provideClientFromDi({ transport: Transport.TCP, name: 'missing' } as any) as any[];
        expect(() => provider.provider({ get: () => [] })).toThrow(/messings 1 microservice client configure, ailas with name missing/);
    });

    it('throws when provideClientFromDi finds config without transportFeature', () => {
        const [provider] = provideClientFromDi({ transport: Transport.TCP, name: 'alpha' } as any) as any[];
        const injector = {
            get: (token: any) => token === CLIENT_CONFIGS ? [createConfig('alpha')] : []
        };
        expect(() => provider.provider(injector)).toThrow(/messings transportFeature 1 microservice client configure, ailas with name alpha/);
    });
});
