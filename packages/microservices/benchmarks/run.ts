/**
 * In-process benchmarks for @tsdi/microservices hot paths.
 *
 * Usage (from the repository root):
 *   npm run bench
 *   npm run bench -- --routes 100,1000 --samples 500 --json out.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { GatewayInterceptor } from '../gateway/src/gateway.interceptor';
import { GatewayRuntime } from '../gateway/src/gateway.runtime';
import { GatewayOptions, GatewayRouteOptions } from '../gateway/src/gateway.options';

interface BenchmarkResult {
    scenario: string;
    params: Record<string, number | string>;
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

function main(): void {
    const routeSizes = (argValue('routes') ?? '100,1000,10000')
        .split(',')
        .map(value => Number(value.trim()))
        .filter(value => Number.isInteger(value) && value > 0);
    const samples = Number(argValue('samples') ?? 2000);
    const jsonPath = resolve(argValue('json') ?? resolve(__dirname, 'results/baseline.json'));

    const results = routeSizes.map(size => benchmarkRouteMatch(size, samples));
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

main();
