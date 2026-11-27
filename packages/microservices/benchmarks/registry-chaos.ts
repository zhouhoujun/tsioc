/**
 * Registry jitter chaos.
 *
 *   MS_REGISTRY_CHAOS_PROFILE=1 bash scripts/agents-gate.sh ms-registry-chaos
 *
 * Starts a real Consul HTTP API fixture as a separate process, resolves an
 * endpoint through ConsulServiceDiscovery + DefaultEndpointResolver, kills the
 * registry with SIGKILL, and verifies that:
 *
 *   1. the resolver keeps serving the last known endpoints while the registry
 *      is down (stale-while-error),
 *   2. repeated resolves during the outage hit the backoff window instead of
 *      hammering the dead registry,
 *   3. once the registry is restarted on the same address the resolver
 *      recovers and reports the new endpoint, and
 *   4. a second kill/restart flap behaves the same way.
 */
import { spawn, ChildProcess } from 'node:child_process';
import * as net from 'node:net';
import * as path from 'node:path';
import { ConsulServiceDiscovery, DefaultEndpointResolver } from '@tsdi/discovery';

const SERVICE = 'chaos-svc';
const FIRST_ENDPOINT = '127.0.0.1:9101';
const SECOND_ENDPOINT = '127.0.0.1:9102';
const THIRD_ENDPOINT = '127.0.0.1:9103';
const CACHE_TTL_SECONDS = 0.4;
const CACHE_EXPIRY_MS = CACHE_TTL_SECONDS * 1000;
const BACKOFF_WAIT_MS = 1200;
const FIXTURE = path.join(__dirname, 'fixtures', 'fake-consul.mjs');

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = address && typeof address === 'object' ? address.port : 0;
            server.close(error => error ? reject(error) : resolve(port));
        });
    });
}

const children = new Set<ChildProcess>();

function spawnRegistry(port: number, endpoint: string): ChildProcess {
    const child = spawn(process.execPath, [FIXTURE], {
        env: {
            ...process.env,
            FAKE_CONSUL_PORT: String(port),
            FAKE_CONSUL_ENDPOINT: endpoint,
            FAKE_CONSUL_SERVICE: SERVICE
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout?.resume();
    child.stderr?.on('data', chunk => process.stderr.write(`[fake-consul] ${String(chunk)}`));
    children.add(child);
    return child;
}

async function waitReady(port: number, endpoint: string): Promise<void> {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(`http://127.0.0.1:${port}/__stats`);
            if (response.ok) {
                const stats = await response.json() as { endpoint?: string };
                if (stats.endpoint === endpoint) {
                    return;
                }
            }
        } catch {
            // registry is still starting
        }
        await sleep(100);
    }
    throw new Error(`fake consul on ${port} (${endpoint}) did not become ready`);
}

async function kill(child: ChildProcess | undefined): Promise<void> {
    if (!child || child.exitCode != null || child.signalCode != null) {
        return;
    }
    const exited = new Promise<void>(resolve => child.once('exit', () => resolve()));
    child.kill('SIGKILL');
    await exited;
}

async function main(): Promise<void> {
    const port = await freePort();
    let registry = spawnRegistry(port, FIRST_ENDPOINT);
    await waitReady(port, FIRST_ENDPOINT);

    let fetchCalls = 0;
    const countingFetch = ((input: any, init?: any) => {
        fetchCalls += 1;
        return fetch(input, init);
    }) as typeof fetch;

    const discovery = new ConsulServiceDiscovery({
        url: `http://127.0.0.1:${port}`,
        watchInterval: 60_000,
        fetchImpl: countingFetch
    });
    const resolver = new DefaultEndpointResolver(discovery, {
        cacheExpiration: CACHE_TTL_SECONDS,
        retryInterval: 1
    });

    try {
        const initial = await resolver.resolve(SERVICE);
        assert(
            initial.length === 1 && initial[0].id === `${SERVICE}-9101`,
            `initial resolve returned ${JSON.stringify(initial)}`
        );
        await sleep(150);
        const baseline = fetchCalls;

        await kill(registry);
        await sleep(CACHE_EXPIRY_MS + 50);
        const stale = await resolver.resolve(SERVICE);
        const outageCalls = fetchCalls - baseline;
        assert(outageCalls >= 1 && outageCalls <= 2, `expected 1-2 registry calls during outage, saw ${outageCalls}`);
        assert(
            stale.length === 1 && stale[0].id === `${SERVICE}-9101`,
            `stale resolve returned ${JSON.stringify(stale)}`
        );
        assert(!!resolver.getLastError(SERVICE), 'expected a recorded registry error during the outage');

        const afterFailure = fetchCalls;
        for (let index = 0; index < 4; index++) {
            const backedOff = await resolver.resolve(SERVICE);
            assert(
                backedOff.length === 1 && backedOff[0].id === `${SERVICE}-9101`,
                `backoff resolve ${index} returned ${JSON.stringify(backedOff)}`
            );
        }
        const backoffCalls = fetchCalls - afterFailure;
        assert(
            backoffCalls === 0,
            `backoff did not suppress registry calls (${backoffCalls} extra)`
        );

        registry = spawnRegistry(port, SECOND_ENDPOINT);
        await waitReady(port, SECOND_ENDPOINT);
        await sleep(BACKOFF_WAIT_MS);
        const recovered = await resolver.resolve(SERVICE);
        assert(
            recovered.length === 1 && recovered[0].id === `${SERVICE}-9102`,
            `recovered resolve returned ${JSON.stringify(recovered)}`
        );
        assert(!resolver.getLastError(SERVICE), 'registry error should be cleared after recovery');

        // Second flap: kill the restarted registry, serve stale again, then
        // recover against a third registry instance.
        await kill(registry);
        await sleep(CACHE_EXPIRY_MS + 50);
        const staleAgain = await resolver.resolve(SERVICE);
        assert(
            staleAgain.length === 1 && staleAgain[0].id === `${SERVICE}-9102`,
            `second stale resolve returned ${JSON.stringify(staleAgain)}`
        );
        assert(!!resolver.getLastError(SERVICE), 'expected a recorded error during the second outage');

        registry = spawnRegistry(port, THIRD_ENDPOINT);
        await waitReady(port, THIRD_ENDPOINT);
        await sleep(BACKOFF_WAIT_MS);
        const recoveredAgain = await resolver.resolve(SERVICE);
        assert(
            recoveredAgain.length === 1 && recoveredAgain[0].id === `${SERVICE}-9103`,
            `second recovered resolve returned ${JSON.stringify(recoveredAgain)}`
        );
        assert(!resolver.getLastError(SERVICE), 'registry error should be cleared after the second recovery');

        console.log(JSON.stringify({
            registry: 'consul-http-fixture',
            flaps: 2,
            outageCalls,
            backoffCalls,
            endpoints: [FIRST_ENDPOINT, SECOND_ENDPOINT, THIRD_ENDPOINT]
        }, null, 2));
        console.log('registry chaos ok');
    } finally {
        resolver.onDestroy();
        await discovery.shutdown();
        await kill(registry);
    }
}

main().catch(error => {
    console.error('registry chaos failed:', error);
    process.exit(1);
});

/** Ensure no fake registry outlives the chaos run. */
process.on('exit', () => {
    for (const child of children) {
        try {
            child.kill('SIGKILL');
        } catch {
            // best effort
        }
    }
});
