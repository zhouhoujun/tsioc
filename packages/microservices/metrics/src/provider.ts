import { Provider } from '@tsdi/ioc';
import {
    getServiceInterceptorsToken,
    makeServiceFeature,
    ServiceFeatureFn,
    ServiceFeatureKind
} from '@tsdi/service';
import { MetricsModuleOptions } from './metrics';
import { METRICS_OPTIONS, METRICS_PROVIDERS } from './metrics.module';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';

/**
 * Register metrics collection for a microservice transport.
 *
 * ```ts
 * provideService(
 *   useRouter(),
 *   useMetrics(),
 *   useHttpTransport({ listenOpts: { port: 3000 }, asDefault: true })
 * )
 * ```
 *
 * The controller (`MetricsController`) still needs to be declared in the
 * application root module; this feature only wires registry/collector and the
 * HTTP request interceptor.
 */
export function useMetrics(options?: MetricsModuleOptions): ServiceFeatureFn<ServiceFeatureKind.Interceptors> {
    return (config) => {
        const interceptorToken = getServiceInterceptorsToken(config);
        const providers: Provider[] = [
            ...METRICS_PROVIDERS,
            { provide: METRICS_OPTIONS, useValue: options ?? {} },
            {
                provide: interceptorToken,
                useExisting: MetricsInterceptor,
                multi: true,
                multiOrder: -800
            } as any
        ];
        return makeServiceFeature(ServiceFeatureKind.Interceptors, providers, config);
    };
}
