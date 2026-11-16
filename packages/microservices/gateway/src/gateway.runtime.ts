import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { GatewayBulkheadOptions, GatewayCircuitBreakerOptions, GatewayMockOptions, GatewayOptions, GatewayRouteOptions, GatewayRuleOptions, GatewaySensitiveFieldRule } from './gateway.options';
import { ServiceEndpoint } from '@tsdi/discovery';
import { GatewayCircuitRecord, GatewayStateStore } from './state.store';
import { GatewaySloOptions } from './gateway.options';
import { MetricsCollector } from '@tsdi/metrics';

interface CacheEntry {
    expireAt: number;
    storedAt: number;
    size: number;
    value: any;
}

export interface GatewayCacheLimits {
    maxEntries?: number;
    maxBytes?: number;
}

interface CircuitState {
    failures: number;
    openedAt?: number;
    halfOpen?: boolean;
    halfOpenInFlight?: boolean;
}

interface RouteStats {
    requests: number;
    errors: number;
    totalMs: number;
    buckets: number[];
    errorRateThreshold?: number;
    p95ThresholdMs?: number;
    alert: boolean;
    violations: number;
    alerts: GatewaySloAlert[];
}

const ROUTE_LATENCY_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

interface BulkheadEntry {
    resolve: () => void;
    reject: (error: Error) => void;
    timer?: ReturnType<typeof setTimeout>;
}

interface BulkheadState {
    active: number;
    queue: BulkheadEntry[];
    limit: number;
    maxLimit: number;
    minLimit: number;
    adaptive: boolean;
    maxQueue: number;
    rejected: number;
    timeouts: number;
    successStreak: number;
}

export interface GatewayCircuitSnapshot {
    key: string;
    failures: number;
    open: boolean;
}

export interface GatewayBulkheadSnapshot {
    key: string;
    active: number;
    queued: number;
    limit?: number;
    maxQueue?: number;
    rejected?: number;
    timeouts?: number;
    adaptive?: boolean;
}

export interface GatewaySloAlert {
    key: string;
    timestamp: number;
    errorRate: number;
    p95Ms: number;
    errorRateThreshold?: number;
    p95ThresholdMs?: number;
}

export interface GatewayRouteSnapshot {
    key: string;
    requests: number;
    errors: number;
    errorRate: number;
    avgMs: number;
    p95Ms: number;
    p99Ms: number;
    alert: boolean;
    violations: number;
    alerts: GatewaySloAlert[];
}

export interface GatewayRuntimeSnapshot {
    cacheEntries: number;
    activeRequests: number;
    evictedEndpoints: number;
    circuits: GatewayCircuitSnapshot[];
    bulkheads: GatewayBulkheadSnapshot[];
    routes: GatewayRouteSnapshot[];
    alerts: GatewaySloAlert[];
}

@Injectable()
export class GatewayRuntime {
    private cache = new Map<string, CacheEntry>();
    private circuits = new Map<string, CircuitState>();
    private rounds = new Map<string, number>();
    private dynamicOptions: Partial<GatewayOptions> = {};
    private evictedEndpoints = new Map<string, number>();
    private nonces = new Map<string, number>();
    private activeRequests = new Map<string, number>();
    private bulkheads = new Map<string, BulkheadState>();
    private routeStats = new Map<string, RouteStats>();
    private sloAlerts: GatewaySloAlert[] = [];
    private configRevisionValue = 0;

    constructor(
        @Optional() @Inject(GatewayStateStore) private readonly store?: GatewayStateStore | null,
        @Optional() @Inject(MetricsCollector) private readonly metrics?: MetricsCollector | null
    ) { }

    private get stateStore(): GatewayStateStore | undefined {
        const store = this.store as any;
        return store && typeof store.getCircuit === 'function' && typeof store.setCircuit === 'function'
            ? store as GatewayStateStore
            : undefined;
    }

    /** Lightweight runtime diagnostics for the admin console. */
    async snapshot(): Promise<GatewayRuntimeSnapshot> {
        const now = Date.now();
        const shared = this.stateStore ? await this.stateStore.stats() : undefined;
        return {
            cacheEntries: shared
                ? shared.cacheEntries
                : Array.from(this.cache.values()).filter(entry => entry.expireAt > now).length,
            activeRequests: this.activeRequests.size,
            evictedEndpoints: this.evictedEndpoints.size,
            circuits: shared
                ? shared.circuits
                : Array.from(this.circuits.entries()).map(([key, state]) => ({
                    key,
                    failures: state.failures,
                    open: !!state.openedAt
                })),
            alerts: this.sloAlerts.slice().reverse(),
            routes: Array.from(this.routeStats.entries()).map(([key, stats]) => ({
                key,
                requests: stats.requests,
                errors: stats.errors,
                errorRate: stats.requests ? stats.errors / stats.requests : 0,
                avgMs: stats.requests ? Math.round(stats.totalMs / stats.requests) : 0,
                p95Ms: percentile(stats, 0.95),
                p99Ms: percentile(stats, 0.99),
                alert: stats.alert,
                violations: stats.violations,
                alerts: stats.alerts.slice()
            })),
            bulkheads: Array.from(this.bulkheads.entries()).map(([key, state]) => ({
                key,
                active: state.active,
                queued: state.queue.length,
                limit: state.limit,
                maxQueue: state.maxQueue,
                rejected: state.rejected,
                timeouts: state.timeouts,
                adaptive: state.adaptive
            }))
        };
    }

    async getCached(key: string): Promise<any | undefined> {
        return (await this.getCachedEntry(key))?.value;
    }

    async getCachedEntry(key: string): Promise<{ value: any; storedAt: number; size: number } | undefined> {
        if (this.stateStore) {
            const shared = await this.stateStore.getCache(key);
            return shared ? { value: shared.value, storedAt: shared.storedAt, size: shared.size } : undefined;
        }
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        if (entry.expireAt <= Date.now()) {
            this.cache.delete(key);
            return undefined;
        }
        // Refresh LRU recency.
        this.cache.delete(key);
        this.cache.set(key, entry);
        return { value: entry.value, storedAt: entry.storedAt, size: entry.size };
    }

    async setCached(key: string, value: any, ttl: number, limits: GatewayCacheLimits = {}): Promise<void> {
        const now = Date.now();
        const record = {
            value,
            expireAt: now + ttl,
            storedAt: now,
            size: estimatePayloadSize(value)
        };
        if (this.stateStore) {
            await this.stateStore.setCache(key, {
                value,
                storedAt: record.storedAt,
                size: record.size
            }, ttl);
            return;
        }
        this.pruneExpiredCache(now);
        this.cache.delete(key);
        this.cache.set(key, record);
        this.enforceCacheLimits(limits);
    }

    private pruneExpiredCache(now = Date.now()): void {
        for (const [key, entry] of this.cache) {
            if (entry.expireAt <= now) {
                this.cache.delete(key);
            }
        }
    }

    private enforceCacheLimits(limits: GatewayCacheLimits): void {
        const maxEntries = limits.maxEntries ?? 0;
        const maxBytes = limits.maxBytes ?? 0;
        while (maxEntries > 0 && this.cache.size > maxEntries) {
            this.deleteOldestCacheEntry();
        }
        if (maxBytes > 0) {
            let total = 0;
            for (const entry of this.cache.values()) {
                total += entry.size;
            }
            while (total > maxBytes && this.cache.size > 0) {
                const oldest = this.cache.keys().next().value as string | undefined;
                if (oldest === undefined) {
                    break;
                }
                total -= this.cache.get(oldest)?.size ?? 0;
                this.cache.delete(oldest);
            }
        }
    }

    private deleteOldestCacheEntry(): void {
        const oldest = this.cache.keys().next().value as string | undefined;
        if (oldest !== undefined) {
            this.cache.delete(oldest);
        }
    }

    nextRoundIndex(key: string, size: number): number {
        if (size <= 0) {
            return 0;
        }
        const current = this.rounds.get(key) ?? 0;
        this.rounds.set(key, current + 1);
        return current % size;
    }

    setDynamicOptions(options: Partial<GatewayOptions>): void {
        this.dynamicOptions = options ?? {};
        this.configRevisionValue += 1;
    }

    /**
     * Monotonic config revision. Incremented on every dynamic option swap so
     * derived structures (compiled route table) can be rebuilt atomically.
     */
    get configRevision(): number {
        return this.configRevisionValue;
    }

    /**
     * Drop derived state that is keyed by route/rule configuration. Called
     * after a transactional config apply so stale entries cannot leak into the
     * new table.
     */
    invalidateConfigCaches(): void {
        this.cache.clear();
        this.rounds.clear();
        this.circuits.clear();
        if (this.stateStore) {
            void this.stateStore.clearCache().catch(() => undefined);
        }
    }

    getDynamicOptions(): Partial<GatewayOptions> {
        return this.dynamicOptions;
    }

    getRoutes(staticRoutes: GatewayRouteOptions[]): GatewayRouteOptions[] {
        if (this.dynamicOptions.routes?.length) {
            return this.dynamicOptions.routes;
        }
        return staticRoutes;
    }

    getRules(staticRules: GatewayRuleOptions[] = []): GatewayRuleOptions[] {
        if (Array.isArray(this.dynamicOptions.rules)) {
            return this.dynamicOptions.rules;
        }
        return staticRules;
    }

    getOption<K extends keyof GatewayOptions>(key: K, fallback: GatewayOptions[K]): GatewayOptions[K] {
        const value = this.dynamicOptions[key];
        return (value === undefined ? fallback : value) as GatewayOptions[K];
    }

    async canPassCircuit(routeKey: string, options?: GatewayCircuitBreakerOptions | false): Promise<boolean> {
        if (!options) {
            return true;
        }
        const state = await this.getCircuit(routeKey);
        if (!state?.openedAt) {
            return true;
        }
        const resetTimeout = options.resetTimeout ?? 30_000;
        if (Date.now() - state.openedAt >= resetTimeout) {
            if (state.halfOpenInFlight) {
                return false;
            }
            state.halfOpen = true;
            state.halfOpenInFlight = true;
            await this.setCircuit(routeKey, state, circuitTtl(options));
            return true;
        }
        return false;
    }

    async recordFailure(routeKey: string, options?: GatewayCircuitBreakerOptions | false): Promise<void> {
        if (!options) {
            return;
        }
        const threshold = options.failureThreshold ?? 5;
        const current = (await this.getCircuit(routeKey)) ?? { failures: 0 };
        if (current.halfOpen) {
            current.failures = threshold;
            current.openedAt = Date.now();
            current.halfOpen = false;
            current.halfOpenInFlight = false;
            await this.setCircuit(routeKey, current, circuitTtl(options));
            return;
        }
        current.failures += 1;
        if (current.failures >= threshold) {
            current.openedAt = Date.now();
            current.halfOpen = false;
            current.halfOpenInFlight = false;
        }
        await this.setCircuit(routeKey, current, circuitTtl(options));
    }

    async recordSuccess(routeKey: string): Promise<void> {
        await this.setCircuit(routeKey, { failures: 0, halfOpen: false, halfOpenInFlight: false }, 60_000);
    }

    private async getCircuit(routeKey: string): Promise<GatewayCircuitRecord | undefined> {
        return this.stateStore ? this.stateStore.getCircuit(routeKey) : this.circuits.get(routeKey);
    }

    private async setCircuit(routeKey: string, state: GatewayCircuitRecord, ttlMs: number): Promise<void> {
        if (this.stateStore) {
            await this.stateStore.setCircuit(routeKey, state, ttlMs);
            return;
        }
        this.circuits.set(routeKey, state);
    }

    recordRouteOutcome(routeKey: string, status: number, durationMs: number, slo?: GatewaySloOptions): void {
        let stats = this.routeStats.get(routeKey);
        if (!stats) {
            stats = {
                requests: 0,
                errors: 0,
                totalMs: 0,
                buckets: new Array(ROUTE_LATENCY_BUCKETS.length).fill(0),
                alert: false,
                violations: 0,
                alerts: []
            };
            this.routeStats.set(routeKey, stats);
        }
        stats.errorRateThreshold = slo?.errorRateThreshold;
        stats.p95ThresholdMs = slo?.p95ThresholdMs;
        stats.requests += 1;
        stats.totalMs += Math.max(0, durationMs);
        if (status >= 500) {
            stats.errors += 1;
        }
        const index = ROUTE_LATENCY_BUCKETS.findIndex(bound => durationMs <= bound);
        stats.buckets[index >= 0 ? index : ROUTE_LATENCY_BUCKETS.length - 1] += 1;

        const errorRate = stats.requests ? stats.errors / stats.requests : 0;
        const alert = (stats.errorRateThreshold != null && errorRate > stats.errorRateThreshold)
            || (stats.p95ThresholdMs != null && percentile(stats, 0.95) > stats.p95ThresholdMs);
        if (alert && !stats.alert) {
            stats.violations += 1;
            const entry: GatewaySloAlert = {
                key: routeKey,
                timestamp: Date.now(),
                errorRate,
                p95Ms: percentile(stats, 0.95),
                errorRateThreshold: stats.errorRateThreshold,
                p95ThresholdMs: stats.p95ThresholdMs
            };
            stats.alerts.push(entry);
            if (stats.alerts.length > 10) {
                stats.alerts.shift();
            }
            this.sloAlerts.push(entry);
            if (this.sloAlerts.length > 20) {
                this.sloAlerts.shift();
            }
            this.metrics?.increment('gateway_slo_violations_total', 1, { key: routeKey });
        }
        stats.alert = alert;
    }

    evictEndpoint(endpoint: ServiceEndpoint, durationMs: number): void {
        this.evictedEndpoints.set(endpoint.id, Date.now() + durationMs);
    }

    isEndpointAvailable(endpoint: ServiceEndpoint): boolean {
        const until = this.evictedEndpoints.get(endpoint.id);
        if (!until) {
            return true;
        }
        if (until <= Date.now()) {
            this.evictedEndpoints.delete(endpoint.id);
            return true;
        }
        return false;
    }

    clearEndpointEviction(endpointId: string): void {
        this.evictedEndpoints.delete(endpointId);
    }

    beginEndpointRequest(endpointId: string): void {
        this.activeRequests.set(endpointId, (this.activeRequests.get(endpointId) ?? 0) + 1);
    }

    endEndpointRequest(endpointId: string): void {
        const current = this.activeRequests.get(endpointId) ?? 0;
        if (current <= 1) {
            this.activeRequests.delete(endpointId);
        } else {
            this.activeRequests.set(endpointId, current - 1);
        }
    }

    getEndpointActiveRequests(endpointId: string): number {
        return this.activeRequests.get(endpointId) ?? 0;
    }

    /**
     * Acquire a concurrency slot for a route.
     * `maxConcurrent` is optional; when omitted the bulkhead is a no-op.
     */
    async acquireBulkhead(routeKey: string, options?: GatewayBulkheadOptions | false): Promise<() => void> {
        if (!options) {
            return () => undefined;
        }
        const maxConcurrent = options.maxConcurrent ?? Number.MAX_SAFE_INTEGER;
        const maxQueue = Math.max(options.maxQueue ?? 0, 0);
        const initial = Math.max(1, options.initialConcurrent ?? maxConcurrent);
        const minLimit = Math.max(1, options.minConcurrent ?? 1);
        let state = this.bulkheads.get(routeKey);
        if (!state) {
            state = {
                active: 0,
                queue: [],
                limit: Math.min(initial, maxConcurrent),
                maxLimit: maxConcurrent,
                minLimit,
                adaptive: options.adaptive === true,
                maxQueue,
                rejected: 0,
                timeouts: 0,
                successStreak: 0
            };
            this.bulkheads.set(routeKey, state);
        } else {
            state.adaptive = options.adaptive === true;
            state.maxLimit = maxConcurrent;
            state.minLimit = minLimit;
            state.maxQueue = maxQueue;
            state.limit = Math.min(Math.max(state.limit, minLimit), maxConcurrent);
        }
        const error = () => Object.assign(new Error(options.message ?? 'Gateway bulkhead is full'), {
            statusCode: 503,
            statusMessage: 'Service Unavailable'
        });
        if (state.active < state.limit) {
            state.active++;
            this.emitBulkheadMetrics(routeKey, state);
            return this.releaseBulkhead(routeKey, state);
        }
        if (state.queue.length >= maxQueue) {
            state.rejected += 1;
            this.shrinkBulkhead(state);
            this.metrics?.increment('gateway_bulkhead_rejected_total', 1, { key: routeKey });
            this.emitBulkheadMetrics(routeKey, state);
            throw error();
        }
        const timeoutMs = Math.max(options.queueTimeoutMs ?? 0, 0);
        return new Promise<() => void>((resolve, reject) => {
            const entry: BulkheadEntry = {
                resolve: () => resolve(this.releaseBulkhead(routeKey, state!)),
                reject
            };
            if (timeoutMs > 0) {
                entry.timer = setTimeout(() => {
                    const index = state!.queue.indexOf(entry);
                    if (index >= 0) {
                        state!.queue.splice(index, 1);
                    }
                    state!.timeouts += 1;
                    this.shrinkBulkhead(state!);
                    this.metrics?.increment('gateway_bulkhead_timeout_total', 1, { key: routeKey });
                    this.emitBulkheadMetrics(routeKey, state!);
                    reject(error());
                }, timeoutMs);
                if (typeof (entry.timer as any).unref === 'function') {
                    (entry.timer as any).unref();
                }
            }
            state!.queue.push(entry);
            this.emitBulkheadMetrics(routeKey, state!);
        });
    }

    private releaseBulkhead(routeKey: string, state: BulkheadState): () => void {
        let released = false;
        return () => {
            if (released) {
                return;
            }
            released = true;
            state.active = Math.max(state.active - 1, 0);
            const next = state.queue.shift();
            if (next) {
                if (next.timer) {
                    clearTimeout(next.timer);
                }
                state.active++;
                next.resolve();
            } else if (state.active === 0 && !state.adaptive) {
                this.emitBulkheadMetrics(routeKey, state);
                this.bulkheads.delete(routeKey);
            }
            this.growBulkhead(state);
            this.emitBulkheadMetrics(routeKey, state);
        };
    }

    private shrinkBulkhead(state: BulkheadState): void {
        if (!state.adaptive) {
            return;
        }
        state.successStreak = 0;
        state.limit = Math.max(state.minLimit, Math.floor(state.limit * 0.8) || state.limit - 1);
    }

    private growBulkhead(state: BulkheadState): void {
        if (!state.adaptive || state.queue.length) {
            return;
        }
        if (state.active <= Math.floor(state.limit / 2)) {
            state.successStreak += 1;
            if (state.successStreak >= 3 && state.limit < state.maxLimit) {
                state.limit += 1;
                state.successStreak = 0;
            }
        } else {
            state.successStreak = 0;
        }
    }

    private emitBulkheadMetrics(key: string, state: BulkheadState): void {
        if (!this.metrics) {
            return;
        }
        this.metrics.gauge('gateway_bulkhead_active', state.active, { key });
        this.metrics.gauge('gateway_bulkhead_queued', state.queue.length, { key });
        this.metrics.gauge('gateway_bulkhead_limit', state.limit, { key });
    }

    hasSharedState(): boolean {
        return !!this.stateStore;
    }

    async incrementRateLimit(key: string, windowMs: number): Promise<{ count: number; resetAt: number } | undefined> {
        return this.stateStore ? this.stateStore.increment(key, windowMs) : undefined;
    }

    async rememberNonce(key: string, ttl: number): Promise<boolean> {
        if (this.stateStore) {
            return this.stateStore.useNonce(key, ttl);
        }
        const expireAt = this.nonces.get(key);
        if (expireAt && expireAt > Date.now()) {
            return false;
        }
        this.nonces.set(key, Date.now() + ttl);
        return true;
    }

    resolveMock(options: GatewayMockOptions | undefined, request: any, error?: any): any {
        if (!options) {
            return undefined;
        }
        if (typeof options.data === 'function') {
            return options.data(request);
        }
        if (options.data !== undefined) {
            return options.data;
        }
        if (error && options.onError) {
            return { mocked: true, error: error.message ?? 'Gateway mock fallback' };
        }
        return undefined;
    }

    maskPayload(payload: any, rules?: GatewaySensitiveFieldRule[]): any {
        if (!payload || !rules?.length || typeof payload !== 'object') {
            return payload;
        }
        if (Array.isArray(payload)) {
            return payload.map(item => this.maskPayload(item, rules));
        }
        const cloned = { ...payload };
        for (const rule of rules) {
            if (rule.field in cloned && cloned[rule.field] != null) {
                cloned[rule.field] = rule.mask ?? '***';
            }
        }
        return cloned;
    }
}

function estimatePayloadSize(value: any): number {
    try {
        if (typeof value === 'string') {
            return Buffer.byteLength(value);
        }
        if (Buffer.isBuffer(value)) {
            return value.length;
        }
        return Buffer.byteLength(JSON.stringify(value));
    } catch {
        return 0;
    }
}

function circuitTtl(options: GatewayCircuitBreakerOptions): number {
    return Math.max(options.resetTimeout ?? 30_000, 60_000);
}

function percentile(stats: RouteStats, ratio: number): number {
    if (!stats.requests) {
        return 0;
    }
    const target = Math.ceil(stats.requests * ratio);
    let cumulative = 0;
    for (let index = 0; index < stats.buckets.length; index++) {
        cumulative += stats.buckets[index];
        if (cumulative >= target) {
            return ROUTE_LATENCY_BUCKETS[index];
        }
    }
    return ROUTE_LATENCY_BUCKETS[ROUTE_LATENCY_BUCKETS.length - 1];
}
