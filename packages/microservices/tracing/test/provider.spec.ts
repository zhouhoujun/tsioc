import expect = require('expect');
import { Transport } from '@tsdi/common';
import { getServiceInterceptorsToken } from '@tsdi/service';
import { useTracing } from '../src/provider';
import { JsonTraceExporter } from '../src/exporters/console.exporter';
import { TRACE_EXPORTERS, TRACING_OPTIONS } from '../src/tokens';
import { TracingInterceptor } from '../src/interceptors/tracing.interceptor';

describe('useTracing feature', () => {
    it('registers tracer, options, exporter and interceptor', () => {
        const config = { transport: Transport.HTTP, features: {} } as any;
        const feature = (useTracing({ serviceName: 'svc', sampleRate: 0.5 }, JsonTraceExporter) as any)(config);
        const token = getServiceInterceptorsToken(config);

        expect(feature.kind).toBeDefined();
        expect(feature.providers.some((provider: any) =>
            provider.provide === TRACING_OPTIONS
            && provider.useValue.serviceName === 'svc'
            && provider.useValue.sampleRate === 0.5)).toBe(true);
        expect(feature.providers.some((provider: any) =>
            provider.provide === TRACE_EXPORTERS
            && provider.useClass === JsonTraceExporter
            && provider.multi === true)).toBe(true);
        expect(feature.providers.some((provider: any) =>
            provider.provide === token
            && provider.useExisting === TracingInterceptor
            && provider.multi === true
            && provider.multiOrder === -850)).toBe(true);
    });
});
