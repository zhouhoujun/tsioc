import { ModuleWithProviders, Provider } from '@tsdi/ioc';
import { MetricsModuleOptions } from './metrics';
/**
 * Metrics module options token.
 */
export declare const METRICS_OPTIONS: import("@tsdi/ioc").InjectToken<MetricsModuleOptions>;
/**
 * Metrics module providers.
 */
export declare const METRICS_PROVIDERS: Provider[];
/**
 * Metrics module.
 *
 * 指标监控模块，提供指标收集和 Prometheus 格式导出。
 */
export declare class MetricsModule {
    /**
     * create metrics module with options.
     * @param options metrics module options.
     * @returns module with providers.
     */
    static withOptions(options: MetricsModuleOptions): ModuleWithProviders<MetricsModule>;
}
