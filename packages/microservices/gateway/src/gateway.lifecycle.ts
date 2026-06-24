import { Inject, Injectable, OnDestroy } from '@tsdi/ioc';
import { ServiceDiscovery } from '@tsdi/discovery';
import { ConfigurationManager, ConfigChange } from '@tsdi/config';
import { GATEWAY_OPTIONS, GatewayOptions, GatewayRouteOptions } from './gateway.options';
import { GatewayRuntime } from './gateway.runtime';
import { GatewayConfigAdapter } from './gateway.config-adapter';

@Injectable()
export class GatewayLifecycle implements OnDestroy {
    private healthTimer?: ReturnType<typeof setInterval>;
    private readonly configWatcher: (change: ConfigChange) => void;
    private watchingKey?: string;
    private started = false;

    constructor(
        @Inject(GATEWAY_OPTIONS) private options: GatewayOptions,
        @Inject(GatewayRuntime) private runtime: GatewayRuntime,
        @Inject(ConfigurationManager, { nullable: true }) private configManager: ConfigurationManager | null,
        @Inject(GatewayConfigAdapter, { nullable: true }) private configAdapter: GatewayConfigAdapter | null,
        @Inject(ServiceDiscovery, { nullable: true }) private discovery: ServiceDiscovery | null
    ) {
        this.configWatcher = (change) => this.applyConfigChange(change.newValue);
    }

    start(): void {
        if (this.started) {
            return;
        }
        this.started = true;
        this.bindConfigSync();
        this.startHealthProbe();
    }

    onDestroy(): void {
        this.stopHealthProbe();
        this.unbindConfigSync();
        this.started = false;
    }

    private bindConfigSync(): void {
        const sync = this.options.configSync;
        if (!sync || sync.enabled === false) {
            return;
        }
        if (this.configAdapter) {
            const current = this.configAdapter.load();
            if (current) {
                this.applyConfigChange(current);
            }
            this.configAdapter.watch(this.configWatcher);
            return;
        }
        if (!this.configManager) {
            return;
        }
        this.watchingKey = sync.key ?? 'gateway';
        const current = this.configManager.get<any>(this.watchingKey);
        if (current) {
            this.applyConfigChange(current);
        }
        this.configManager.watch(this.watchingKey, this.configWatcher);
    }

    private unbindConfigSync(): void {
        if (this.configAdapter) {
            this.configAdapter.unwatch(this.configWatcher);
        }
        if (this.watchingKey && this.configManager) {
            this.configManager.unwatch(this.watchingKey, this.configWatcher);
        }
        this.watchingKey = undefined;
    }

    private applyConfigChange(nextValue: any): void {
        if (!nextValue || typeof nextValue !== 'object') {
            return;
        }
        const replaceRoutes = this.options.configSync === false ? true : (this.options.configSync?.replaceRoutes ?? true);
        const patch = nextValue as Partial<GatewayOptions>;
        const merged: Partial<GatewayOptions> = {
            ...patch
        };
        if (!replaceRoutes && patch.routes?.length) {
            const currentRoutes = this.runtime.getRoutes(this.options.routes);
            merged.routes = this.mergeRoutes(currentRoutes, patch.routes);
        }
        this.runtime.setDynamicOptions(merged);
    }

    private mergeRoutes(current: GatewayRouteOptions[], incoming: GatewayRouteOptions[]): GatewayRouteOptions[] {
        const map = new Map<string, GatewayRouteOptions>();
        current.forEach(route => map.set(`${route.path}:${route.service}`, route));
        incoming.forEach(route => {
            const key = `${route.path}:${route.service}`;
            map.set(key, { ...(map.get(key) ?? {}), ...route } as GatewayRouteOptions);
        });
        return Array.from(map.values());
    }

    private startHealthProbe(): void {
        const probe = this.options.healthProbe;
        if (!probe || probe.enabled === false || !this.discovery) {
            return;
        }
        const interval = probe.interval ?? 15_000;
        this.healthTimer = setInterval(() => {
            this.probeRoutes().catch(() => undefined);
        }, interval);
    }

    private stopHealthProbe(): void {
        if (this.healthTimer) {
            clearInterval(this.healthTimer);
            this.healthTimer = undefined;
        }
    }

    private async probeRoutes(): Promise<void> {
        if (!this.discovery) {
            return;
        }
        const probe = this.options.healthProbe;
        if (!probe) {
            return;
        }
        const routes = this.runtime.getRoutes(this.options.routes);
        const services = Array.from(new Set(routes.map(route => route.service)));
        for (const service of services) {
            const endpoints = await this.discovery.discover(service);
            for (const endpoint of endpoints) {
                if (probe.httpOnly !== false && endpoint.protocol && !/^https?$/i.test(endpoint.protocol)) {
                    continue;
                }
                try {
                    const healthy = await this.discovery.healthCheck(endpoint);
                    if (healthy) {
                        this.runtime.clearEndpointEviction(endpoint.id);
                    } else {
                        this.runtime.evictEndpoint(endpoint, probe.evictFor ?? intervalToEvict(probe.interval));
                    }
                } catch {
                    this.runtime.evictEndpoint(endpoint, probe.evictFor ?? intervalToEvict(probe.interval));
                }
            }
        }
    }
}

function intervalToEvict(interval?: number): number {
    return Math.max(interval ?? 15_000, 5_000);
}
