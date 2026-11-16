import { Injectable, OnDestroy } from '@tsdi/ioc';
import { ServiceEndpoint, EndpointSelectorOptions } from './discovery';
import { EndpointSelector } from './registry';
export { EndpointSelector } from './registry';

/**
 * Endpoint selection strategies shared by discovery selectors, clients and the
 * gateway.
 */
export type EndpointSelectionStrategy =
    | 'random'
    | 'round-robin'
    | 'weighted'
    | 'weighted-round-robin'
    | 'least-connections'
    | 'consistent-hash';

export interface EndpointSelectOptions {
    /**
     * selection strategy. default `round-robin`.
     */
    strategy?: EndpointSelectionStrategy;
    /**
     * state key for round-robin/weighted cursors. default: endpoint service name.
     */
    key?: string;
    /**
     * key used by `consistent-hash`.
     */
    hashKey?: string;
    /**
     * endpoint weight. default `endpoint.weight ?? 1`.
     */
    weightOf?: (endpoint: ServiceEndpoint) => number;
    /**
     * current active request count, used by `least-connections`.
     */
    activeOf?: (endpoint: ServiceEndpoint) => number;
    /**
     * external round-robin cursor (e.g. runtime-managed). default: internal
     * per-service cursor.
     */
    nextIndex?: (key: string, size: number) => number;
}

/**
 * Single implementation of endpoint selection.
 *
 * Discovery DI selectors, `@tsdi/client` load balancing and the gateway all
 * delegate here so round-robin cursors, weighted scheduling, least-connections
 * and consistent hashing behave identically everywhere.
 */
export class EndpointSelection {
    private readonly cursors = new Map<string, number>();
    private readonly weighted = new Map<string, number[]>();

    select(endpoints: ServiceEndpoint[], options: EndpointSelectOptions = {}): ServiceEndpoint | null {
        if (!endpoints?.length) {
            return null;
        }
        const strategy = options.strategy ?? 'round-robin';
        const key = options.key ?? endpoints[0]?.name ?? '';
        switch (strategy) {
            case 'random':
                return endpoints[Math.floor(Math.random() * endpoints.length)];
            case 'weighted':
            case 'weighted-round-robin':
                return this.selectWeighted(endpoints, key, options);
            case 'least-connections':
                return this.selectLeastConnections(endpoints, options);
            case 'consistent-hash':
                return endpoints[this.hashToIndex(options.hashKey ?? key, endpoints.length)];
            default: {
                const size = endpoints.length;
                const index = options.nextIndex
                    ? options.nextIndex(key, size)
                    : this.nextIndex(key, size);
                return endpoints[((index % size) + size) % size];
            }
        }
    }

    /**
     * Reset all cursors (shutdown/scope teardown).
     */
    clear(): void {
        this.cursors.clear();
        this.weighted.clear();
    }

    private nextIndex(key: string, size: number): number {
        if (size <= 0) {
            return 0;
        }
        const current = this.cursors.get(key) ?? 0;
        this.cursors.set(key, current + 1);
        return current % size;
    }

    private selectWeighted(endpoints: ServiceEndpoint[], key: string, options: EndpointSelectOptions): ServiceEndpoint {
        let current = this.weighted.get(key);
        if (!current || current.length !== endpoints.length) {
            current = endpoints.map(() => 0);
            this.weighted.set(key, current);
        }
        const weights = endpoints.map(endpoint => this.weightOf(endpoint, options));
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        if (total <= 0) {
            return endpoints[0];
        }
        let best = 0;
        for (let i = 0; i < endpoints.length; i++) {
            current[i] += weights[i];
            if (current[i] > current[best]) {
                best = i;
            }
        }
        current[best] -= total;
        return endpoints[best];
    }

    private selectLeastConnections(endpoints: ServiceEndpoint[], options: EndpointSelectOptions): ServiceEndpoint {
        let best = endpoints[0];
        let bestActive = this.activeOf(best, options);
        let bestWeight = this.weightOf(best, options);
        for (let i = 1; i < endpoints.length; i++) {
            const endpoint = endpoints[i];
            const active = this.activeOf(endpoint, options);
            const weight = this.weightOf(endpoint, options);
            if (active < bestActive || (active === bestActive && weight > bestWeight)) {
                best = endpoint;
                bestActive = active;
                bestWeight = weight;
            }
        }
        return best;
    }

    private weightOf(endpoint: ServiceEndpoint, options: EndpointSelectOptions): number {
        const weight = options.weightOf ? options.weightOf(endpoint) : (endpoint.weight ?? 1);
        return Number.isFinite(weight) && weight > 0 ? weight : 1;
    }

    private activeOf(endpoint: ServiceEndpoint, options: EndpointSelectOptions): number {
        const active = options.activeOf ? options.activeOf(endpoint) : 0;
        return Number.isFinite(active) ? active : 0;
    }

    private hashToIndex(value: string, size: number): number {
        let hash = 0;
        for (let i = 0; i < value.length; i++) {
            hash = ((hash << 5) - hash) + value.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash) % Math.max(size, 1);
    }
}

/**
 * Random endpoint selector.
 */
@Injectable()
export class RandomEndpointSelector extends EndpointSelector {
    private readonly selection = new EndpointSelection();

    select(endpoints: ServiceEndpoint[]): ServiceEndpoint | null {
        return this.selection.select(endpoints, { strategy: 'random' });
    }
}

/**
 * Round-robin endpoint selector.
 */
@Injectable()
export class RoundRobinEndpointSelector extends EndpointSelector implements OnDestroy {
    private readonly selection = new EndpointSelection();

    select(endpoints: ServiceEndpoint[]): ServiceEndpoint | null {
        // The shared selection keeps an independent cursor per service so one
        // busy service cannot skew the distribution of another.
        return this.selection.select(endpoints, { strategy: 'round-robin' });
    }

    onDestroy(): void {
        this.selection.clear();
    }
}

/**
 * Weighted endpoint selector.
 */
@Injectable()
export class WeightedEndpointSelector extends EndpointSelector {
    private weights: Record<string, number> = {};
    private readonly selection = new EndpointSelection();

    constructor(options?: EndpointSelectorOptions) {
        super();
        if (options?.weights) {
            this.weights = options.weights;
        }
    }

    setWeights(weights: Record<string, number>): void {
        this.weights = weights;
    }

    select(endpoints: ServiceEndpoint[]): ServiceEndpoint | null {
        return this.selection.select(endpoints, {
            strategy: 'weighted',
            weightOf: endpoint => this.weights[endpoint.id] ?? endpoint.weight ?? 1
        });
    }
}

/**
 * Least connections endpoint selector (simulated).
 */
@Injectable()
export class LeastConnectionsEndpointSelector extends EndpointSelector {
    private connections: Record<string, number> = {};
    private readonly selection = new EndpointSelection();

    select(endpoints: ServiceEndpoint[]): ServiceEndpoint | null {
        const endpoint = this.selection.select(endpoints, {
            strategy: 'least-connections',
            activeOf: ep => this.connections[ep.id] ?? 0,
            weightOf: ep => ep.weight ?? 1
        });
        // Increment connection count for selected endpoint
        if (endpoint) {
            this.connections[endpoint.id] = (this.connections[endpoint.id] ?? 0) + 1;
        }
        return endpoint;
    }

    release(endpoint: ServiceEndpoint): void {
        const current = this.connections[endpoint.id] ?? 0;
        if (current > 0) {
            this.connections[endpoint.id] = current - 1;
        }
    }
}
