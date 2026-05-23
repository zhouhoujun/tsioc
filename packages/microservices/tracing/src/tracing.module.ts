import { Module, ModuleWithProviders, Provider, token, Type } from '@tsdi/ioc';
import { Tracer } from './tracer';
import { DefaultTracer } from './default.tracer';
import { TracingInterceptor } from './interceptors/tracing.interceptor';
import { ConsoleTraceExporter } from './exporters/console.exporter';
import { TracingOptions } from './tracing';

/**
 * Tracing options token.
 */
export const TRACING_OPTIONS = token<TracingOptions>('TRACING_OPTIONS');

/**
 * Tracing module providers.
 */
export const TRACING_PROVIDERS: Provider[] = [
    DefaultTracer,
    { provide: Tracer, useClass: DefaultTracer },
    ConsoleTraceExporter,
    TracingInterceptor
];

/**
 * Tracing module.
 *
 * 分布式追踪模块，提供 Span 管理和追踪上下文传播。
 */
@Module({
    providers: TRACING_PROVIDERS,
    exports: [DefaultTracer, TracingInterceptor]
})
export class TracingModule {
    /**
     * create tracing module with options.
     * @param options tracing options.
     */
    static withOptions(options: TracingOptions): ModuleWithProviders<TracingModule> {
        return {
            module: TracingModule,
            providers: [
                { provide: TRACING_OPTIONS, useValue: options }
            ]
        };
    }

    /**
     * use custom exporter.
     * @param exporter trace exporter.
     */
    static withExporter(exporter: Type<ConsoleTraceExporter> = ConsoleTraceExporter): ModuleWithProviders<TracingModule> {
        return {
            module: TracingModule,
            providers: [
                exporter
            ]
        };
    }
}