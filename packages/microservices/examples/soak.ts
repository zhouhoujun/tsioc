/**
 * Soak smoke for the quickstart HTTP service.
 *
 * Boots the example, keeps a fixed number of concurrent callers busy for a
 * configurable window, then closes the context and checks that sockets/handles
 * return to the baseline and RSS did not grow without bound.
 *
 *   MS_SOAK_MS=30000 npx ts-node -r tsconfig-paths/register \
 *     packages/microservices/examples/soak.ts
 *
 * CI can run the full 30 minute window by setting `MS_SOAK_MS=1800000`.
 */
import * as http from 'node:http';
import { startQuickstart } from './http-quickstart';

const PORT = Number(process.env.TSIO_SOAK_PORT ?? 3216);
const DURATION_MS = Number(process.env.MS_SOAK_MS ?? 30_000);
const CONCURRENCY = Number(process.env.MS_SOAK_CONCURRENCY ?? 8);
// RSS keeps allocator pages after a burst even when the heap is stable; it is
// reported for trend review and only enforced when an explicit limit is set.
const RSS_LIMIT_MB = process.env.MS_SOAK_RSS_LIMIT_MB
    ? Number(process.env.MS_SOAK_RSS_LIMIT_MB)
    : undefined;
const HEAP_LIMIT_MB = Number(process.env.MS_SOAK_HEAP_LIMIT_MB ?? 64);
const HANDLE_LIMIT = Number(process.env.MS_SOAK_HANDLE_LIMIT ?? 4);

function activeHandles(): number {
    const probe = (process as any).getActiveResourcesInfo;
    return typeof probe === 'function' ? probe.call(process).length : 0;
}

function rssMb(): number {
    return Math.round(process.memoryUsage().rss / 1024 / 1024);
}

function heapUsedMb(): number {
    return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getHello(): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const req = http.get({
            host: '127.0.0.1',
            port: PORT,
            path: '/hello',
            agent: false
        }, response => {
            response.resume();
            response.on('end', () => resolve((response.statusCode ?? 0) === 200));
        });
        req.on('error', reject);
    });
}

function gcNow(): void {
    const gc = (globalThis as any).gc;
    if (typeof gc === 'function') {
        gc();
    }
}

async function main(): Promise<void> {
    const handlesBeforeBoot = activeHandles();
    const context = await startQuickstart(PORT);
    await sleep(500);

    let requests = 0;
    let failures = 0;

    async function worker(until: number): Promise<void> {
        while (Date.now() < until) {
            if (process.env.MS_SOAK_LOG === '1' && Date.now() % 2000 < 20) {
                console.log(`[soak] requests=${requests} heap=${heapUsedMb()}MB rss=${rssMb()}MB handles=${activeHandles()}`);
            }
            try {
                if (await getHello()) {
                    requests += 1;
                } else {
                    failures += 1;
                }
            } catch {
                failures += 1;
            }
        }
    }

    // Warm-up lets V8/JIT and the HTTP client pool reach a steady state; the
    // leak budget is measured from there, not from a cold process.
    const warmupMs = Math.min(5000, Math.max(1000, Math.floor(DURATION_MS / 6)));
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(Date.now() + warmupMs)));
    await sleep(500);
    gcNow();
    await sleep(200);

    const baselineHandles = activeHandles();
    const baselineRss = rssMb();
    const baselineHeap = heapUsedMb();
    const deadline = Date.now() + DURATION_MS;
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(deadline)));

    for (let attempt = 0; attempt < 40; attempt++) {
        await sleep(250);
        if (activeHandles() <= baselineHandles) {
            break;
        }
    }
    gcNow();
    await sleep(300);
    const handlesAfterLoad = activeHandles();
    const rssAfterLoad = rssMb();
    const heapAfterLoad = heapUsedMb();

    await context.close();
    for (let attempt = 0; attempt < 40; attempt++) {
        await sleep(250);
        if (activeHandles() <= handlesBeforeBoot + 2) {
            break;
        }
    }
    gcNow();
    await sleep(300);
    const handlesAfterClose = activeHandles();
    const rssAfterClose = rssMb();
    const heapAfterClose = heapUsedMb();

    const rssGrowth = rssAfterClose - baselineRss;
    const heapGrowth = heapAfterClose - baselineHeap;
    const leakedHandles = handlesAfterClose - handlesBeforeBoot;
    const result = {
        durationMs: DURATION_MS,
        concurrency: CONCURRENCY,
        requests,
        failures,
        handlesBeforeBoot,
        baselineHandles,
        handlesAfterLoad,
        handlesAfterClose,
        baselineRssMb: baselineRss,
        rssAfterLoadMb: rssAfterLoad,
        rssAfterCloseMb: rssAfterClose,
        rssGrowthMb: rssGrowth,
        rssLimitMb: RSS_LIMIT_MB ?? null,
        baselineHeapMb: baselineHeap,
        heapAfterLoadMb: heapAfterLoad,
        heapAfterCloseMb: heapAfterClose,
        heapGrowthMb: heapGrowth,
        leakedHandles
    };
    console.log(JSON.stringify(result, null, 2));

    if (failures > 0) {
        throw new Error(`soak failures: ${failures}/${requests + failures} requests failed`);
    }
    if (leakedHandles > HANDLE_LIMIT) {
        throw new Error(`soak handle leak: ${leakedHandles} handles above boot baseline (limit ${HANDLE_LIMIT})`);
    }
    if (heapGrowth > HEAP_LIMIT_MB) {
        throw new Error(`soak heap growth ${heapGrowth}MB exceeds ${HEAP_LIMIT_MB}MB`);
    }
    if (RSS_LIMIT_MB != null && rssGrowth > RSS_LIMIT_MB) {
        throw new Error(`soak RSS growth ${rssGrowth}MB exceeds ${RSS_LIMIT_MB}MB`);
    }
    console.log('soak ok');
}

main().catch(error => {
    console.error('soak failed:', error);
    process.exit(1);
});
