import { Injectable, OnDestroy } from '@tsdi/ioc';
import { ServiceEndpoint, EndpointSelectorOptions } from './discovery';
import { EndpointSelector } from './registry';
export { EndpointSelector } from './registry';

/**
 * Random endpoint selector.
 */
@Injectable()
export class RandomEndpointSelector extends EndpointSelector {
    select(endpoints: ServiceEndpoint[]): ServiceEndpoint | null {
        if (endpoints.length === 0) return null;
        const index = Math.floor(Math.random() * endpoints.length);
        return endpoints[index];
    }
}

/**
 * Round-robin endpoint selector.
 */
@Injectable()
export class RoundRobinEndpointSelector extends EndpointSelector implements OnDestroy {
    private currentIndex = 0;

    select(endpoints: ServiceEndpoint[]): ServiceEndpoint | null {
        if (endpoints.length === 0) return null;
        const endpoint = endpoints[this.currentIndex % endpoints.length];
        this.currentIndex++;
        return endpoint;
    }

    onDestroy(): void {
        this.currentIndex = 0;
    }
}

/**
 * Weighted endpoint selector.
 */
@Injectable()
export class WeightedEndpointSelector extends EndpointSelector {
    private weights: Record<string, number> = {};

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
        if (endpoints.length === 0) return null;

        const totalWeight = endpoints.reduce((sum, ep) => sum + (this.weights[ep.id] ?? 1), 0);
        let random = Math.random() * totalWeight;

        for (const endpoint of endpoints) {
            const weight = this.weights[endpoint.id] ?? 1;
            random -= weight;
            if (random <= 0) {
                return endpoint;
            }
        }

        return endpoints[0];
    }
}

/**
 * Least connections endpoint selector (simulated).
 */
@Injectable()
export class LeastConnectionsEndpointSelector extends EndpointSelector {
    private connections: Record<string, number> = {};

    select(endpoints: ServiceEndpoint[]): ServiceEndpoint | null {
        if (endpoints.length === 0) return null;

        // Find endpoint with least connections
        let minConnections = Infinity;
        let selected: ServiceEndpoint | null = null;

        for (const endpoint of endpoints) {
            const connCount = this.connections[endpoint.id] ?? 0;
            if (connCount < minConnections) {
                minConnections = connCount;
                selected = endpoint;
            }
        }

        // Increment connection count for selected endpoint
        if (selected) {
            this.connections[selected.id] = (this.connections[selected.id] ?? 0) + 1;
        }

        return selected;
    }

    release(endpoint: ServiceEndpoint): void {
        const current = this.connections[endpoint.id] ?? 0;
        if (current > 0) {
            this.connections[endpoint.id] = current - 1;
        }
    }
}