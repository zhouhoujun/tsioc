import { Provider, isArray } from '@tsdi/ioc';
import { DISCOVERY_PROVIDERS, DefaultEndpointResolver, EndpointResolver } from '@tsdi/discovery';
import { ServiceFeatureFn, ServiceFeatureKind, makeServiceFeature, getServiceInterceptorsToken } from '@tsdi/service';
import { GatewayInterceptor } from './gateway.interceptor';
import { GatewayOptions, GATEWAY_OPTIONS } from './gateway.options';
import { GatewayRuntime } from './gateway.runtime';
import { GatewayLifecycle } from './gateway.lifecycle';
import { ConfigurationManagerGatewayAdapter, GatewayConfigAdapter, GATEWAY_CONFIG_ADAPTER_OPTIONS } from './gateway.config-adapter';

export function useGateway(options: GatewayOptions): ServiceFeatureFn<ServiceFeatureKind.Interceptors> {
    return (config) => {
        const interceptorToken = getServiceInterceptorsToken(config);
        const providers: Provider[] = [
            ...resolveGatewayDiscoveryProviders(options.discovery),
            ...(options.providers ?? []),
            { provide: GATEWAY_OPTIONS, useValue: options },
            { provide: GATEWAY_CONFIG_ADAPTER_OPTIONS, useValue: options.configSync },
            ConfigurationManagerGatewayAdapter,
            { provide: GatewayConfigAdapter, useExisting: ConfigurationManagerGatewayAdapter },
            GatewayRuntime,
            GatewayLifecycle,
            GatewayInterceptor,
            {
                provide: interceptorToken,
                useExisting: GatewayInterceptor,
                multi: true,
                multiOrder: -950
            } as any
        ];
        return makeServiceFeature(ServiceFeatureKind.Interceptors, providers, config);
    };
}

/**
 * Resolve gateway service discovery providers.
 *
 * - `true`: built-in discovery module providers (in-memory registry).
 * - `Provider` / `Provider[]`: custom registry wiring; an `EndpointResolver`
 *   is added when the caller did not provide one explicitly.
 * - omitted: host provides ServiceDiscovery separately.
 */
export function resolveGatewayDiscoveryProviders(discovery?: boolean | Provider | Provider[]): Provider[] {
    if (!discovery) {
        return [];
    }
    const providers: Provider[] = discovery === true
        ? DISCOVERY_PROVIDERS.slice()
        : (isArray(discovery) ? (discovery as Provider[]).slice() : [discovery as Provider]);
    const hasResolver = providers.some(provider => {
        const item = provider as any;
        return item === DefaultEndpointResolver
            || item?.provide === EndpointResolver
            || item?.useExisting === DefaultEndpointResolver
            || item?.useClass === DefaultEndpointResolver;
    });
    if (!hasResolver) {
        providers.push(DefaultEndpointResolver as any, {
            provide: EndpointResolver,
            useExisting: DefaultEndpointResolver
        } as any);
    }
    return providers;
}
