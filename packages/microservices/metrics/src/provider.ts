import { Provider } from '@tsdi/ioc';
import {
    getServiceInterceptorsToken,
    makeServiceFeature,
    ServiceFeatureFn,
    ServiceFeatureKind
} from '@tsdi/service';
import { MetricsModuleOptions } from './metrics';
import { METRICS_OPTIONS } from './metrics.module';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';
import { MetricsRegistry } from './registry';
import { MetricsCollector } from './collector';
import { MemoryGauge } from './gauges';
import { LatencyHistogram } from './histograms';
import { RequestCounter, ErrorCounter } from './counters';

/**
 * Register metrics collection for a microservice transport.
 *
 * ```ts
 * provideService(
 *   useRouter(),
 *   useMetrics({ prefix: 'myapp', defaultLabels: { env: 'prod' } }),
 *   useHttpTransport({ listenOpts: { port: 3000 }, asDefault: true })
 * )
 * ```
 *
 * The controller (`MetricsController`) still needs to be declared in the
 * application root module; this feature only wires registry/collector and the
 * HTTP request interceptor.
 */
export function useMetrics(options: MetricsModuleOptions = {}): ServiceFeatureFn<ServiceFeatureKind.Interceptors> {
    return (config) => {
        const interceptorToken = getServiceInterceptorsToken(config);
        const includeMemory = options.includeMemory !== false;
        const includeLatency = options.includeLatency !== false;
        const providers: Provider[] = [
            MetricsRegistry,
            RequestCounter,
            ErrorCounter,
            { provide: METRICS_OPTIONS, useValue: options },
            {
                provide: MetricsCollector,
                useFactory: (registry: MetricsRegistry) => {
                    if (options.prefix) {
                        registry.setPrefix(options.prefix);
                    }
                    if (options.defaultLabels) {
                        registry.setDefaultLabels(options.defaultLabels);
                    }
                    return registry;
                },
                deps: [MetricsRegistry]
            }
        ];
        if (includeMemory) {
            providers.push(MemoryGauge);
        }
        if (includeLatency) {
            providers.push(LatencyHistogram);
        }
        providers.push(MetricsInterceptor, {
            provide: interceptorToken,
            useExisting: MetricsInterceptor,
            multi: true,
            multiOrder: -800
        } as any);
        return makeServiceFeature(ServiceFeatureKind.Interceptors, providers, config);
    };
}
