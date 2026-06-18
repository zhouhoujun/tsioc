import { Provider } from '@tsdi/ioc';
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
