import { Inject, Injectable, OnDestroy } from '@tsdi/ioc';
import { ServiceEndpoint, ServiceInfo, ServiceQuery, ServiceWatchCallback, ServiceDiscoveryOptions } from './discovery';
import { ServiceDiscovery } from './registry';
import { DISCOVERY_OPTIONS } from './discovery.module';

/**
 * In-memory service discovery implementation.
 * 用于测试和单机环境的内存实现。
 */
@Injectable()
export class InMemoryServiceDiscovery extends ServiceDiscovery implements OnDestroy {
    private services: Map<string, ServiceEndpoint> = new Map();
    private watchers: Map<string, Set<ServiceWatchCallback>> = new Map();
    private heartbeatTimer?: ReturnType<typeof setInterval>;
    private readonly options?: ServiceDiscoveryOptions;

    constructor(@Inject(DISCOVERY_OPTIONS, { nullable: true }) options?: ServiceDiscoveryOptions) {
        super();
        this.options = options;
        if (options?.heartbeatInterval) {
            this.heartbeatTimer = setInterval(() => this.heartbeat(), options.heartbeatInterval * 1000);
        }
    }

    async register(info: ServiceInfo): Promise<ServiceEndpoint> {
        const now = Date.now();
        const endpoint: ServiceEndpoint = {
            id: info.id ?? this.generateId(),
            name: info.name,
            address: info.address,
            protocol: info.protocol,
            port: info.port,
            metadata: info.metadata,
            tags: info.tags,
            status: 'UP',
            updatedAt: now,
            registeredAt: now,
            version: info.version,
            healthCheckPath: info.healthCheckPath,
            healthCheckInterval: info.healthCheckInterval,
            ttl: info.ttl ?? this.options?.ttl,
            weight: info.weight ?? 1
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
        return this.query({ name, status: 'UP' });
    }

    async query(query: ServiceQuery): Promise<ServiceEndpoint[]> {
        const endpoints: ServiceEndpoint[] = [];
        for (const endpoint of this.services.values()) {
            if (this.isExpired(endpoint)) {
                this.markEndpointDown(endpoint);
                continue;
            }
            if (query.name && endpoint.name !== query.name) {
                continue;
            }
            if (query.protocol && endpoint.protocol !== query.protocol) {
                continue;
            }
            if (query.status && endpoint.status !== query.status) {
                continue;
            }
            if (query.tags?.length && !query.tags.every(tag => endpoint.tags?.includes(tag))) {
                continue;
            }
            if (query.metadata && !this.matchMetadata(endpoint.metadata, query.metadata)) {
                continue;
            }
            endpoints.push({ ...endpoint });
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
            metadata: ep.metadata,
            tags: ep.tags,
            version: ep.version,
            healthCheckPath: ep.healthCheckPath,
            healthCheckInterval: ep.healthCheckInterval,
            ttl: ep.ttl,
            weight: ep.weight
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

    async update(id: string, patch: Partial<ServiceEndpoint>): Promise<ServiceEndpoint | null> {
        const stored = this.services.get(id);
        if (!stored) {
            return null;
        }
        const updated = {
            ...stored,
            ...patch,
            id: stored.id,
            updatedAt: Date.now()
        };
        this.services.set(id, updated);
        this.notifyWatchers(updated.name);
        return { ...updated };
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
            if (this.isExpired(endpoint, now)) {
                this.markEndpointDown(endpoint);
                continue;
            }
            endpoint.updatedAt = now;
        }
    }

    private notifyWatchers(name: string): void {
        const watchers = this.watchers.get(name);
        if (watchers) {
            const endpoints = Array.from(this.services.values())
                .filter(ep => ep.name === name && ep.status === 'UP' && !this.isExpired(ep))
                .map(ep => ({ ...ep }));
            for (const callback of watchers) {
                callback(endpoints);
            }
        }
    }

    private isExpired(endpoint: ServiceEndpoint, now = Date.now()): boolean {
        const ttl = endpoint.ttl ?? this.options?.ttl;
        if (!ttl || ttl <= 0) {
            return false;
        }
        const lastBeat = endpoint.updatedAt ?? endpoint.registeredAt ?? now;
        return now - lastBeat > ttl;
    }

    private markEndpointDown(endpoint: ServiceEndpoint): void {
        if (endpoint.status !== 'DOWN') {
            endpoint.status = 'DOWN';
            endpoint.updatedAt = Date.now();
            this.notifyWatchers(endpoint.name);
        }
    }

    private matchMetadata(source?: Record<string, any>, target?: Record<string, any>): boolean {
        if (!target) {
            return true;
        }
        const metadata = source ?? {};
        return Object.keys(target).every(key => metadata[key] === target[key]);
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }
}
