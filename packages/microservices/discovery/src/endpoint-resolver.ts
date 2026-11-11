import { Inject, Injectable, OnDestroy } from '@tsdi/ioc';
import { ServiceDiscovery } from './registry';
import { ServiceDiscoveryOptions, ServiceEndpoint, ServiceWatchCallback } from './discovery';
import { DISCOVERY_OPTIONS } from './tokens';

export interface EndpointResolveOptions {
    /** required protocol(s). */
    protocol?: string | string[];
    /** required version. */
    version?: string;
    /** required tags (all must match). */
    tags?: string[];
    /** required metadata (all keys must match). */
    metadata?: Record<string, any>;
    /** required status. default excludes DOWN. */
    status?: 'UP' | 'DOWN' | 'UNKNOWN';
    /** cache ttl in milliseconds for this lookup. */
    ttl?: number;
    /** bypass the cache. */
    force?: boolean;
}

interface EndpointCacheEntry {
    expireAt: number;
    endpoints: ServiceEndpoint[];
}

/**
 * Resolve service endpoints with protocol/version/tag filtering and a short
 * local cache. Gateway and clients should depend on this abstraction instead
 * of a concrete registry implementation.
 */
export abstract class EndpointResolver {
    abstract resolve(service: string, options?: EndpointResolveOptions): Promise<ServiceEndpoint[]>;
    abstract invalidate(service?: string): void;
}

@Injectable()
export class DefaultEndpointResolver extends EndpointResolver implements OnDestroy {
    private readonly cache = new Map<string, EndpointCacheEntry>();
    private readonly pending = new Map<string, Promise<ServiceEndpoint[]>>();
    private readonly watchers = new Map<string, ServiceWatchCallback>();

    constructor(
        @Inject(ServiceDiscovery, { nullable: true }) private readonly discovery: ServiceDiscovery | null,
        @Inject(DISCOVERY_OPTIONS, { nullable: true }) private readonly options?: ServiceDiscoveryOptions
    ) {
        super();
    }

    async resolve(service: string, options: EndpointResolveOptions = {}): Promise<ServiceEndpoint[]> {
        if (!this.discovery) {
            return [];
        }
        this.ensureWatch(service);
        const key = this.cacheKey(service, options);
        const now = Date.now();
        if (!options.force) {
            const cached = this.cache.get(key);
            if (cached && cached.expireAt > now) {
                return cached.endpoints.slice();
            }
        }
        let request = this.pending.get(key);
        if (!request) {
            request = this.discovery.discover(service)
                .then(endpoints => this.filter(endpoints, options))
                .then(endpoints => {
                    const ttl = this.resolveTtl(options);
                    if (ttl > 0) {
                        this.cache.set(key, {
                            endpoints,
                            expireAt: Date.now() + ttl
                        });
                    }
                    return endpoints;
                })
                .finally(() => this.pending.delete(key));
            this.pending.set(key, request);
        }
        return (await request).slice();
    }

    invalidate(service?: string): void {
        if (!service) {
            this.cache.clear();
            return;
        }
        const prefix = `${service}|`;
        for (const key of Array.from(this.cache.keys())) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }

    onDestroy(): void {
        for (const [service, callback] of this.watchers) {
            try {
                void this.discovery?.unwatch(service, callback);
            } catch {
                // best effort
            }
        }
        this.watchers.clear();
        this.cache.clear();
        this.pending.clear();
    }

    private filter(endpoints: ServiceEndpoint[], options: EndpointResolveOptions): ServiceEndpoint[] {
        const protocols = options.protocol == null
            ? undefined
            : (Array.isArray(options.protocol) ? options.protocol : [options.protocol]);
        return endpoints.filter(endpoint => {
            if (options.status) {
                if ((endpoint.status ?? 'UP') !== options.status) {
                    return false;
                }
            } else if ((endpoint.status ?? 'UP') === 'DOWN') {
                return false;
            }
            if (protocols?.length) {
                const protocol = endpoint.protocol ?? 'http';
                if (!protocols.includes(protocol)) {
                    return false;
                }
            }
            if (options.version && endpoint.version !== options.version) {
                return false;
            }
            if (options.tags?.length && !options.tags.every(tag => endpoint.tags?.includes(tag))) {
                return false;
            }
            if (options.metadata && !Object.entries(options.metadata).every(([key, value]) => endpoint.metadata?.[key] === value)) {
                return false;
            }
            return true;
        });
    }

    private cacheKey(service: string, options: EndpointResolveOptions): string {
        return [
            service,
            options.protocol ?? '',
            options.version ?? '',
            options.status ?? '',
            (options.tags ?? []).slice().sort().join(','),
            JSON.stringify(options.metadata ?? {})
        ].join('|');
    }

    private resolveTtl(options: EndpointResolveOptions): number {
        if (options.ttl != null) {
            return Math.max(options.ttl, 0);
        }
        const configured = this.options?.cacheExpiration;
        return configured != null ? Math.max(configured * 1000, 0) : 1000;
    }

    private ensureWatch(service: string): void {
        if (!this.discovery || this.watchers.has(service)) {
            return;
        }
        const callback: ServiceWatchCallback = () => this.invalidate(service);
        this.watchers.set(service, callback);
        try {
            void this.discovery.watch(service, callback);
        } catch {
            // Registry may not support watch; cache TTL still applies.
        }
    }
}
