import { Inject, Injectable, OnDestroy, Optional, token } from '@tsdi/ioc';
import { ServiceEndpoint, ServiceInfo, ServiceQuery, ServiceWatchCallback, ServiceDiscoveryOptions } from './discovery';
import { ServiceDiscovery } from './registry';

export interface NacosDiscoveryOptions extends ServiceDiscoveryOptions {
    /** Nacos server address, e.g. `http://127.0.0.1:8848`. */
    serverAddr?: string;
    /** namespace id. */
    namespaceId?: string;
    /** group name. Default `DEFAULT_GROUP`. */
    groupName?: string;
    /** login username (v1 auth). */
    username?: string;
    /** login password (v1 auth). */
    password?: string;
    /** pre-acquired access token. */
    accessToken?: string;
    /** polling interval used by `watch`. Default 5s. */
    watchInterval?: number;
    /** injectable fetch implementation. */
    fetchImpl?: typeof fetch;
}

export const NACOS_OPTIONS = token<NacosDiscoveryOptions>('NACOS_OPTIONS');

interface NacosHost {
    instanceId?: string;
    ip?: string;
    port?: number;
    healthy?: boolean;
    enabled?: boolean;
    weight?: number;
    metadata?: Record<string, string>;
    serviceName?: string;
}

/**
 * Nacos v1 HTTP API implementation of `ServiceDiscovery`.
 */
@Injectable()
export class NacosServiceDiscovery extends ServiceDiscovery implements OnDestroy {
    private readonly registered = new Map<string, { ip: string; port: number; serviceName: string; groupName: string }>();
    private readonly watchTimers = new Map<string, ReturnType<typeof setInterval>>();
    private readonly watchCallbacks = new Map<string, Set<ServiceWatchCallback>>();
    private readonly watchSnapshots = new Map<string, string>();
    private token?: string;

    constructor(
        @Optional() @Inject(NACOS_OPTIONS) private readonly options: NacosDiscoveryOptions = {}
    ) {
        super();
        this.token = options.accessToken;
    }

    async register(info: ServiceInfo): Promise<ServiceEndpoint> {
        const { host, port } = splitAddress(info.address, info.port);
        const serviceName = info.name;
        const groupName = this.groupName();
        const metadata = {
            ...(info.metadata ?? {}),
            protocol: info.protocol ?? 'http',
            version: info.version ?? '',
            tags: (info.tags ?? []).join(',')
        };
        const body = new URLSearchParams({
            serviceName,
            groupName,
            namespaceId: this.namespaceId(),
            ip: host,
            port: String(port ?? 0),
            weight: String(info.weight ?? 1),
            enabled: 'true',
            healthy: 'true',
            ephemeral: 'true',
            metadata: JSON.stringify(metadata)
        });
        await this.request('/nacos/v1/ns/instance', 'POST', body, true);
        const id = info.id ?? `${host}#${port ?? 0}#${serviceName}`;
        this.registered.set(id, { ip: host, port: port ?? 0, serviceName, groupName });
        return {
            id,
            name: serviceName,
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
        const entry = this.registered.get(id);
        if (!entry) {
            return;
        }
        const body = new URLSearchParams({
            serviceName: entry.serviceName,
            groupName: entry.groupName,
            namespaceId: this.namespaceId(),
            ip: entry.ip,
            port: String(entry.port),
            ephemeral: 'true'
        });
        await this.request('/nacos/v1/ns/instance', 'DELETE', body, true);
        this.registered.delete(id);
    }

    async discover(name: string): Promise<ServiceEndpoint[]> {
        const query = new URLSearchParams({
            serviceName: name,
            groupName: this.groupName(),
            namespaceId: this.namespaceId(),
            healthyOnly: 'false'
        });
        const result = await this.request<{ hosts?: NacosHost[] }>(
            `/nacos/v1/ns/instance/list?${query.toString()}`,
            'GET',
            undefined,
            true
        );
        return (result?.hosts ?? []).map(host => this.toEndpoint(name, host));
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
        const query = new URLSearchParams({
            pageNo: '1',
            pageSize: '1000',
            namespaceId: this.namespaceId(),
            groupName: this.groupName()
        });
        const result = await this.request<{ doms?: string[] }>(
            `/nacos/v1/ns/service/list?${query.toString()}`,
            'GET',
            undefined,
            true
        );
        return (result?.doms ?? []).map(name => ({
            name,
            address: name,
            protocol: 'http'
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
        return endpoints.some(item => item.id === endpoint.id && item.status !== 'DOWN');
    }

    async update(_id: string, _patch: Partial<ServiceEndpoint>): Promise<ServiceEndpoint | null> {
        return null;
    }

    async shutdown(): Promise<void> {
        for (const timer of this.watchTimers.values()) {
            clearInterval(timer);
        }
        this.watchTimers.clear();
        this.watchCallbacks.clear();
        this.watchSnapshots.clear();
        this.registered.clear();
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
            // Retry on the next tick.
        }
    }

    private toEndpoint(name: string, host: NacosHost): ServiceEndpoint {
        const metadata = host.metadata ?? {};
        const tags = metadata.tags ? metadata.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined;
        return {
            id: host.instanceId ?? `${host.ip}#${host.port}#${name}`,
            name: host.serviceName ?? name,
            address: `${host.ip ?? '127.0.0.1'}:${host.port ?? 0}`,
            protocol: metadata.protocol ?? 'http',
            port: host.port,
            metadata,
            tags,
            status: host.healthy === false || host.enabled === false ? 'DOWN' : 'UP',
            updatedAt: Date.now(),
            version: metadata.version || undefined,
            weight: host.weight ?? 1
        };
    }

    private async request<T = any>(
        path: string,
        method: string,
        body?: URLSearchParams,
        withNamespace = false
    ): Promise<T> {
        const fetchImpl = this.options.fetchImpl ?? fetch;
        const token = await this.ensureToken(fetchImpl);
        const params = body ?? new URLSearchParams();
        if (token) {
            params.set('accessToken', token);
        }
        if (withNamespace && this.namespaceId()) {
            params.set('namespaceId', this.namespaceId());
        }
        let url = `${this.serverAddr()}${path}`;
        let payload: string | undefined;
        if (method === 'GET') {
            const text = params.toString();
            if (text) {
                url += `${url.includes('?') ? '&' : '?'}${text}`;
            }
        } else {
            const text = params.toString();
            if (text) {
                url += `${url.includes('?') ? '&' : '?'}${text}`;
            }
        }
        const response = await fetchImpl(url, {
            method,
            headers: { accept: 'application/json' }
        });
        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`Nacos request failed: ${response.status} ${response.statusText} ${text}`.trim());
        }
        const text = await response.text();
        if (!text) {
            return undefined as T;
        }
        try {
            return JSON.parse(text) as T;
        } catch {
            return text as any;
        }
    }

    private async ensureToken(fetchImpl: typeof fetch): Promise<string | undefined> {
        if (this.token) {
            return this.token;
        }
        if (!this.options.username || !this.options.password) {
            return undefined;
        }
        const body = new URLSearchParams({
            username: this.options.username,
            password: this.options.password
        });
        const response = await fetchImpl(`${this.serverAddr()}/nacos/v1/auth/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });
        if (!response.ok) {
            throw new Error(`Nacos login failed: ${response.status} ${response.statusText}`);
        }
        const result = await response.json() as { accessToken?: string };
        this.token = result?.accessToken;
        return this.token;
    }

    private serverAddr(): string {
        return (this.options.serverAddr ?? 'http://127.0.0.1:8848').replace(/\/$/, '');
    }

    private namespaceId(): string {
        return this.options.namespaceId ?? '';
    }

    private groupName(): string {
        return this.options.groupName ?? 'DEFAULT_GROUP';
    }
}

function splitAddress(address: string, port?: number): { host: string; port?: number } {
    if (/^https?:\/\//i.test(address ?? '')) {
        try {
            const url = new URL(address);
            return { host: url.hostname, port: url.port ? Number(url.port) : port };
        } catch {
            // fall through
        }
    }
    const match = /^(.*):(\d+)$/.exec(address ?? '');
    return match ? { host: match[1], port: Number(match[2]) } : { host: address, port };
}

/**
 * Providers for using Nacos as the registry.
 */
export function useNacosDiscovery(options: NacosDiscoveryOptions = {}) {
    return [
        { provide: NACOS_OPTIONS, useValue: options },
        NacosServiceDiscovery,
        { provide: ServiceDiscovery, useExisting: NacosServiceDiscovery }
    ];
}
