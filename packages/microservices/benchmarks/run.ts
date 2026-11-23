/**
 * In-process benchmarks for @tsdi/microservices hot paths.
 *
 * Usage (from the repository root):
 *   npm run bench
 *   npm run bench -- --routes 100,1000 --samples 500 --json out.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as http from 'node:http';
import { AddressInfo } from 'node:net';
import { of } from 'rxjs';
import { HTTP_RESPONSE, HttpMessageAdapter } from '@tsdi/http-microservice';
import { GatewayInterceptor } from '../gateway/src/gateway.interceptor';
import { GatewayRuntime } from '../gateway/src/gateway.runtime';
import { GatewayOptions, GatewayRouteOptions } from '../gateway/src/gateway.options';
import { GatewayResponse } from '../gateway/src/gateway.response';
import { GatewayObservability } from '../gateway/src/gateway.observability';
import { createInjector } from '@tsdi/ioc';
import { createRequestContext, defaultFormatter, Transport } from '@tsdi/common';
import { OptimizedRouter } from '../service/src';
import { ConsumerRuntime } from '../service/src/consumer/ConsumerRuntime';
import { MetricsRegistry } from '../metrics/src/registry';
import { PrometheusExporter } from '../metrics/src/exporters/prometheus';

interface BenchmarkResult {
    scenario: string;
    params: Record<string, number | string | boolean>;
    samples: number;
    opsPerSecond: number;
    p50Ms: number;
    p99Ms: number;
    maxMs: number;
    rssBytes: number;
}

interface BenchmarkReport {
    generatedAt: string;
    node: string;
    platform: string;
    results: BenchmarkResult[];
}

function argValue(name: string): string | undefined {
    const index = process.argv.indexOf(`--${name}`);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

function percentile(sorted: number[], ratio: number): number {
    if (!sorted.length) {
        return 0;
    }
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
    return sorted[index];
}

function buildRoutes(count: number): GatewayRouteOptions[] {
    const routes: GatewayRouteOptions[] = [];
    for (let i = 0; i < count; i++) {
        routes.push({
            path: `/api/service-${i}/items/:id`,
            service: `service-${i}`,
            methods: ['GET', 'POST']
        });
    }
    return routes;
}

/**
 * Measures gateway route matching only: no forwarding, no sockets.
 *
 * The target path always belongs to the middle route so the benchmark includes
 * both a miss scan and the hit, which is the shape of a real request.
 */
function benchmarkRouteMatch(routeCount: number, samples: number): BenchmarkResult {
    const routes = buildRoutes(routeCount);
    const interceptor = new GatewayInterceptor({ routes } as GatewayOptions, null, null, new GatewayRuntime());
    const middle = Math.floor(routeCount / 2);
    const path = `/api/service-${middle}/items/42?expand=owner`;

    for (let i = 0; i < Math.min(200, samples); i++) {
        interceptor.previewMatch({ method: 'GET', path });
    }

    const durations: number[] = [];
    const startedAll = process.hrtime.bigint();
    for (let i = 0; i < samples; i++) {
        const started = process.hrtime.bigint();
        interceptor.previewMatch({ method: 'GET', path });
        durations.push(Number(process.hrtime.bigint() - started) / 1e6);
    }
    const totalMs = Number(process.hrtime.bigint() - startedAll) / 1e6;
    durations.sort((a, b) => a - b);

    return {
        scenario: 'route-match',
        params: { routes: routeCount },
        samples,
        opsPerSecond: Math.round(samples / (totalMs / 1000)),
        p50Ms: Number(percentile(durations, 0.5).toFixed(4)),
        p99Ms: Number(percentile(durations, 0.99).toFixed(4)),
        maxMs: Number(durations[durations.length - 1].toFixed(4)),
        rssBytes: process.memoryUsage().rss
    };
}


/**
 * Measures the metrics write path for one request shape: a counter plus the
 * `_ms` / `_seconds` duration pair sharing one labels object (the client and
 * gateway paths). Labels are intentionally reused so the benchmark isolates
 * registry work rather than per-request label construction.
 */
function benchmarkMetricsWrite(iterations: number): BenchmarkResult {
    const registry = new MetricsRegistry();
    const labels = { method: 'GET', path: '/api/users/:id', transport: 'HTTP' };
    const write = () => {
        registry.increment('bench_requests_total', 1, labels);
        registry.timing('bench_request_duration_ms', 12.5, labels);
        registry.timing('bench_request_duration_seconds', 0.0125, labels);
    };
    for (let i = 0; i < Math.min(20000, iterations); i++) {
        write();
    }

    const durations: number[] = [];
    const startedAll = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
        const started = process.hrtime.bigint();
        write();
        durations.push(Number(process.hrtime.bigint() - started) / 1e6);
    }
    const totalMs = Number(process.hrtime.bigint() - startedAll) / 1e6;
    durations.sort((a, b) => a - b);

    return {
        scenario: 'metrics-write',
        params: { writesPerSample: 3 },
        samples: iterations,
        opsPerSecond: Math.round(iterations / (totalMs / 1000)),
        p50Ms: Number(percentile(durations, 0.5).toFixed(4)),
        p99Ms: Number(percentile(durations, 0.99).toFixed(4)),
        maxMs: Number(durations[durations.length - 1].toFixed(4)),
        rssBytes: process.memoryUsage().rss
    };
}

/**
 * Measures a metrics scrape: `getMetrics()` plus Prometheus text rendering for
 * ~1,100 series. Scrapes are rare compared to writes, but they allocate the
 * whole snapshot, so this guards against O(series) regressions.
 */
function benchmarkMetricsScrape(iterations: number): BenchmarkResult {
    const registry = new MetricsRegistry();
    const seriesPerMetric = 25;
    for (let metric = 0; metric < 40; metric++) {
        for (let label = 0; label < seriesPerMetric; label++) {
            registry.increment(`bench_counter_${metric}`, 1, {
                route: `/api/r${label}`,
                method: label % 2 ? 'GET' : 'POST'
            });
        }
    }
    for (let label = 0; label < seriesPerMetric; label++) {
        registry.timing('bench_duration_ms', 12.5, { route: `/api/r${label}` });
        registry.timing('bench_duration_seconds', 0.0125, { route: `/api/r${label}` });
    }
    const exporter = new PrometheusExporter();
    const scrape = () => exporter.export(registry.getMetrics());
    for (let i = 0; i < Math.min(10, iterations); i++) {
        scrape();
    }

    const durations: number[] = [];
    const startedAll = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
        const started = process.hrtime.bigint();
        scrape();
        durations.push(Number(process.hrtime.bigint() - started) / 1e6);
    }
    const totalMs = Number(process.hrtime.bigint() - startedAll) / 1e6;
    durations.sort((a, b) => a - b);

    return {
        scenario: 'metrics-scrape',
        params: { series: 40 * seriesPerMetric },
        samples: iterations,
        opsPerSecond: Math.round(iterations / (totalMs / 1000)),
        p50Ms: Number(percentile(durations, 0.5).toFixed(4)),
        p99Ms: Number(percentile(durations, 0.99).toFixed(4)),
        maxMs: Number(durations[durations.length - 1].toFixed(4)),
        rssBytes: process.memoryUsage().rss
    };
}

/**
 * Measures `ConsumerRuntime` end-to-end overhead: concurrency limiting,
 * idempotency reservation and settlement for 10% failing deliveries.
 */
async function benchmarkConsumerRuntime(messages: number, concurrency = 32): Promise<BenchmarkResult> {
    const runtime = new ConsumerRuntime({ concurrency, idempotency: {} });
    const durations = new Array<number>(messages);
    const startedAll = process.hrtime.bigint();
    await Promise.all(Array.from({ length: messages }, (_, i) => {
        const started = process.hrtime.bigint();
        return runtime.handle({ id: `bench-${i}`, payload: i }, async () => {
            if (i % 10 === 0) {
                throw new Error('bench failure');
            }
        }).finally(() => {
            durations[i] = Number(process.hrtime.bigint() - started) / 1e6;
        });
    }));
    const totalMs = Number(process.hrtime.bigint() - startedAll) / 1e6;
    durations.sort((a, b) => a - b);

    return {
        scenario: 'consumer-runtime',
        params: { messages, concurrency, failureRate: 0.1 },
        samples: messages,
        opsPerSecond: Math.round(messages / (totalMs / 1000)),
        p50Ms: Number(percentile(durations, 0.5).toFixed(4)),
        p99Ms: Number(percentile(durations, 0.99).toFixed(4)),
        maxMs: Number(durations[durations.length - 1].toFixed(4)),
        rssBytes: process.memoryUsage().rss
    };
}

/**
 * Measures the gateway response pipeline for gzip-compressed JSON bodies.
 * Includes the JSON serialization that production pays, and exercises the
 * asynchronous zlib path added in S4.3.
 */
async function benchmarkGatewayCompress(bytes: number, samples: number, etag = false): Promise<BenchmarkResult> {
    const runtime = new GatewayRuntime();
    const options: GatewayOptions = { routes: [] };
    const observability = new GatewayObservability(options, runtime, null, null, null);
    const pipeline = new GatewayResponse(options, runtime, observability);
    const route = {
        path: '/api/bench',
        service: 'bench',
        transport: Transport.HTTP,
        compression: { enabled: true, minSize: 256 },
        ...(etag ? { responseCache: { etag: true } } : {})
    } as any;
    const headers: Record<string, string> = { 'accept-encoding': 'gzip' };
    const request = {
        url: '/api/bench',
        method: 'GET',
        headers,
        query: {},
        getHeader: (name: string) => headers[name.toLowerCase()]
    } as any;
    const payload = { data: 'x'.repeat(bytes) };
    const adapter = {
        setHeader: () => undefined,
        setStatus: () => undefined,
        setPayload: () => undefined,
        sendResponse: () => undefined
    };
    const send = () => pipeline.send(route, request, {
        status: 200,
        statusText: 'OK',
        payload
    } as any, Date.now(), adapter, undefined);

    for (let i = 0; i < Math.min(3, samples); i++) {
        await send();
    }

    const durations: number[] = [];
    const startedAll = process.hrtime.bigint();
    for (let i = 0; i < samples; i++) {
        const started = process.hrtime.bigint();
        await send();
        durations.push(Number(process.hrtime.bigint() - started) / 1e6);
    }
    const totalMs = Number(process.hrtime.bigint() - startedAll) / 1e6;
    durations.sort((a, b) => a - b);

    return {
        scenario: 'gateway-compress',
        params: { bytes, etag },
        samples,
        opsPerSecond: Math.round(samples / (totalMs / 1000)),
        p50Ms: Number(percentile(durations, 0.5).toFixed(4)),
        p99Ms: Number(percentile(durations, 0.99).toFixed(4)),
        maxMs: Number(durations[durations.length - 1].toFixed(4)),
        rssBytes: process.memoryUsage().rss
    };
}

/**
 * End-to-end gateway forwarding against a loopback HTTP server.
 *
 * Compares the default global fetch dispatcher with the optional undici
 * `httpPool`, using 16 concurrent workers so connection reuse/pipelining is
 * visible. This is the measurement behind the S4.6 connection-pool decision.
 */
async function benchmarkGatewayForward(pool: 'default' | 'undici', requests: number): Promise<BenchmarkResult> {
    const server = http.createServer((_req, res) => {
        res.setHeader('content-type', 'application/json');
        res.end('{"ok":true}');
    });
    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const port = (server.address() as AddressInfo).port;
    const interceptor = new GatewayInterceptor({
        routes: [{
            path: '/api/echo',
            service: 'echo',
            targetUrl: `http://127.0.0.1:${port}`,
            transport: Transport.HTTP
        }],
        ...(pool === 'undici'
            ? { httpPool: { connections: 64, pipelining: 1, keepAliveTimeout: 30_000 } }
            : {})
    } as GatewayOptions, null, null, new GatewayRuntime());

    try {
        const injector = createInjector();
        const request = {
            url: '/api/echo',
            method: 'GET',
            headers: {},
            query: {},
            getHeader: () => undefined
        } as any;
        const next = { handle: () => of(null) } as any;
        const send = () => new Promise<void>((resolve, reject) => {
            const context = createRequestContext(injector);
            const adapter = {
                setHeader: () => undefined,
                setStatus: () => undefined,
                setPayload: () => undefined,
                sendResponse: () => undefined
            };
            context.set(HttpMessageAdapter, adapter as any);
            context.set(HTTP_RESPONSE, {} as any);
            interceptor.intercept(request, next, context).subscribe({
                error: reject,
                complete: () => resolve()
            });
        });

        for (let i = 0; i < Math.min(20, requests); i++) {
            await send();
        }

        const durations = new Array<number>(requests);
        let cursor = 0;
        const worker = async () => {
            while (cursor < requests) {
                const index = cursor++;
                const started = process.hrtime.bigint();
                await send();
                durations[index] = Number(process.hrtime.bigint() - started) / 1e6;
            }
        };
        const startedAll = process.hrtime.bigint();
        await Promise.all(Array.from({ length: 16 }, worker));
        const totalMs = Number(process.hrtime.bigint() - startedAll) / 1e6;
        durations.sort((a, b) => a - b);

        return {
            scenario: 'gateway-forward',
            params: { pool, requests, concurrency: 16 },
            samples: requests,
            opsPerSecond: Math.round(requests / (totalMs / 1000)),
            p50Ms: Number(percentile(durations, 0.5).toFixed(4)),
            p99Ms: Number(percentile(durations, 0.99).toFixed(4)),
            maxMs: Number(durations[durations.length - 1].toFixed(4)),
            rssBytes: process.memoryUsage().rss
        };
    } finally {
        interceptor.onDestroy();
        await new Promise<void>(resolve => {
            (server as any).closeAllConnections?.();
            server.close(() => resolve());
        });
    }
}

interface TransportBenchmarkScenario {
    protocol: string;
    transport: Transport;
    pattern(index: number): string;
}

const transportScenarios: TransportBenchmarkScenario[] = [
    { protocol: 'mqtt', transport: Transport.MQTT, pattern: index => `sensor/${index}/+/value` },
    { protocol: 'nats', transport: Transport.NATS, pattern: index => `sensor.${index}.*.value` },
    { protocol: 'redis', transport: Transport.Redis, pattern: index => `sensor.${index}.*` },
    { protocol: 'kafka', transport: Transport.Kafka, pattern: index => `sensor-${index}-+` }
];

/**
 * Measures protocol-specific microservice route matching. The benchmark uses
 * the real OptimizedRouter/trie and protocol `toParts`/wildcard tables; broker
 * I/O is intentionally excluded.
 */
async function benchmarkTransportMatch(
    scenario: TransportBenchmarkScenario,
    routeCount: number,
    samples: number
): Promise<BenchmarkResult> {
    const paths: string[] = [];
    for (let i = 0; i < routeCount; i++) {
        paths.push(scenario.pattern(i));
    }
    const router = new OptimizedRouter(
        createInjector(),
        defaultFormatter,
        '',
        scenario.transport,
        { maxCacheSize: 4096 },
        undefined,
        true
    );
    paths.forEach(path => router.use({
        path,
        pattern: path,
        handle: () => undefined
    } as any));

    const targetIndex = Math.floor(routeCount / 2);
    const target = scenario.pattern(targetIndex);
    const request = { topic: target, pattern: target, method: 'GET' } as any;
    const context = createRequestContext(createInjector());
    for (let i = 0; i < Math.min(100, samples); i++) {
        await router.getRoute(request, context);
    }

    const durations: number[] = [];
    const startedAll = process.hrtime.bigint();
    for (let i = 0; i < samples; i++) {
        const started = process.hrtime.bigint();
        await router.getRoute(request, context);
        durations.push(Number(process.hrtime.bigint() - started) / 1e6);
    }
    const totalMs = Number(process.hrtime.bigint() - startedAll) / 1e6;
    durations.sort((a, b) => a - b);

    return {
        scenario: 'transport-route-match',
        params: { protocol: scenario.protocol, routes: routeCount },
        samples,
        opsPerSecond: Math.round(samples / (totalMs / 1000)),
        p50Ms: Number(percentile(durations, 0.5).toFixed(4)),
        p99Ms: Number(percentile(durations, 0.99).toFixed(4)),
        maxMs: Number(durations[durations.length - 1].toFixed(4)),
        rssBytes: process.memoryUsage().rss
    };
}

async function main(): Promise<void> {
    const routeSizes = (argValue('routes') ?? '100,1000,10000')
        .split(',')
        .map(value => Number(value.trim()))
        .filter(value => Number.isInteger(value) && value > 0);
    const samples = Number(argValue('samples') ?? 2000);
    const jsonPath = resolve(argValue('json') ?? resolve(__dirname, 'results/baseline.json'));

    const results = routeSizes.map(size => benchmarkRouteMatch(size, samples));
    results.push(benchmarkMetricsWrite(Math.min(Math.max(samples * 50, 20000), 500000)));
    results.push(benchmarkMetricsScrape(Math.max(50, Math.min(Math.floor(samples / 8), 200))));
    results.push(await benchmarkConsumerRuntime(1000));
    for (const bytes of [1024, 64 * 1024, 1024 * 1024]) {
        const samples = bytes <= 1024 ? 300 : bytes <= 65536 ? 100 : 20;
        results.push(await benchmarkGatewayCompress(bytes, samples, false));
        results.push(await benchmarkGatewayCompress(bytes, samples, true));
    }
    results.push(await benchmarkGatewayForward('default', 200));
    results.push(await benchmarkGatewayForward('undici', 200));
    for (const scenario of transportScenarios) {
        for (const size of routeSizes) {
            results.push(await benchmarkTransportMatch(scenario, size, Math.min(samples, 1000)));
        }
    }
    const report: BenchmarkReport = {
        generatedAt: new Date().toISOString(),
        node: process.version,
        platform: `${process.platform}/${process.arch}`,
        results
    };

    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, `${JSON.stringify(report, null, 4)}\n`);

    console.log(`# microservice benchmarks (${report.platform}, node ${report.node})`);
    console.log('');
    console.log('| scenario | params | ops/sec | p50 ms | p99 ms | max ms |');
    console.log('|---|---|---|---|---|---|');
    for (const result of results) {
        const params = Object.entries(result.params).map(([key, value]) => `${key}=${value}`).join(' ');
        console.log(`| ${result.scenario} | ${params} | ${result.opsPerSecond} | ${result.p50Ms} | ${result.p99Ms} | ${result.maxMs} |`);
    }
    console.log('');
    console.log(`written: ${jsonPath}`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
