import { OnDestroy } from '@tsdi/ioc';
import { ConfigSource, ConfigOptions, ConfigChangeCallback, ConfigValueOptions } from './config';
/**
 * Configuration manager abstract interface.
 *
 * 配置管理器抽象接口，管理多个配置源和配置合并。
 */
export declare abstract class ConfigurationManager implements OnDestroy {
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
    onDestroy(): void;
    /**
     * clear all configuration and sources.
     */
    abstract clear(): void;
}
/**
 * Default configuration manager implementation.
 */
export declare class DefaultConfigurationManager extends ConfigurationManager {
    private sources;
    private config;
    private watchers;
    private refreshTimer?;
    constructor(options?: ConfigOptions);
    get<T = any>(key: string, options?: ConfigValueOptions): T | undefined;
    getRequired<T = any>(key: string): T;
    set(key: string, value: any): void;
    has(key: string): boolean;
    getAll(): Record<string, any>;
    addSource(source: ConfigSource): void;
    removeSource(name: string): void;
    watch(key: string, callback: ConfigChangeCallback): void;
    unwatch(key: string, callback: ConfigChangeCallback): void;
    refresh(): Promise<void>;
    load(): Promise<void>;
    clear(): void;
    private getValueByKey;
    private setValueByKey;
    private mergeDeep;
    private detectChanges;
    private getAllKeys;
    private getValueFromConfig;
    private notifyWatchers;
    private handleSourceChange;
}
