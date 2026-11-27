import { Inject, Injectable, OnDestroy, Optional, token } from '@tsdi/ioc';
import { ServiceEndpoint, ServiceInfo, ServiceQuery, ServiceWatchCallback, ServiceDiscoveryOptions } from './discovery';
import { ServiceDiscovery } from './registry';

export interface EtcdDiscoveryOptions extends ServiceDiscoveryOptions {
    /** etcd v3 JSON gateway base URL. Default `http://127.0.0.1:2379`. */
    url?: string;
    /** service key prefix. Default `/tsdi/services`. */
    prefix?: string;
    /** lease TTL in seconds. Default 30. `0` disables leases. */
    ttlSeconds?: number;
    /** polling interval used by `watch`. Default 5s. */
    watchInterval?: number;
    /** basic auth username for the JSON gateway. */
    username?: string;
    /** basic auth password for the JSON gateway. */
    password?: string;
    /** injectable fetch implementation (tests/custom agents). */
    fetchImpl?: typeof fetch;
}

export const ETCD_OPTIONS = token<EtcdDiscoveryOptions>('ETCD_OPTIONS');

interface EtcdKeyValue {
    key?: string;
    value?: string;
    lease?: string;
}

interface EtcdRegistration {
    endpoint: ServiceEndpoint;
    key: string;
    lease?: string;
    timer?: ReturnType<typeof setInterval>;
}

const b64 = (value: string | Buffer) => Buffer.from(value).toString('base64');
const unb64 = (value: string) => Buffer.from(value, 'base64').toString('utf-8');

/** Prefix range end used by etcd's range API. */
function rangeEnd(prefix: string): string {
    const bytes = Buffer.from(prefix);
    for (let index = bytes.length - 1; index >= 0; index--) {
        if (bytes[index] < 0xff) {
            bytes[index] += 1;
            return bytes.subarray(0, index + 1).toString('base64');
        }
    }
    return Buffer.from([0]).toString('base64');
}

/**
 * etcd v3 discovery through the HTTP JSON gateway (no grpc dependency).
 *
 * Registrations use leases and are refreshed at half the TTL; discovery scans
 * the service key prefix. Watch is short polling so it works behind proxies.
 */
@Injectable()
export class EtcdServiceDiscovery extends ServiceDiscovery implements OnDestroy {
    private readonly registrations = new Map<string, EtcdRegistration>();
    private readonly watchTimers = new Map<string, ReturnType<typeof setInterval>>();
    private readonly watchCallbacks = new Map<string, Set<ServiceWatchCallback>>();
    private readonly watchSnapshots = new Map<string, string>();

    constructor(
        @Optional() @Inject(ETCD_OPTIONS) private readonly options: EtcdDiscoveryOptions = {}
    ) {
        super();
    }

    async register(info: ServiceInfo): Promise<ServiceEndpoint> {
        const id = info.id ?? `${info.name}-${info.address}-${info.port ?? 0}`;
        const endpoint: ServiceEndpoint = {
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
        const key = this.keyFor(info.name, id);
        const lease = await this.grantLease();
        await this.put(key, endpoint, lease);
        const existing = this.registrations.get(id);
        if (existing?.timer) {
            clearInterval(existing.timer);
        }
        const registration: EtcdRegistration = { endpoint, key, lease };
        const ttl = this.ttlMs();
        if (lease && ttl > 0) {
            const timer = setInterval(() => {
                void this.refresh(id);
            }, Math.max(1_000, Math.floor(ttl / 2)));
            (timer as any)?.unref?.();
            registration.timer = timer;
        }
        this.registrations.set(id, registration);
        return endpoint;
    }

    async deregister(id: string): Promise<void> {
        const registration = this.registrations.get(id);
        const key = registration?.key ?? null;
        if (key) {
            await this.request('/v3/kv/deleterange', { key: b64(key) });
        }
        if (registration?.lease) {
            await this.request('/v3/lease/revoke', { ID: registration.lease }).catch(() => undefined);
        }
        if (registration?.timer) {
            clearInterval(registration.timer);
        }
        this.registrations.delete(id);
    }

    async discover(name: string): Promise<ServiceEndpoint[]> {
        return this.range(`${this.prefix()}/${name}/`);
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
        return (await this.discover(name))[0] ?? null;
    }

    async getServices(): Promise<ServiceInfo[]> {
        const endpoints = await this.discoverAll();
        return endpoints.map(endpoint => ({
            id: endpoint.id,
            name: endpoint.name,
            address: endpoint.address,
            protocol: endpoint.protocol,
            port: endpoint.port,
            metadata: endpoint.metadata,
            tags: endpoint.tags,
            version: endpoint.version
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
        const timer = setInterval(() => {
            void this.poll(name);
        }, this.options.watchInterval ?? 5_000);
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

    async update(id: string, patch: Partial<ServiceEndpoint>): Promise<ServiceEndpoint | null> {
        const registration = this.registrations.get(id);
        if (!registration) {
            return null;
        }
        registration.endpoint = { ...registration.endpoint, ...patch, updatedAt: Date.now() };
        await this.put(registration.key, registration.endpoint, registration.lease);
        return registration.endpoint;
    }

    async shutdown(): Promise<void> {
        for (const registration of this.registrations.values()) {
            if (registration.timer) {
                clearInterval(registration.timer);
            }
        }
        this.registrations.clear();
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

    private prefix(): string {
        return (this.options.prefix ?? '/tsdi/services').replace(/\/+$/, '');
    }

    private keyFor(name: string, id: string): string {
        return `${this.prefix()}/${name}/${id}`;
    }

    private ttlMs(): number {
        return Math.max(0, this.options.ttlSeconds ?? 30) * 1000;
    }

    private async grantLease(): Promise<string | undefined> {
        const ttl = this.options.ttlSeconds ?? 30;
        if (ttl <= 0) {
            return undefined;
        }
        const response = await this.request<{ ID?: string | number }>('/v3/lease/grant', { TTL: ttl });
        return response?.ID == null ? undefined : String(response.ID);
    }

    private async put(key: string, endpoint: ServiceEndpoint, lease?: string): Promise<void> {
        await this.request('/v3/kv/put', {
            key: b64(key),
            value: b64(JSON.stringify(endpoint)),
            ...(lease ? { lease } : {})
        });
    }

    private async refresh(id: string): Promise<void> {
        const registration = this.registrations.get(id);
        if (!registration) {
            return;
        }
        try {
            const lease = await this.grantLease();
            await this.put(registration.key, registration.endpoint, lease);
            if (registration.lease) {
                await this.request('/v3/lease/revoke', { ID: registration.lease }).catch(() => undefined);
            }
            registration.lease = lease;
        } catch {
            // The old lease may expire; the next tick retries.
        }
    }

    private async discoverAll(): Promise<ServiceEndpoint[]> {
        return this.range(`${this.prefix()}/`);
    }

    private async range(prefix: string): Promise<ServiceEndpoint[]> {
        const response = await this.request<{ kvs?: EtcdKeyValue[] }>('/v3/kv/range', {
            key: b64(prefix),
            range_end: rangeEnd(prefix)
        });
        return (response?.kvs ?? []).flatMap(item => {
            try {
                const endpoint = JSON.parse(unb64(item.value ?? '')) as ServiceEndpoint;
                return endpoint && endpoint.name ? [{ ...endpoint, status: endpoint.status ?? 'UP' }] : [];
            } catch {
                return [];
            }
        });
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
            // Keep the previous snapshot; retry on the next tick.
        }
    }

    private async request<T = any>(path: string, body: any): Promise<T> {
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        if (this.options.username) {
            const token = Buffer.from(`${this.options.username}:${this.options.password ?? ''}`).toString('base64');
            headers.authorization = `Basic ${token}`;
        }
        const response = await (this.options.fetchImpl ?? fetch)(
            `${(this.options.url ?? 'http://127.0.0.1:2379').replace(/\/+$/, '')}${path}`,
            { method: 'POST', headers, body: JSON.stringify(body) }
        );
        if (!response.ok) {
            throw new Error(`etcd request failed: ${path} HTTP ${response.status}`);
        }
        return await response.json() as T;
    }
}
