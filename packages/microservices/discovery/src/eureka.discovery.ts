import { Inject, Injectable, OnDestroy, Optional, token } from '@tsdi/ioc';
import { ServiceEndpoint, ServiceInfo, ServiceQuery, ServiceWatchCallback, ServiceDiscoveryOptions } from './discovery';
import { ServiceDiscovery } from './registry';

export interface EurekaDiscoveryOptions extends ServiceDiscoveryOptions {
    /** Eureka REST base URL. Default `http://127.0.0.1:8761/eureka`. */
    eurekaUrl?: string;
    /** heartbeat interval in milliseconds. Default 30s. */
    heartbeatInterval?: number;
    /** lease renewal interval in seconds (Eureka metadata). Default 30. */
    renewalIntervalInSecs?: number;
    /** lease duration in seconds. Default 90. */
    durationInSecs?: number;
    /** polling interval used by `watch`. Default 5s. */
    watchInterval?: number;
    /** injectable fetch implementation. */
    fetchImpl?: typeof fetch;
}

export const EUREKA_OPTIONS = token<EurekaDiscoveryOptions>('EUREKA_OPTIONS');

interface EurekaInstance {
    instanceId?: string;
    hostName?: string;
    app?: string;
    ipAddr?: string;
    status?: string;
    port?: { $?: number; '@enabled'?: string | boolean } | number;
    securePort?: { $?: number };
    vipAddress?: string;
    metadata?: Record<string, string>;
    dataCenterInfo?: any;
    leaseInfo?: any;
}

/**
 * Netflix Eureka REST implementation of `ServiceDiscovery`.
 */
@Injectable()
export class EurekaServiceDiscovery extends ServiceDiscovery implements OnDestroy {
    private readonly heartbeats = new Map<string, ReturnType<typeof setInterval>>();
    private readonly instances = new Map<string, { app: string; instanceId: string }>();
    private readonly watchTimers = new Map<string, ReturnType<typeof setInterval>>();
    private readonly watchCallbacks = new Map<string, Set<ServiceWatchCallback>>();
    private readonly watchSnapshots = new Map<string, string>();

    constructor(
        @Optional() @Inject(EUREKA_OPTIONS) private readonly options: EurekaDiscoveryOptions = {}
    ) {
        super();
    }

    async register(info: ServiceInfo): Promise<ServiceEndpoint> {
        const app = this.appName(info.name);
        const instanceId = info.id ?? `${info.name}:${info.address}:${info.port ?? 0}`;
        const { host, port } = splitAddress(info.address, info.port);
        const instance: EurekaInstance = {
            instanceId,
            hostName: host,
            app,
            ipAddr: host,
            status: 'UP',
            port: { $: port ?? 0, '@enabled': 'true' },
            securePort: { $: 443 },
            vipAddress: info.name,
            dataCenterInfo: {
                '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
                name: 'MyOwn'
            },
            leaseInfo: {
                renewalIntervalInSecs: this.options.renewalIntervalInSecs ?? 30,
                durationInSecs: this.options.durationInSecs ?? 90
            },
            metadata: {
                ...(info.metadata ?? {}),
                protocol: info.protocol ?? 'http',
                version: info.version ?? '',
                tags: (info.tags ?? []).join(',')
            }
        };
        await this.request(`/apps/${encodeURIComponent(app)}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ instance })
        });
        this.instances.set(instanceId, { app, instanceId });
        this.startHeartbeat(instanceId, app);
        return {
            id: instanceId,
            name: info.name,
            address: port ? `${host}:${port}` : host,
            protocol: info.protocol,
            port,
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
        const entry = this.instances.get(id);
        if (!entry) {
            return;
        }
        this.stopHeartbeat(id);
        await this.request(`/apps/${encodeURIComponent(entry.app)}/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
        this.instances.delete(id);
    }

    async discover(name: string): Promise<ServiceEndpoint[]> {
        const app = this.appName(name);
        const result = await this.request<{ application?: { instance?: EurekaInstance | EurekaInstance[] } }>(
            `/apps/${encodeURIComponent(app)}`,
            { headers: { accept: 'application/json' } }
        );
        const raw = result?.application?.instance;
        const instances = Array.isArray(raw) ? raw : raw ? [raw] : [];
        return instances.map(instance => this.toEndpoint(name, instance));
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
        const result = await this.request<{ applications?: { application?: any | any[] } }>(
            '/apps',
            { headers: { accept: 'application/json' } }
        );
        const raw = result?.applications?.application;
        const applications = Array.isArray(raw) ? raw : raw ? [raw] : [];
        return applications.map(app => {
            const instance = Array.isArray(app.instance) ? app.instance[0] : app.instance;
            const port = portOf(instance?.port);
            return {
                id: app.name,
                name: (app.name ?? '').toLowerCase(),
                address: instance?.ipAddr && port ? `${instance.ipAddr}:${port}` : app.name,
                protocol: instance?.metadata?.protocol ?? 'http',
                port,
                metadata: instance?.metadata,
                tags: splitTags(instance?.metadata?.tags),
                version: instance?.metadata?.version
            } as ServiceInfo;
        });
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
        return endpoints.some(item => item.id === endpoint.id && item.status !== 'DOWN');
    }

    async update(_id: string, _patch: Partial<ServiceEndpoint>): Promise<ServiceEndpoint | null> {
        return null;
    }

    async shutdown(): Promise<void> {
        for (const timer of this.heartbeats.values()) {
            clearInterval(timer);
        }
        this.heartbeats.clear();
        this.instances.clear();
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
        const batches = await Promise.all(services.map(service => this.discover(service.name).catch(() => [])));
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
            // Retry next tick.
        }
    }

    private startHeartbeat(instanceId: string, app: string): void {
        const interval = this.options.heartbeatInterval ?? 30_000;
        const timer = setInterval(() => {
            void this.request(
                `/apps/${encodeURIComponent(app)}/${encodeURIComponent(instanceId)}`,
                { method: 'PUT' }
            ).catch(() => undefined);
        }, interval);
        (timer as any)?.unref?.();
        this.heartbeats.set(instanceId, timer);
    }

    private stopHeartbeat(id: string): void {
        const timer = this.heartbeats.get(id);
        if (timer) {
            clearInterval(timer);
            this.heartbeats.delete(id);
        }
    }

    private toEndpoint(name: string, instance: EurekaInstance): ServiceEndpoint {
        const ip = instance.ipAddr || instance.hostName || '127.0.0.1';
        const port = portOf(instance.port);
        const metadata = instance.metadata ?? {};
        return {
            id: instance.instanceId ?? `${ip}:${port ?? 0}`,
            name,
            address: port ? `${ip}:${port}` : ip,
            protocol: metadata.protocol ?? 'http',
            port,
            metadata,
            tags: splitTags(metadata.tags),
            status: String(instance.status ?? 'UP').toUpperCase() === 'UP' ? 'UP' : 'DOWN',
            updatedAt: Date.now(),
            version: metadata.version || undefined,
            weight: 1
        };
    }

    private async request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
        const fetchImpl = this.options.fetchImpl ?? fetch;
        const response = await fetchImpl(`${this.baseUrl()}${path}`, init);
        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`Eureka request failed: ${response.status} ${response.statusText} ${text}`.trim());
        }
        if (response.status === 204) {
            return undefined as T;
        }
        const text = await response.text();
        return text ? JSON.parse(text) as T : undefined as T;
    }

    private baseUrl(): string {
        return (this.options.eurekaUrl ?? 'http://127.0.0.1:8761/eureka').replace(/\/$/, '');
    }

    private appName(name: string): string {
        return String(name).toUpperCase();
    }
}

function portOf(port: EurekaInstance['port']): number | undefined {
    if (typeof port === 'number') {
        return port;
    }
    return port?.$;
}

function splitTags(tags?: string): string[] | undefined {
    return tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined;
}

function splitAddress(address: string, fallback?: number): { host: string; port?: number } {
    if (/^https?:\/\//i.test(address ?? '')) {
        try {
            const url = new URL(address);
            return { host: url.hostname, port: url.port ? Number(url.port) : fallback };
        } catch {
            // fall through
        }
    }
    const match = /^(.*):(\d+)$/.exec(address ?? '');
    return match ? { host: match[1], port: Number(match[2]) } : { host: address, port: fallback };
}

/**
 * Providers for using Eureka as the registry.
 */
export function useEurekaDiscovery(options: EurekaDiscoveryOptions = {}) {
    return [
        { provide: EUREKA_OPTIONS, useValue: options },
        EurekaServiceDiscovery,
        { provide: ServiceDiscovery, useExisting: EurekaServiceDiscovery }
    ];
}
