import { createInjector, Injectable } from '@tsdi/ioc';
import expect = require('expect');
import {
    DefaultTracer,
    Span,
    Tracer,
    TraceExporter,
    TracingModule,
    TRACE_EXPORTERS,
    TRACING_OPTIONS
} from '../src';

@Injectable()
class CapturingExporter implements TraceExporter {
    spans: Span[] = [];

    async export(spans: Span[]): Promise<void> {
        this.spans.push(...spans);
    }
}

describe('TracingModule DI', () => {

    it('injects tracing options into the default tracer', () => {
        const injector = createInjector(
            TracingModule.withOptions({ serviceName: 'di-service', sampleRate: 1 }).providers as any
        );

        const tracer = injector.get(Tracer) as DefaultTracer;
        expect(tracer).toBeInstanceOf(DefaultTracer);
        expect(tracer.serviceName).toBe('di-service');
        const options = injector.get(TRACING_OPTIONS) as any;
        expect(options.serviceName).toBe('di-service');
        tracer.close();
    });

    it('registers exporter classes and injects them into the tracer', async () => {
        const injector = createInjector(
            TracingModule.withExporter(CapturingExporter).providers as any
        );

        const exporters = injector.get(TRACE_EXPORTERS) as TraceExporter[];
        expect(exporters.length).toBe(1);
        expect(exporters[0]).toBeInstanceOf(CapturingExporter);

        const tracer = injector.get(Tracer) as DefaultTracer;
        const span = tracer.startSpan('di-operation');
        span.finish();
        await tracer.flush();

        const exporter = (tracer as any).exporters[0] as CapturingExporter;
        expect(exporter).toBeInstanceOf(CapturingExporter);
        expect(exporter.spans.length).toBe(1);
        expect(exporter.spans[0].name).toBe('di-operation');
        await tracer.close();
    });

    it('registers exporter instances', async () => {
        const instance: TraceExporter & { spans: Span[] } = {
            spans: [],
            async export(spans: Span[]) {
                this.spans.push(...spans);
            }
        };
        const injector = createInjector(
            TracingModule.withExporter(instance).providers as any
        );

        const tracer = injector.get(Tracer) as DefaultTracer;
        tracer.startSpan('instance-span').finish();
        await tracer.flush();
        await tracer.close();

        expect(instance.spans.length).toBe(1);
    });

    it('supports multiple exporters in one call', async () => {
        const injector = createInjector(
            TracingModule.withExporter(CapturingExporter, CapturingExporter).providers as any
        );

        const exporters = injector.get(TRACE_EXPORTERS) as CapturingExporter[];
        expect(exporters.length).toBe(2);

        const tracer = injector.get(Tracer) as DefaultTracer;
        tracer.startSpan('multi-export').finish();
        await tracer.flush();

        const tracerExporters = (tracer as any).exporters as CapturingExporter[];
        expect(tracerExporters.length).toBe(2);
        expect(tracerExporters[0].spans.length).toBe(1);
        expect(tracerExporters[1].spans.length).toBe(1);
        await tracer.close();
    });

    it('does not keep the process alive with the flush timer', () => {
        const tracer = new DefaultTracer({ serviceName: 'timer-test' });
        const timer = (tracer as any).flushTimer;
        expect(timer).toBeDefined();
        expect(typeof timer.unref).toBe('function');
        expect(timer.hasRef()).toBe(false);
        return tracer.close();
    });

    it('disables the flush timer when flushIntervalMs is 0', async () => {
        const tracer = new DefaultTracer({ serviceName: 'no-timer', flushIntervalMs: 0 });
        expect((tracer as any).flushTimer).toBeUndefined();
        await tracer.close();
    });
});
