import { Module, ModuleWithProviders, Provider, token } from '@tsdi/ioc';
import { MetricsCollector } from './collector';
import { MetricsRegistry } from './registry';
import { MetricsController } from './metrics.controller';
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
    MetricsInterceptor,
    MetricsController
];

/**
 * Metrics module.
 *
 * 指标监控模块，提供指标收集和 Prometheus 格式导出。
 */
@Module({
    providers: METRICS_PROVIDERS,
    exports: [MetricsController, MetricsRegistry]
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