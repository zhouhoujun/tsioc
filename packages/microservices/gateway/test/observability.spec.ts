import expect = require('expect');
import { Transport } from '@tsdi/common';
import { GatewayObservability } from '../src/gateway.observability';
import { GatewayRuntime } from '../src/gateway.runtime';
import { classifyGatewayError } from '../src/gateway.types';

describe('GatewayObservability', () => {
    function createRequest(overrides: any = {}) {
        const headers: Record<string, string> = overrides.headers ?? {};
        return {
            method: 'GET',
            url: '/api/users?active=1',
            headers,
            query: { active: '1' },
            getHeader(name: string) {
                return headers[name.toLowerCase()];
            },
            socket: { remoteAddress: '10.0.0.9' },
            ...overrides
        } as any;
    }

    function createMetrics() {
        const counters: Array<{ name: string; value: number; labels?: Record<string, string> }> = [];
        const timings: Array<{ name: string; value: number; labels?: Record<string, string> }> = [];
        return {
            counters,
            timings,
            increment(name: string, value?: number, labels?: Record<string, string>) {
                counters.push({ name, value: value ?? 1, labels });
            },
            timing(name: string, value: number, labels?: Record<string, string>) {
                timings.push({ name, value, labels });
            }
        } as any;
    }

    function createLogger() {
        const entries: Array<{ level: string; message: string; args: any[] }> = [];
        return {
            entries,
            info(message: string, ...args: any[]) {
                entries.push({ level: 'info', message, args });
            },
            error(message: string, ...args: any[]) {
                entries.push({ level: 'error', message, args });
            }
        } as any;
    }

    const route = {
        path: '/api/users',
        service: 'users-service',
        transport: Transport.HTTP
    } as any;

    it('reuses inbound trace headers instead of starting a new span', () => {
        const tracer = {
            startSpan() {
                throw new Error('should not start a span when trace headers exist');
            }
        } as any;
        const observability = new GatewayObservability({} as any, new GatewayRuntime(), null, null, tracer);
        const trace = observability.startTrace(createRequest({
            headers: { 'x-trace-id': 'trace-1', 'x-span-id': 'span-1', 'x-request-id': 'req-1' }
        }));

        expect(trace.headers['x-trace-id']).toBe('trace-1');
        expect(trace.headers['x-span-id']).toBe('span-1');
        expect(trace.headers['x-request-id']).toBe('req-1');
        expect(trace.span).toBe(undefined);
        expect(() => trace.finish()).not.toThrow();
    });

    it('generates ids when no tracer is configured', () => {
        const observability = new GatewayObservability({} as any, new GatewayRuntime(), null, null, null);
        const trace = observability.startTrace(createRequest());

        expect(typeof trace.headers['x-trace-id']).toBe('string');
        expect(trace.headers['x-trace-id'].length).toBeGreaterThan(0);
        expect(trace.headers['x-span-id'].length).toBe(16);
        expect(trace.headers['x-request-id']).toBe(trace.headers['x-trace-id']);
    });

    it('starts and finishes a SERVER span through the tracer', async () => {
        const spans: Array<{ name: string; kind: string; status: string; finished: boolean; errors: any[] }> = [];
        const tracer = {
            startSpan(name: string, options: any) {
                const span = {
                    name,
                    kind: options.kind,
                    status: 'UNSET',
                    finished: false,
                    errors: [] as any[],
                    context() {
                        return { traceId: 'trace-2', spanId: 'span-2' };
                    },
                    setStatus(status: string) {
                        span.status = status;
                    },
                    recordError(error: any) {
                        span.errors.push(error);
                    },
                    finish() {
                        span.finished = true;
                    }
                };
                spans.push(span);
                return span;
            },
            injectContext(_context: any, carrier: Record<string, string>) {
                carrier['x-trace-id'] = 'trace-2';
                carrier['x-span-id'] = 'span-2';
            },
            async runWithSpan(_span: any, run: () => Promise<any>) {
                return run();
            }
        } as any;
        const observability = new GatewayObservability({} as any, new GatewayRuntime(), null, null, tracer);
        const trace = observability.startTrace(createRequest());

        expect(trace.headers['x-trace-id']).toBe('trace-2');
        expect(spans[0].kind).toBe('SERVER');
        expect(spans[0].name).toContain('GET /api/users');

        const value = await observability.runInTrace(trace, async () => 42);
        expect(value).toBe(42);

        trace.finish();
        expect(spans[0].status).toBe('OK');
        expect(spans[0].finished).toBe(true);

        const failed = observability.startTrace(createRequest());
        failed.finish(new Error('boom'));
        expect(spans[1].status).toBe('ERROR');
        expect(spans[1].errors[0].message).toBe('boom');
    });

    it('tags error responses for access logs and metrics', () => {
        const headers: Record<string, string> = {};
        const adapter = {
            setHeader(name: string, value: string) {
                headers[name] = value;
            }
        };
        const observability = new GatewayObservability({} as any, new GatewayRuntime(), null, null, null);

        const errorType = observability.tagError({ statusCode: 429, message: 'too many' }, adapter);
        expect(errorType).toBe('rate_limited');
        expect(headers['x-gateway-error-type']).toBe('rate_limited');

        const tolerant = new GatewayObservability({} as any, new GatewayRuntime(), null, null, null);
        expect(() => tolerant.tagError({ statusCode: 500 }, null)).not.toThrow();
    });

    it('records request metrics with configurable labels', () => {
        const metrics = createMetrics();
        const observability = new GatewayObservability({
            observability: {
                metrics: { enabled: true, includeEndpoint: true }
            }
        } as any, new GatewayRuntime(), metrics, null, null);

        observability.recordMetrics(
            route,
            createRequest(),
            200,
            12,
            { cacheStatus: 'MISS', outcome: 'upstream', canary: true, endpoint: '10.0.0.1:8080' }
        );

        expect(metrics.counters.length).toBe(1);
        expect(metrics.counters[0].name).toBe('gateway_requests_total');
        expect(metrics.timings[0].name).toBe('gateway_request_duration_ms');
        const labels = metrics.counters[0].labels;
        expect(labels.route).toBe('/api/users');
        expect(labels.service).toBe('users-service');
        expect(labels.method).toBe('GET');
        expect(labels.status).toBe('200');
        expect(labels.transport).toBe('HTTP');
        expect(labels.cache).toBe('MISS');
        expect(labels.outcome).toBe('upstream');
        expect(labels.canary).toBe('true');
        expect(labels.endpoint).toBe('10.0.0.1:8080');
    });

    it('counts error metrics and honours disabled observability', () => {
        const metrics = createMetrics();
        const enabled = new GatewayObservability({} as any, new GatewayRuntime(), metrics, null, null);
        enabled.recordMetrics(route, createRequest(), 502, 5, { errorType: 'upstream' });
        expect(metrics.counters.map((entry: any) => entry.name)).toEqual(['gateway_requests_total', 'gateway_errors_total']);
        expect(metrics.counters[1].labels.error_type).toBe('upstream');

        const before = metrics.counters.length;
        const disabled = new GatewayObservability({
            observability: { metrics: { enabled: false } }
        } as any, new GatewayRuntime(), metrics, null, null);
        disabled.recordMetrics(route, createRequest(), 502, 5, { errorType: 'upstream' });
        expect(metrics.counters.length).toBe(before);
    });

    it('writes structured access logs with trace, query and selected headers', () => {
        const logger = createLogger();
        const observability = new GatewayObservability({
            defaults: { prefix: '/gateway' },
            observability: {
                accessLog: { enabled: true, includeQuery: true, includeHeaders: ['user-agent'] }
            }
        } as any, new GatewayRuntime(), null, logger, null);

        observability.recordAccessLog(
            route,
            createRequest({ url: '/gateway/api/users?active=1', headers: { 'user-agent': 'jest', 'x-request-id': 'req-9' } }),
            200,
            7,
            { endpoint: '10.0.0.1:8080', outcome: 'upstream' },
            undefined,
            { 'x-trace-id': 'trace-9' }
        );

        expect(logger.entries.length).toBe(1);
        const entry = logger.entries[0].args[0];
        expect(logger.entries[0].level).toBe('info');
        expect(entry.event).toBe('gateway.access');
        expect(entry.path).toBe('/api/users');
        expect(entry.route).toBe('/api/users');
        expect(entry.duration).toBe(7);
        expect(entry.traceId).toBe('trace-9');
        expect(entry.requestId).toBe('req-9');
        expect(entry.clientIp).toBe('10.0.0.9');
        expect(entry.query).toEqual({ active: '1' });
        expect(entry.headers).toEqual({ 'user-agent': 'jest' });
    });

    it('logs errors at error level and skips logs when disabled', () => {
        const logger = createLogger();
        const observability = new GatewayObservability({
            observability: { accessLog: true }
        } as any, new GatewayRuntime(), null, logger, null);

        observability.recordAccessLog(
            route,
            createRequest(),
            502,
            3,
            { errorType: 'upstream' },
            { message: 'bad gateway', statusCode: 502, statusMessage: 'Bad Gateway' }
        );
        expect(logger.entries[0].level).toBe('error');
        expect(logger.entries[0].args[0].error).toEqual({
            message: 'bad gateway',
            statusCode: 502,
            statusMessage: 'Bad Gateway'
        });

        const disabledLogger = createLogger();
        const disabled = new GatewayObservability({
            observability: { accessLog: { enabled: false } }
        } as any, new GatewayRuntime(), null, disabledLogger, null);
        disabled.recordAccessLog(route, createRequest(), 200, 1, undefined);
        expect(disabledLogger.entries.length).toBe(0);
    });

    it('records route outcomes through the runtime when requests fail', async () => {
        const runtime = new GatewayRuntime();
        const metrics = createMetrics();
        const logger = createLogger();
        const observability = new GatewayObservability({ observability: { accessLog: true } } as any, runtime, metrics, logger, null);

        observability.recordError(
            route,
            createRequest(),
            Date.now() - 4,
            { statusCode: 503, message: 'circuit breaker open' },
            { 'x-trace-id': 'trace-3' },
            { errorType: 'circuit_open' }
        );

        const snapshot = await runtime.snapshot();
        expect(snapshot.routes.some(entry => entry.key.includes('users-service:/api/users'))).toBe(true);
        expect(metrics.counters.some((entry: any) => entry.name === 'gateway_errors_total')).toBe(true);
        expect(logger.entries[0].level).toBe('error');
    });

    it('classifies common gateway failures', () => {
        expect(classifyGatewayError({ statusCode: 429 })).toBe('rate_limited');
        expect(classifyGatewayError({ statusCode: 503, message: 'bulkhead queue full' })).toBe('bulkhead_full');
        expect(classifyGatewayError({ message: 'circuit breaker open' })).toBe('circuit_open');
        expect(classifyGatewayError({ statusCode: 401 })).toBe('unauthorized');
        expect(classifyGatewayError({ statusCode: 403 })).toBe('forbidden');
        expect(classifyGatewayError({ statusCode: 400 })).toBe('validation');
        expect(classifyGatewayError({ message: 'request timeout' })).toBe('timeout');
        expect(classifyGatewayError({ code: 'ETIMEDOUT' })).toBe('network');
        expect(classifyGatewayError({ code: 'ECONNREFUSED' })).toBe('network');
        expect(classifyGatewayError({ statusCode: 502 })).toBe('upstream');
        expect(classifyGatewayError({ statusCode: 404 })).toBe('client');
        expect(classifyGatewayError(new Error('opaque'))).toBe('internal');
    });
});
