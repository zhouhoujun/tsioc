import { Abstract, Injectable, OnDestroy } from '@tsdi/ioc';
import { ConfigSource, ConfigOptions, ConfigChange, ConfigChangeCallback, ConfigValueOptions } from './config';

/**
 * Configuration manager abstract interface.
 *
 * 配置管理器抽象接口，管理多个配置源和配置合并。
 */
@Abstract()
export abstract class ConfigurationManager implements OnDestroy {
    /**
     * get configuration value.
     * @param key config key (supports dot notation).
     * @param options config value options.
     */
    abstract get<T = any>(key: string, options?: ConfigValueOptions): T | undefined;

    /**
     * get configuration value or throw error if required.
     * @param key config key.
     */
    abstract getRequired<T = any>(key: string): T;

    /**
     * set configuration value (for memory source).
     * @param key config key.
     * @param value config value.
     */
    abstract set(key: string, value: any): void;

    /**
     * check if config key exists.
     * @param key config key.
     */
    abstract has(key: string): boolean;

    /**
     * get all configuration.
     */
    abstract getAll(): Record<string, any>;

    /**
     * add config source.
     * @param source config source.
     */
    abstract addSource(source: ConfigSource): void;

    /**
     * remove config source.
     * @param name source name.
     */
    abstract removeSource(name: string): void;

    /**
     * watch config changes.
     * @param key config key pattern (supports wildcard).
     * @param callback callback function.
     */
    abstract watch(key: string, callback: ConfigChangeCallback): void;

    /**
     * unwatch config changes.
     * @param key config key pattern.
     * @param callback callback function.
     */
    abstract unwatch(key: string, callback: ConfigChangeCallback): void;

    /**
     * refresh configuration from all sources.
     */
    abstract refresh(): Promise<void>;

    /**
     * load configuration from all sources.
     */
    abstract load(): Promise<void>;

    /**
     * on destroy.
     */
    onDestroy(): void {
        this.clear();
    }

    /**
     * clear all configuration and sources.
     */
    abstract clear(): void;
}

/**
 * Default configuration manager implementation.
 */
@Injectable()
export class DefaultConfigurationManager extends ConfigurationManager {
    private sources: ConfigSource[] = [];
    private config: Record<string, any> = {};
    private watchers: Map<string, Set<ConfigChangeCallback>> = new Map();
    private refreshTimer?: ReturnType<typeof setInterval>;

    constructor(options: ConfigOptions = {}) {
        super();
        if (options.defaults) {
            this.config = { ...options.defaults };
        }
        if (options.sources) {
            options.sources.forEach(source => this.addSource(source));
        }
        if (options.refreshInterval) {
            this.refreshTimer = setInterval(() => this.refresh(), options.refreshInterval * 1000);
        }
    }

    get<T = any>(key: string, options?: ConfigValueOptions): T | undefined {
        const value = this.getValueByKey(key);
        if (value === undefined) {
            if (options?.required) {
                throw new Error(`Required config key '${key}' not found`);
            }
            return options?.defaultValue;
        }
        return options?.transform ? options.transform(value) as T : value as T;
    }

    getRequired<T = any>(key: string): T {
        return this.get<T>(key, { required: true })!;
    }

    set(key: string, value: any): void {
        this.setValueByKey(key, value);
        this.notifyWatchers(key, value);
    }

    has(key: string): boolean {
        return this.getValueByKey(key) !== undefined;
    }

    getAll(): Record<string, any> {
        return { ...this.config };
    }

    addSource(source: ConfigSource): void {
        this.sources.push(source);
        this.sources.sort((a, b) => b.priority - a.priority); // Sort by priority
    }

    removeSource(name: string): void {
        const index = this.sources.findIndex(s => s.name === name);
        if (index >= 0) {
            this.sources.splice(index, 1);
        }
    }

    watch(key: string, callback: ConfigChangeCallback): void {
        if (!this.watchers.has(key)) {
            this.watchers.set(key, new Set());
        }
        this.watchers.get(key)!.add(callback);
    }

    unwatch(key: string, callback: ConfigChangeCallback): void {
        const watchers = this.watchers.get(key);
        if (watchers) {
            watchers.delete(callback);
        }
    }

    async refresh(): Promise<void> {
        const oldConfig = { ...this.config };
        await this.load();

        // Detect changes
        this.detectChanges(oldConfig, this.config);
    }

    async load(): Promise<void> {
        const loadedConfigs: Record<string, any>[] = [];

        for (const source of this.sources) {
            if (source.enabled === false) continue;

            try {
                const config = await source.load();
                loadedConfigs.push(config);

                // Setup watching if supported
                if (source.watch) {
                    source.watch((change) => {
                        this.handleSourceChange(source.name, change);
                    });
                }
            } catch (err) {
                if (!source.optional) {
                    throw err;
                }
            }
        }

        // Merge configs by priority
        this.config = {};
        for (const config of loadedConfigs.reverse()) {
            this.config = this.mergeDeep(this.config, config);
        }
    }

    clear(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        for (const source of this.sources) {
            if (source.unwatch) {
                source.unwatch();
            }
        }

        this.sources = [];
        this.config = {};
        this.watchers.clear();
    }

    private getValueByKey(key: string): any {
        const keys = key.split('.');
        let value: any = this.config;

        for (const k of keys) {
            if (value === undefined || value === null) {
                return undefined;
            }
            value = value[k];
        }

        return value;
    }

    private setValueByKey(key: string, value: any): void {
        const keys = key.split('.');
        let current: any = this.config;

        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (current[k] === undefined) {
                current[k] = {};
            }
            current = current[k];
        }

        current[keys[keys.length - 1]] = value;
    }

    private mergeDeep(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
        const result = { ...target };

        for (const key of Object.keys(source)) {
            if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
                result[key] = this.mergeDeep(target[key], source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }

    private detectChanges(oldConfig: Record<string, any>, newConfig: Record<string, any>): void {
        const allKeys = new Set([
            ...this.getAllKeys(oldConfig),
            ...this.getAllKeys(newConfig)
        ]);

        for (const key of allKeys) {
            const oldValue = this.getValueFromConfig(key, oldConfig);
            const newValue = this.getValueFromConfig(key, newConfig);

            if (oldValue !== newValue) {
                this.notifyWatchers(key, newValue, oldValue);
            }
        }
    }

    private getAllKeys(config: Record<string, any>, prefix = ''): string[] {
        const keys: string[] = [];

        for (const key of Object.keys(config)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            keys.push(fullKey);

            if (config[key] instanceof Object && !Array.isArray(config[key])) {
                keys.push(...this.getAllKeys(config[key], fullKey));
            }
        }

        return keys;
    }

    private getValueFromConfig(key: string, config: Record<string, any>): any {
        const keys = key.split('.');
        let value: any = config;

        for (const k of keys) {
            if (value === undefined) return undefined;
            value = value[k];
        }

        return value;
    }

    private notifyWatchers(key: string, newValue: any, oldValue?: any): void {
        const change: ConfigChange = {
            key,
            oldValue,
            newValue,
            timestamp: Date.now()
        };

        // Notify exact key watchers
        const watchers = this.watchers.get(key);
        if (watchers) {
            for (const callback of watchers) {
                callback(change);
            }
        }

        // Notify wildcard watchers
        for (const [watchKey, callbacks] of this.watchers) {
            if (watchKey.endsWith('*') && key.startsWith(watchKey.slice(0, -1))) {
                for (const callback of callbacks) {
                    callback(change);
                }
            }
        }
    }

    private handleSourceChange(sourceName?: string, change?: ConfigChange): void {
        if (change) {
            change.source = sourceName;
            this.notifyWatchers(change.key, change.newValue, change.oldValue);
        }
    }
}