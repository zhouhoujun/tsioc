import { Module, ModuleWithProviders, Provider, Type } from '@tsdi/ioc';
import { Tracer, TraceExporter } from './tracer';
import { TracingOptions } from './tracing';
import { DefaultTracer } from './default.tracer';
import { TracingInterceptor } from './interceptors/tracing.interceptor';
import { ConsoleTraceExporter } from './exporters/console.exporter';
import { TRACE_EXPORTERS, TRACING_OPTIONS } from './tokens';

export { TRACE_EXPORTERS, TRACING_OPTIONS } from './tokens';

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
                ...TRACING_PROVIDERS,
                { provide: TRACING_OPTIONS, useValue: options }
            ]
        };
    }

    /**
     * use one or more custom exporters.
     *
     * Accepts exporter classes (resolved by DI) or exporter instances.
     *
     * ```ts
     * TracingModule.withExporter(JsonTraceExporter)
     * TracingModule.withExporter(JsonTraceExporter, {
     *     export: async spans => console.log(spans.length)
     * })
     * ```
     */
    static withExporter(...exporters: Array<Type<TraceExporter> | TraceExporter>): ModuleWithProviders<TracingModule> {
        return {
            module: TracingModule,
            providers: [
                ...TRACING_PROVIDERS,
                ...(exporters.length ? exporters : [ConsoleTraceExporter]).map(exporter => (
                    typeof exporter === 'function'
                        ? { provide: TRACE_EXPORTERS, useClass: exporter as Type<TraceExporter>, multi: true }
                        : { provide: TRACE_EXPORTERS, useValue: exporter, multi: true }
                ))
            ]
        };
    }
}