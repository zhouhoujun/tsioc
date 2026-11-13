import { Inject, Injectable, OnDestroy, Optional, token } from '@tsdi/ioc';
import { ServiceEndpoint, ServiceInfo, ServiceQuery, ServiceWatchCallback, ServiceDiscoveryOptions } from './discovery';
import { ServiceDiscovery } from './registry';

export interface ConsulDiscoveryOptions extends ServiceDiscoveryOptions {
    /** Consul HTTP API base URL. Default `http://127.0.0.1:8500`. */
    url?: string;
    /** ACL token sent as `X-Consul-Token`. */
    token?: string;
    /** optional datacenter query parameter. */
    datacenter?: string;
    /** health check interval registered with Consul. Default `10s`. */
    checkInterval?: string;
    /** deregister critical services after this duration. Default `60s`. */
    deregisterAfter?: string;
    /** polling interval used by `watch`. Default 5s. */
    watchInterval?: number;
    /** injectable fetch implementation (tests/custom agents). */
    fetchImpl?: typeof fetch;
}

export const CONSUL_OPTIONS = token<ConsulDiscoveryOptions>('CONSUL_OPTIONS');

interface ConsulHealthEntry {
    Node?: { Address?: string };
    Service?: {
        ID?: string;
        Service?: string;
        Address?: string;
        Port?: number;
        Tags?: string[];
        Meta?: Record<string, string>;
        Weights?: { Passing?: number; Warning?: number };
    };
    Checks?: Array<{ Status?: string }>;
}

/**
 * Consul HTTP API implementation of `ServiceDiscovery`.
 *
 * Uses the agent API for registration/deregistration and the health API for
 * discovery. Watch support is implemented with short polling so it works with
 * both agent and catalog endpoints and does not need a long-lived blocking
 * request.
 */
@Injectable()
export class ConsulServiceDiscovery extends ServiceDiscovery implements OnDestroy {
    private readonly watchTimers = new Map<string, ReturnType<typeof setInterval>>();
    private readonly watchCallbacks = new Map<string, Set<ServiceWatchCallback>>();
    private readonly watchSnapshots = new Map<string, string>();

    constructor(
        @Optional() @Inject(CONSUL_OPTIONS) private readonly options: ConsulDiscoveryOptions = {}
    ) {
        super();
    }

    async register(info: ServiceInfo): Promise<ServiceEndpoint> {
        const id = info.id ?? `${info.name}-${info.address}-${info.port ?? 0}`;
        const body: Record<string, any> = {
            ID: id,
            Name: info.name,
            Address: splitAddress(info.address).host,
            Port: info.port ?? splitAddress(info.address).port,
            Tags: info.tags ?? [],
            Meta: {
                ...(info.metadata ?? {}),
                protocol: info.protocol ?? info.metadata?.protocol ?? 'http',
                version: info.version ?? ''
            }
        };
        if (info.healthCheckPath) {
            const base = /^https?:\/\//i.test(info.address)
                ? info.address
                : `${info.protocol ?? 'http'}://${info.address}`;
            body.Check = {
                HTTP: `${base.replace(/\/$/, '')}${info.healthCheckPath}`,
                Interval: this.options.checkInterval ?? '10s',
                DeregisterCriticalServiceAfter: this.options.deregisterAfter ?? '60s'
            };
        } else if (info.ttl) {
            body.Check = {
                TTL: `${Math.max(1, Math.ceil(info.ttl / 1000))}s`,
                DeregisterCriticalServiceAfter: this.options.deregisterAfter ?? '60s'
            };
        }
        await this.request('/v1/agent/service/register', { method: 'PUT', body: JSON.stringify(body) });
        return {
            id,
            name: info.name,
            address: info.address,
            protocol: info.protocol,
            port: info.port,
            metadata: info.metadata,
            tags: info.tags,
            status: 'UP',
            updatedAt: Date.now(),
            registeredAt: Date.now(),
            version: info.version,
            healthCheckPath: info.healthCheckPath,
            healthCheckInterval: info.healthCheckInterval,
            ttl: info.ttl,
            weight: info.weight ?? 1
        };
    }

    async deregister(id: string): Promise<void> {
        await this.request(`/v1/agent/service/deregister/${encodeURIComponent(id)}`, { method: 'PUT' });
    }

    async discover(name: string): Promise<ServiceEndpoint[]> {
        const entries = await this.request<ConsulHealthEntry[]>(
            `/v1/health/service/${encodeURIComponent(name)}?passing=true`
        );
        return (entries ?? []).map(entry => this.toEndpoint(name, entry));
    }

    async query(query: ServiceQuery): Promise<ServiceEndpoint[]> {
        const endpoints = query.name ? await this.discover(query.name) : await this.discoverAll();
        return endpoints.filter(endpoint => {
            if (query.protocol && endpoint.protocol !== query.protocol) {
                return false;
            }
            if (query.status && endpoint.status !== query.status) {
                return false;
            }
            if (query.tags?.length && !query.tags.every(tag => endpoint.tags?.includes(tag))) {
                return false;
            }
            if (query.metadata && !Object.entries(query.metadata).every(([key, value]) => endpoint.metadata?.[key] === value)) {
                return false;
            }
            return true;
        });
    }

    async discoverOne(name: string): Promise<ServiceEndpoint | null> {
        const endpoints = await this.discover(name);
        return endpoints[0] ?? null;
    }

    async getServices(): Promise<ServiceInfo[]> {
        const services = await this.request<Record<string, any>>('/v1/agent/services');
        return Object.values(services ?? {}).map(item => ({
            id: item.ID,
            name: item.Service,
            address: `${item.Address || '127.0.0.1'}:${item.Port}`,
            protocol: item.Meta?.protocol ?? 'http',
            port: item.Port,
            metadata: item.Meta,
            tags: item.Tags,
            version: item.Meta?.version
        }));
    }

    async watch(name: string, callback: ServiceWatchCallback): Promise<void> {
        if (!this.watchCallbacks.has(name)) {
            this.watchCallbacks.set(name, new Set());
        }
        this.watchCallbacks.get(name)!.add(callback);
        callback(await this.discover(name).catch(() => []));

        if (this.watchTimers.has(name)) {
            return;
        }
        const interval = this.options.watchInterval ?? 5_000;
        const timer = setInterval(() => {
            void this.poll(name);
        }, interval);
        (timer as any)?.unref?.();
        this.watchTimers.set(name, timer);
    }

    async unwatch(name: string, callback: ServiceWatchCallback): Promise<void> {
        const callbacks = this.watchCallbacks.get(name);
        callbacks?.delete(callback);
        if (!callbacks?.size) {
            const timer = this.watchTimers.get(name);
            if (timer) {
                clearInterval(timer);
            }
            this.watchTimers.delete(name);
            this.watchCallbacks.delete(name);
            this.watchSnapshots.delete(name);
        }
    }

    async healthCheck(endpoint: ServiceEndpoint): Promise<boolean> {
        const endpoints = await this.discover(endpoint.name);
        const current = endpoints.find(item => item.id === endpoint.id);
        return !!current && current.status !== 'DOWN';
    }

    async update(_id: string, _patch: Partial<ServiceEndpoint>): Promise<ServiceEndpoint | null> {
        // Consul agent API has no partial update; callers should re-register.
        return null;
    }

    async shutdown(): Promise<void> {
        for (const timer of this.watchTimers.values()) {
            clearInterval(timer);
        }
        this.watchTimers.clear();
        this.watchCallbacks.clear();
        this.watchSnapshots.clear();
    }

    onDestroy(): void {
        void this.shutdown();
    }

    private async discoverAll(): Promise<ServiceEndpoint[]> {
        const services = await this.getServices();
        const names = Array.from(new Set(services.map(service => service.name).filter(Boolean)));
        const batches = await Promise.all(names.map(name => this.discover(name as string).catch(() => [])));
        return batches.flat();
    }

    private async poll(name: string): Promise<void> {
        try {
            const endpoints = await this.discover(name);
            const snapshot = JSON.stringify(endpoints);
            if (snapshot === this.watchSnapshots.get(name)) {
                return;
            }
            this.watchSnapshots.set(name, snapshot);
            this.watchCallbacks.get(name)?.forEach(callback => callback(endpoints));
        } catch {
            // Keep the last snapshot; the next tick retries.
        }
    }

    private toEndpoint(name: string, entry: ConsulHealthEntry): ServiceEndpoint {
        const service = entry.Service ?? {};
        const address = service.Address || entry.Node?.Address || '127.0.0.1';
        const port = service.Port;
        const passing = (entry.Checks ?? []).every(check => check.Status === 'passing');
        return {
            id: service.ID ?? `${name}-${address}-${port ?? 0}`,
            name: service.Service ?? name,
            address: port ? `${address}:${port}` : address,
            protocol: service.Meta?.protocol ?? 'http',
            port,
            metadata: service.Meta,
            tags: service.Tags,
            status: passing ? 'UP' : 'DOWN',
            updatedAt: Date.now(),
            version: service.Meta?.version || undefined,
            weight: service.Weights?.Passing ?? service.Weights?.Warning ?? 1
        };
    }

    private async request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
        const fetchImpl = this.options.fetchImpl ?? fetch;
        const url = `${this.baseUrl()}${path}${this.datacenterQuery(path)}`;
        const headers: Record<string, string> = {
            accept: 'application/json',
            ...(init.body ? { 'content-type': 'application/json' } : {}),
            ...(this.options.token ? { 'x-consul-token': this.options.token } : {})
        };
        const response = await fetchImpl(url, { ...init, headers: { ...headers, ...(init.headers as any) } });
        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`Consul request failed: ${response.status} ${response.statusText} ${body}`.trim());
        }
        if (response.status === 204) {
            return undefined as T;
        }
        const text = await response.text();
        return text ? JSON.parse(text) : undefined as T;
    }

    private baseUrl(): string {
        return (this.options.url ?? 'http://127.0.0.1:8500').replace(/\/$/, '');
    }

    private datacenterQuery(path: string): string {
        if (!this.options.datacenter) {
            return '';
        }
        return `${path.includes('?') ? '&' : '?'}dc=${encodeURIComponent(this.options.datacenter)}`;
    }
}

function splitAddress(address: string): { host: string; port?: number } {
    if (/^https?:\/\//i.test(address ?? '')) {
        try {
            const url = new URL(address);
            return { host: url.hostname, port: url.port ? Number(url.port) : undefined };
        } catch {
            // fall through
        }
    }
    const match = /^(.*):(\d+)$/.exec(address ?? '');
    return match ? { host: match[1], port: Number(match[2]) } : { host: address };
}

/**
 * Providers for using Consul as the registry.
 */
export function useConsulDiscovery(options: ConsulDiscoveryOptions = {}) {
    return [
        { provide: CONSUL_OPTIONS, useValue: options },
        ConsulServiceDiscovery,
        { provide: ServiceDiscovery, useExisting: ConsulServiceDiscovery }
    ];
}
