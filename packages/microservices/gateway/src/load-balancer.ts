import { ServiceEndpoint } from '@tsdi/discovery';
import { GatewayLoadBalanceOptions, GatewayRouteOptions } from './gateway.options';
import { GatewayRuntime } from './gateway.runtime';

export interface GatewayLoadBalanceRoute extends GatewayRouteOptions {
    service: string;
    path: string;
    loadBalance?: GatewayLoadBalanceOptions;
}

/**
 * Gateway endpoint selection strategies.
 *
 * Keeps the selection state (round-robin cursor, smooth weighted cursor,
 * active requests) in the gateway runtime so multiple routes/services can share
 * health and connection state.
 */
export class GatewayLoadBalancer {
    private readonly weightedState = new Map<string, number[]>();

    constructor(private readonly runtime: GatewayRuntime) {
    }

    select(
        route: GatewayLoadBalanceRoute,
        endpoints: ServiceEndpoint[],
        hashKey?: string
    ): ServiceEndpoint | null {
        if (!endpoints.length) {
            return null;
        }
        const strategy = route.loadBalance?.strategy ?? 'round-robin';
        switch (strategy) {
            case 'random':
                return endpoints[Math.floor(Math.random() * endpoints.length)];
            case 'weighted':
            case 'weighted-round-robin':
                return this.selectWeighted(route, endpoints);
            case 'consistent-hash':
                return endpoints[this.hashToIndex(hashKey || route.path, endpoints.length)];
            case 'least-connections':
                return this.selectLeastConnections(route, endpoints);
            default:
                return endpoints[this.runtime.nextRoundIndex(`${route.service}:${route.path}`, endpoints.length)];
        }
    }

    /**
     * Consistent-hash key from explicit header/query configuration.
     */
    static resolveHashKey(route: GatewayLoadBalanceRoute, request: any, getHeader: (name: string) => string | undefined): string {
        const header = route.loadBalance?.hashHeader;
        if (header) {
            const value = getHeader(header);
            if (value) {
                return value;
            }
        }
        const queryKey = route.loadBalance?.hashQuery;
        const query = request?.query as Record<string, any> | undefined;
        if (queryKey && query?.[queryKey] != null) {
            return String(query[queryKey]);
        }
        return request?.socket?.remoteAddress || request?.url || route.path;
    }

    private selectWeighted(route: GatewayLoadBalanceRoute, endpoints: ServiceEndpoint[]): ServiceEndpoint | null {
        const key = `${route.service}:${route.path}`;
        let current = this.weightedState.get(key);
        if (!current || current.length !== endpoints.length) {
            current = endpoints.map(() => 0);
            this.weightedState.set(key, current);
        }
        const total = endpoints.reduce((sum, endpoint) => sum + this.weightOf(route, endpoint), 0);
        if (total <= 0) {
            return endpoints[0];
        }
        let best = 0;
        for (let i = 0; i < endpoints.length; i++) {
            current[i] += this.weightOf(route, endpoints[i]);
            if (current[i] > current[best]) {
                best = i;
            }
        }
        current[best] -= total;
        return endpoints[best];
    }

    private selectLeastConnections(route: GatewayLoadBalanceRoute, endpoints: ServiceEndpoint[]): ServiceEndpoint | null {
        let best = endpoints[0];
        let bestActive = this.runtime.getEndpointActiveRequests(best.id);
        let bestWeight = this.weightOf(route, best);
        for (let i = 1; i < endpoints.length; i++) {
            const endpoint = endpoints[i];
            const active = this.runtime.getEndpointActiveRequests(endpoint.id);
            const weight = this.weightOf(route, endpoint);
            if (active < bestActive || (active === bestActive && weight > bestWeight)) {
                best = endpoint;
                bestActive = active;
                bestWeight = weight;
            }
        }
        return best;
    }

    private weightOf(route: GatewayLoadBalanceRoute, endpoint: ServiceEndpoint): number {
        return Math.max(endpoint.weight ?? route.weight ?? 1, 0);
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
