import { Provider, Type } from '@tsdi/ioc';
import {
    getServiceInterceptorsToken,
    makeServiceFeature,
    ServiceFeatureFn,
    ServiceFeatureKind
} from '@tsdi/service';
import { DefaultTracer } from './default.tracer';
import { TracingInterceptor } from './interceptors/tracing.interceptor';
import { TraceExporter, Tracer } from './tracer';
import { TracingOptions } from './tracing';
import { TRACE_EXPORTERS, TRACING_OPTIONS } from './tokens';

/**
 * Add tracing to a microservice transport.
 *
 * ```ts
 * provideService(
 *   useRouter(),
 *   useTracing({ serviceName: 'users-service', sampleRate: 0.1 }, OtlpHttpTraceExporter),
 *   useHttpTransport({ ... })
 * )
 * ```
 */
export function useTracing(
    options: TracingOptions = {},
    ...exporters: Array<Type<TraceExporter> | TraceExporter>
): ServiceFeatureFn<ServiceFeatureKind.Interceptors> {
    return (config) => {
        const interceptorToken = getServiceInterceptorsToken(config);
        const providers: Provider[] = [
            DefaultTracer,
            { provide: Tracer, useExisting: DefaultTracer },
            { provide: TRACING_OPTIONS, useValue: options },
            TracingInterceptor,
            {
                provide: interceptorToken,
                useExisting: TracingInterceptor,
                multi: true,
                multiOrder: -850
            } as any
        ];
        for (const exporter of exporters) {
            providers.push(typeof exporter === 'function'
                ? { provide: TRACE_EXPORTERS, useClass: exporter as Type<TraceExporter>, multi: true }
                : { provide: TRACE_EXPORTERS, useValue: exporter, multi: true });
        }
        return makeServiceFeature(ServiceFeatureKind.Interceptors, providers, config);
    };
}
