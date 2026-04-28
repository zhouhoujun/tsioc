import { Injectable, OnDestroy } from '@tsdi/ioc';
import { ServiceEndpoint, ServiceInfo, ServiceWatchCallback, ServiceDiscoveryOptions } from './discovery';
import { ServiceDiscovery } from './registry';

/**
 * In-memory service discovery implementation.
 * 用于测试和单机环境的内存实现。
 */
@Injectable()
export class InMemoryServiceDiscovery extends ServiceDiscovery implements OnDestroy {
    private services: Map<string, ServiceEndpoint> = new Map();
    private watchers: Map<string, Set<ServiceWatchCallback>> = new Map();
    private heartbeatTimer?: ReturnType<typeof setInterval>;

    constructor(options?: ServiceDiscoveryOptions) {
        super();
        if (options?.heartbeatInterval) {
            this.heartbeatTimer = setInterval(() => this.heartbeat(), options.heartbeatInterval * 1000);
        }
    }

    async register(info: ServiceInfo): Promise<ServiceEndpoint> {
        const endpoint: ServiceEndpoint = {
            id: info.id ?? this.generateId(),
            name: info.name,
            address: info.address,
            protocol: info.protocol,
            port: info.port,
            metadata: info.metadata,
            status: 'UP',
            updatedAt: Date.now()
        };

        this.services.set(endpoint.id, endpoint);
        this.notifyWatchers(info.name);
        return endpoint;
    }

    async deregister(id: string): Promise<void> {
        const endpoint = this.services.get(id);
        if (endpoint) {
            this.services.delete(id);
            this.notifyWatchers(endpoint.name);
        }
    }

    async discover(name: string): Promise<ServiceEndpoint[]> {
        const endpoints: ServiceEndpoint[] = [];
        for (const endpoint of this.services.values()) {
            if (endpoint.name === name && endpoint.status === 'UP') {
                endpoints.push(endpoint);
            }
        }
        return endpoints;
    }

    async discoverOne(name: string): Promise<ServiceEndpoint | null> {
        const endpoints = await this.discover(name);
        return endpoints.length > 0 ? endpoints[0] : null;
    }

    async getServices(): Promise<ServiceInfo[]> {
        return Array.from(this.services.values()).map(ep => ({
            name: ep.name,
            id: ep.id,
            address: ep.address,
            protocol: ep.protocol,
            port: ep.port,
            metadata: ep.metadata
        }));
    }

    async watch(name: string, callback: ServiceWatchCallback): Promise<void> {
        if (!this.watchers.has(name)) {
            this.watchers.set(name, new Set());
        }
        this.watchers.get(name)!.add(callback);

        // Immediately notify with current state
        const endpoints = await this.discover(name);
        callback(endpoints);
    }

    async unwatch(name: string, callback: ServiceWatchCallback): Promise<void> {
        const watchers = this.watchers.get(name);
        if (watchers) {
            watchers.delete(callback);
        }
    }

    async healthCheck(endpoint: ServiceEndpoint): Promise<boolean> {
        const stored = this.services.get(endpoint.id);
        if (stored) {
            stored.status = 'UP';
            stored.updatedAt = Date.now();
            return true;
        }
        return false;
    }

    async shutdown(): Promise<void> {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        this.services.clear();
        this.watchers.clear();
    }

    onDestroy(): void {
        this.shutdown();
    }

    private heartbeat(): void {
        const now = Date.now();
        for (const endpoint of this.services.values()) {
            endpoint.updatedAt = now;
        }
    }

    private notifyWatchers(name: string): void {
        const watchers = this.watchers.get(name);
        if (watchers) {
            const endpoints = Array.from(this.services.values())
                .filter(ep => ep.name === name && ep.status === 'UP');
            for (const callback of watchers) {
                callback(endpoints);
            }
        }
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }
}