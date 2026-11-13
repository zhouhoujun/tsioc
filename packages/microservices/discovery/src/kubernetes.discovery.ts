import { Inject, Injectable, OnDestroy, Optional, token } from '@tsdi/ioc';
import { ServiceEndpoint, ServiceInfo, ServiceQuery, ServiceWatchCallback, ServiceDiscoveryOptions } from './discovery';
import { ServiceDiscovery } from './registry';

export interface KubernetesDiscoveryOptions extends ServiceDiscoveryOptions {
    /** Kubernetes API server. Default `https://kubernetes.default.svc`. */
    apiServer?: string;
    /** namespace containing the services. Default `default`. */
    namespace?: string;
    /** bearer token for the API server. */
    token?: string;
    /** extra label selector applied to EndpointSlice queries. */
    labelSelector?: string;
    /** polling interval used by `watch`. Default 5s. */
    watchInterval?: number;
    /** injectable fetch implementation (tests/custom agents/TLS). */
    fetchImpl?: typeof fetch;
}

export const KUBERNETES_OPTIONS = token<KubernetesDiscoveryOptions>('KUBERNETES_OPTIONS');

interface EndpointSlice {
    metadata?: {
        name?: string;
        uid?: string;
        labels?: Record<string, string>;
    };
    addressType?: string;
    endpoints?: Array<{
        addresses?: string[];
        conditions?: { ready?: boolean; terminating?: boolean };
        hostname?: string;
        nodeName?: string;
    }>;
    ports?: Array<{
        name?: string;
        port?: number;
        protocol?: string;
        appProtocol?: string;
    }>;
}

/**
 * Kubernetes EndpointSlice implementation of `ServiceDiscovery`.
 *
 * Kubernetes already manages endpoints for workloads, so this adapter is
 * read-only for workload discovery (`register` throws). Use normal Service /
 * Deployment / EndpointSlice manifests to publish services.
 */
@Injectable()
export class KubernetesServiceDiscovery extends ServiceDiscovery implements OnDestroy {
    private readonly watchTimers = new Map<string, ReturnType<typeof setInterval>>();
    private readonly watchCallbacks = new Map<string, Set<ServiceWatchCallback>>();
    private readonly watchSnapshots = new Map<string, string>();

    constructor(
        @Optional() @Inject(KUBERNETES_OPTIONS) private readonly options: KubernetesDiscoveryOptions = {}
    ) {
        super();
    }

    async register(info: ServiceInfo): Promise<ServiceEndpoint> {
        throw new Error(
            `KubernetesServiceDiscovery is read-only; create a Service/EndpointSlice for '${info.name}' instead of calling register()`
        );
    }

    async deregister(_id: string): Promise<void> {
        // EndpointSlice lifecycle is owned by Kubernetes controllers.
    }

    async discover(name: string): Promise<ServiceEndpoint[]> {
        const sliceUrl = `/apis/discovery.k8s.io/v1/namespaces/${encodeURIComponent(this.namespace())}/endpointslices`;
        const selector = [`kubernetes.io/service-name=${name}`, this.options.labelSelector].filter(Boolean).join(',');
        const result = await this.request<{ items?: EndpointSlice[] }>(
            `${sliceUrl}?labelSelector=${encodeURIComponent(selector)}`
        );
        return (result?.items ?? []).flatMap(slice => this.toEndpoints(name, slice));
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
        const result = await this.request<{ items?: any[] }>(
            `/api/v1/namespaces/${encodeURIComponent(this.namespace())}/services`
        );
        return (result?.items ?? []).map(item => {
            const port = item.spec?.ports?.[0];
            return {
                id: item.metadata?.uid,
                name: item.metadata?.name,
                address: item.spec?.clusterIP && item.spec.clusterIP !== 'None'
                    ? `${item.spec.clusterIP}:${port?.port ?? 0}`
                    : item.metadata?.name,
                protocol: port?.appProtocol ?? 'http',
                port: port?.port,
                metadata: item.metadata?.labels,
                tags: splitTags(item.metadata?.labels),
                version: item.metadata?.labels?.['app.kubernetes.io/version']
            };
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
        const batches = await Promise.all(
            services.map(service => service.name ? this.discover(service.name).catch(() => []) : Promise.resolve([]))
        );
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
            // Keep the last snapshot; retry next tick.
        }
    }

    private toEndpoints(name: string, slice: EndpointSlice): ServiceEndpoint[] {
        const sliceName = slice.metadata?.name ?? name;
        const labels = slice.metadata?.labels ?? {};
        const baseTags = splitTags(labels);
        const ports = slice.ports?.length ? slice.ports : [{ port: undefined, appProtocol: 'http' }];
        return (slice.endpoints ?? []).flatMap(item => {
            if (item.conditions?.ready === false || item.conditions?.terminating === true) {
                return [];
            }
            return (item.addresses ?? []).flatMap(address => ports.map(port => ({
                id: `${sliceName}-${address}-${port.port ?? 0}`,
                name,
                address: port.port ? `${address}:${port.port}` : address,
                protocol: port.appProtocol ?? 'http',
                port: port.port,
                metadata: { ...labels, nodeName: item.nodeName, hostname: item.hostname },
                tags: baseTags,
                status: 'UP' as const,
                updatedAt: Date.now(),
                version: labels['app.kubernetes.io/version'],
                weight: 1
            })));
        });
    }

    private namespace(): string {
        const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env;
        return this.options.namespace ?? env?.KUBERNETES_NAMESPACE ?? 'default';
    }

    private async request<T = any>(path: string): Promise<T> {
        const fetchImpl = this.options.fetchImpl ?? fetch;
        const url = `${(this.options.apiServer ?? 'https://kubernetes.default.svc').replace(/\/$/, '')}${path}`;
        const token = this.options.token ?? readServiceAccountToken();
        const response = await fetchImpl(url, {
            headers: {
                accept: 'application/json',
                ...(token ? { authorization: `Bearer ${token}` } : {})
            }
        });
        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`Kubernetes API request failed: ${response.status} ${response.statusText} ${body}`.trim());
        }
        return await response.json() as T;
    }
}

function splitTags(labels?: Record<string, string>): string[] {
    const tags = labels?.tags;
    return tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
}

function readServiceAccountToken(): string | undefined {
    // Avoid importing node:fs in this package; hosts can pass `token` instead.
    const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env;
    return env?.KUBERNETES_TOKEN;
}

/**
 * Providers for using Kubernetes EndpointSlices as the registry.
 */
export function useKubernetesDiscovery(options: KubernetesDiscoveryOptions = {}) {
    return [
        { provide: KUBERNETES_OPTIONS, useValue: options },
        KubernetesServiceDiscovery,
        { provide: ServiceDiscovery, useExisting: KubernetesServiceDiscovery }
    ];
}
