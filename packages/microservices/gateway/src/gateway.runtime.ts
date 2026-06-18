import { Injectable } from '@tsdi/ioc';
import { GatewayCacheOptions, GatewayCircuitBreakerOptions, GatewayMockOptions, GatewayOptions, GatewayRouteOptions, GatewaySensitiveFieldRule } from './gateway.options';
import { ServiceEndpoint } from '@tsdi/discovery';

interface CacheEntry {
    expireAt: number;
    value: any;
}

interface CircuitState {
    failures: number;
    openedAt?: number;
}

@Injectable()
export class GatewayRuntime {
    private cache = new Map<string, CacheEntry>();
    private circuits = new Map<string, CircuitState>();
    private rounds = new Map<string, number>();
    private dynamicOptions: Partial<GatewayOptions> = {};
    private evictedEndpoints = new Map<string, number>();
    private nonces = new Map<string, number>();

    getCached(key: string): any | undefined {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        if (entry.expireAt <= Date.now()) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.value;
    }

    setCached(key: string, value: any, ttl: number): void {
        this.cache.set(key, {
            value,
            expireAt: Date.now() + ttl
        });
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

    getOption<K extends keyof GatewayOptions>(key: K, fallback: GatewayOptions[K]): GatewayOptions[K] {
        const value = this.dynamicOptions[key];
        return (value === undefined ? fallback : value) as GatewayOptions[K];
    }

    canPassCircuit(routeKey: string, options?: GatewayCircuitBreakerOptions | false): boolean {
        if (!options) {
            return true;
        }
        const state = this.circuits.get(routeKey);
        if (!state?.openedAt) {
            return true;
        }
        const resetTimeout = options.resetTimeout ?? 30_000;
        if (Date.now() - state.openedAt >= resetTimeout) {
            this.circuits.set(routeKey, { failures: 0 });
            return true;
        }
        return false;
    }

    recordFailure(routeKey: string, options?: GatewayCircuitBreakerOptions | false): void {
        if (!options) {
            return;
        }
        const threshold = options.failureThreshold ?? 5;
        const current = this.circuits.get(routeKey) ?? { failures: 0 };
        current.failures += 1;
        if (current.failures >= threshold) {
            current.openedAt = Date.now();
        }
        this.circuits.set(routeKey, current);
    }

    recordSuccess(routeKey: string): void {
        this.circuits.set(routeKey, { failures: 0 });
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

    rememberNonce(key: string, ttl: number): boolean {
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
