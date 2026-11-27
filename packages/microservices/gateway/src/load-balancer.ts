import { EndpointSelection, EndpointSelectionStrategy, ServiceEndpoint } from '@tsdi/discovery';
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
 * Delegates to the shared `EndpointSelection` implementation so gateway
 * behavior matches discovery selectors and `@tsdi/client`. Round-robin cursors
 * stay in the gateway runtime, active requests in the runtime's endpoint
 * counters.
 */
export class GatewayLoadBalancer {
    private readonly selection = new EndpointSelection();

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
        const key = `${route.service}:${route.path}`;
        const strategy = (route.loadBalance?.strategy ?? 'round-robin') as EndpointSelectionStrategy;
        return this.selection.select(endpoints, {
            strategy,
            key,
            hashKey: hashKey || route.path,
            weightOf: endpoint => Math.max(endpoint.weight ?? route.weight ?? 1, 0),
            activeOf: endpoint => this.runtime.getEndpointActiveRequests(endpoint.id),
            nextIndex: (stateKey, size) => this.runtime.nextRoundIndex(stateKey, size),
            zone: route.loadBalance?.zone,
            zoneFallback: route.loadBalance?.zoneFallback
        });
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
}
