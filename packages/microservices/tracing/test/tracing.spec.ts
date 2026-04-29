import { DefaultTracer, ConsoleTraceExporter, JsonTraceExporter, TracingModule, Span } from '../src';
import expect = require('expect');

describe('Tracing Module Test', () => {

    describe('DefaultSpan', () => {
        let tracer: DefaultTracer;
        let span: Span;

        beforeEach(() => {
            tracer = new DefaultTracer({ serviceName: 'test-service' });
            span = tracer.startSpan('test-operation');
        });

        afterEach(async () => {
            span.finish();
            await tracer.close();
        });

        it('should have required properties', () => {
            expect(span.spanId).toBeDefined();
            expect(span.traceId).toBeDefined();
            expect(span.name).toBe('test-operation');
            expect(span.kind).toBe('INTERNAL');
            expect(span.status).toBe('UNSET');
            expect(span.startTime).toBeDefined();
        });

        it('should set name', () => {
            span.setName('new-name');
            expect(span.name).toBe('new-name');
        });

        it('should set status', () => {
            span.setStatus('OK');
            expect(span.status).toBe('OK');
        });

        it('should set attribute', () => {
            span.setAttribute('key', 'value');
            expect(span.attributes['key']).toBe('value');
        });

        it('should add log', () => {
            span.log({ message: 'test log' });
            expect(span.logs.length).toBe(1);
            expect(span.logs[0].fields.message).toBe('test log');
        });

        it('should record error', () => {
            const error = new Error('test error');
            span.recordError(error);
            expect(span.status).toBe('ERROR');
            expect(span.logs.length).toBe(1);
            expect(span.logs[0].fields['error.type']).toBe('Error');
        });

        it('should finish and calculate duration', () => {
            span.finish();
            expect(span.endTime).toBeDefined();
            expect(span.duration).toBeDefined();
        });

        it('should return trace context', () => {
            const context = span.context();
            expect(context.traceId).toBe(span.traceId);
            expect(context.spanId).toBe(span.spanId);
        });

        it('should not modify after finish', () => {
            span.finish();
            span.setName('after-finish');
            span.setStatus('OK');
            span.setAttribute('after', 'finish');
            expect(span.name).toBe('test-operation'); // Not changed
        });
    });

    describe('DefaultTracer', () => {
        let tracer: DefaultTracer;

        beforeEach(() => {
            tracer = new DefaultTracer({
                serviceName: 'test-service',
                sampleRate: 1,
                enabled: true
            });
        });

        afterEach(async () => {
            await tracer.close();
        });

        it('should have service name', () => {
            expect(tracer.serviceName).toBe('test-service');
        });

        it('should start span', () => {
            const span = tracer.startSpan('test');
            expect(span).toBeDefined();
            expect(span.name).toBe('test');
            span.finish();
        });

        it('should start span with options', () => {
            const span = tracer.startSpan('test', {
                kind: 'SERVER',
                attributes: { initial: 'value' }
            });
            expect(span.kind).toBe('SERVER');
            expect(span.attributes['initial']).toBe('value');
            span.finish();
        });

        it('should track current span', () => {
            const span = tracer.startSpan('parent');
            expect(tracer.getCurrentSpan()).toBe(span);
            span.finish();
        });

        it('should set current span', () => {
            const span1 = tracer.startSpan('span1');
            const span2 = tracer.startSpan('span2');
            tracer.setCurrentSpan(span1);
            expect(tracer.getCurrentSpan()).toBe(span1);
            span1.finish();
            span2.finish();
        });

        it('should extract context from carrier', () => {
            const carrier = {
                'x-trace-id': 'trace123',
                'x-span-id': 'span456',
                'x-parent-span-id': 'parent789'
            };
            const context = tracer.extractContext(carrier);
            expect(context).not.toBeNull();
            expect(context?.traceId).toBe('trace123');
            expect(context?.spanId).toBe('span456');
            expect(context?.parentSpanId).toBe('parent789');
        });

        it('should return null for missing context', () => {
            const carrier = {};
            const context = tracer.extractContext(carrier);
            expect(context).toBeNull();
        });

        it('should inject context into carrier', () => {
            const context = {
                traceId: 'trace123',
                spanId: 'span456',
                parentSpanId: 'parent789'
            };
            const carrier: Record<string, string> = {};
            tracer.injectContext(context, carrier);
            expect(carrier['x-trace-id']).toBe('trace123');
            expect(carrier['x-span-id']).toBe('span456');
            expect(carrier['x-parent-span-id']).toBe('parent789');
        });

        it('should add exporter', () => {
            const exporter = new JsonTraceExporter();
            tracer.addExporter(exporter);
            // No error means success
        });

        it('should flush pending spans', async () => {
            const exporter = new JsonTraceExporter();
            tracer.addExporter(exporter);
            const span = tracer.startSpan('test');
            span.finish();
            await tracer.flush();
            const exported = exporter.getSpans();
            expect(exported.length).toBe(1);
        });

        it('should support sampling', async () => {
            const sampledTracer = new DefaultTracer({
                serviceName: 'test',
                sampleRate: 0 // 0% sampling
            });
            const span = sampledTracer.startSpan('test');
            // No-op span should have empty IDs
            expect(span.spanId).toBe('');
            await sampledTracer.close();
        });

        it('should create child span with parent', () => {
            const parent = tracer.startSpan('parent');
            const child = tracer.startSpan('child', { parent });
            expect(child.parentSpanId).toBe(parent.spanId);
            expect(child.traceId).toBe(parent.traceId);
            parent.finish();
            child.finish();
        });
    });

    describe('ConsoleTraceExporter', () => {
        let exporter: ConsoleTraceExporter;

        beforeEach(() => {
            exporter = new ConsoleTraceExporter();
        });

        it('should export spans', async () => {
            const tracer = new DefaultTracer();
            const span = tracer.startSpan('test');
            span.finish();
            // Console export just logs, no return value to check
            await exporter.export([span]);
            await tracer.close();
        });
    });

    describe('JsonTraceExporter', () => {
        let exporter: JsonTraceExporter;

        beforeEach(() => {
            exporter = new JsonTraceExporter();
        });

        afterEach(() => {
            exporter.clear();
        });

        it('should export spans', async () => {
            const tracer = new DefaultTracer();
            const span = tracer.startSpan('test');
            span.setAttribute('key', 'value');
            span.finish();
            await exporter.export([span]);
            const exported = exporter.getSpans();
            expect(exported.length).toBe(1);
            expect(exported[0].name).toBe('test');
            await tracer.close();
        });

        it('should accumulate spans', async () => {
            const tracer = new DefaultTracer();
            const span1 = tracer.startSpan('test1');
            const span2 = tracer.startSpan('test2');
            span1.finish();
            span2.finish();
            await exporter.export([span1, span2]);
            expect(exporter.getSpans().length).toBe(2);
            await tracer.close();
        });

        it('should clear spans', async () => {
            const tracer = new DefaultTracer();
            const span = tracer.startSpan('test');
            span.finish();
            await exporter.export([span]);
            exporter.clear();
            expect(exporter.getSpans().length).toBe(0);
            await tracer.close();
        });
    });

    describe('TracingModule', () => {
        it('should have static withOptions method', () => {
            expect(TracingModule.withOptions).toBeDefined();
            expect(typeof TracingModule.withOptions).toBe('function');
        });

        it('should create ModuleWithProviders', () => {
            const result = TracingModule.withOptions({
                serviceName: 'test-app',
                sampleRate: 0.5
            });
            expect(result.module).toBe(TracingModule);
            expect(result.providers).toBeDefined();
        });

        it('should have static withExporter method', () => {
            expect(TracingModule.withExporter).toBeDefined();
            expect(typeof TracingModule.withExporter).toBe('function');
        });
    });
});