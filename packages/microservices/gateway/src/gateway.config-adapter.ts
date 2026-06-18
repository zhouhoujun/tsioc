import { Abstract, Inject, Injectable, token } from '@tsdi/ioc';
import { ConfigurationManager, ConfigChangeCallback } from '@tsdi/config';

export interface GatewayConfigSnapshot {
    routes?: any[];
    [key: string]: any;
}

export interface GatewayConfigAdapterOptions {
    provider?: 'default' | 'nacos' | 'apollo' | 'consul';
    key?: string;
    namespace?: string;
    group?: string;
}

@Abstract()
export abstract class GatewayConfigAdapter {
    abstract load(): GatewayConfigSnapshot | undefined;
    abstract watch(callback: ConfigChangeCallback): void;
    abstract unwatch(callback: ConfigChangeCallback): void;
}

export const GATEWAY_CONFIG_ADAPTER_OPTIONS = token<GatewayConfigAdapterOptions>('GATEWAY_CONFIG_ADAPTER_OPTIONS');

@Injectable()
export class ConfigurationManagerGatewayAdapter extends GatewayConfigAdapter {
    private callbackMap = new Map<ConfigChangeCallback, ConfigChangeCallback>();

    constructor(
        @Inject(ConfigurationManager, { nullable: true }) private configManager: ConfigurationManager | null,
        @Inject(GATEWAY_CONFIG_ADAPTER_OPTIONS, { nullable: true }) private options: GatewayConfigAdapterOptions = {}
    ) {
        super();
    }

    load(): GatewayConfigSnapshot | undefined {
        if (!this.configManager) {
            return undefined;
        }
        const key = this.resolveKey();
        return this.configManager.get<GatewayConfigSnapshot>(key);
    }

    watch(callback: ConfigChangeCallback): void {
        if (!this.configManager) {
            return;
        }
        const key = this.resolveKey();
        const wrapped: ConfigChangeCallback = (change) => callback(change);
        this.callbackMap.set(callback, wrapped);
        this.configManager.watch(key, wrapped);
    }

    unwatch(callback: ConfigChangeCallback): void {
        if (!this.configManager) {
            return;
        }
        const key = this.resolveKey();
        const wrapped = this.callbackMap.get(callback) ?? callback;
        this.configManager.unwatch(key, wrapped);
        this.callbackMap.delete(callback);
    }

    private resolveKey(): string {
        const provider = this.options.provider ?? 'default';
        const key = this.options.key ?? 'gateway';
        switch (provider) {
            case 'nacos':
                return ['nacos', this.options.namespace, this.options.group, key].filter(Boolean).join('.');
            case 'apollo':
                return ['apollo', this.options.namespace, key].filter(Boolean).join('.');
            case 'consul':
                return ['consul', this.options.namespace, key].filter(Boolean).join('/');
            default:
                return key;
        }
    }
}
