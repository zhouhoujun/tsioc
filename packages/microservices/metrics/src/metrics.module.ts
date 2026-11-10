import { Module, ModuleWithProviders, Provider, token } from '@tsdi/ioc';
import { MetricsCollector } from './collector';
import { MetricsRegistry } from './registry';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';
import { RequestCounter, ErrorCounter } from './counters';
import { MemoryGauge } from './gauges';
import { LatencyHistogram } from './histograms';
import { MetricsModuleOptions } from './metrics';

/**
 * Metrics module options token.
 */
export const METRICS_OPTIONS = token<MetricsModuleOptions>('METRICS_OPTIONS');

/**
 * Metrics module providers.
 */
export const METRICS_PROVIDERS: Provider[] = [
    MetricsRegistry,
    { provide: MetricsCollector, useClass: MetricsRegistry },
    RequestCounter,
    ErrorCounter,
    MemoryGauge,
    LatencyHistogram,
    MetricsInterceptor
];

/**
 * Metrics module.
 *
 * 指标监控模块，提供指标收集和 Prometheus 格式导出。控制器需要在应用根模块声明：
 *
 * ```ts
 * @Module({
 *   imports: [MetricsModule],
 *   declarations: [MetricsController],
 *   providers: [provideService(useRouter(), useHttpTransport(...))]
 * })
 * ```
 */
@Module({
    providers: METRICS_PROVIDERS,
    exports: [MetricsRegistry]
})
export class MetricsModule {
    /**
     * create metrics module with options.
     * @param options metrics module options.
     * @returns module with providers.
     */
    static withOptions(options: MetricsModuleOptions): ModuleWithProviders<MetricsModule> {
        const providers: Provider[] = [
            { provide: METRICS_OPTIONS, useValue: options }
        ];

        return {
            module: MetricsModule,
            providers
        };
    }
}