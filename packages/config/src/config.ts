/**
 * Config source type.
 */
export type ConfigSourceType = 'file' | 'env' | 'json' | 'yaml' | 'remote' | 'memory';

/**
 * Config source interface.
 */
export interface ConfigSource {
    /**
     * source type.
     */
    type: ConfigSourceType;
    /**
     * source priority (higher priority overrides lower).
     */
    priority: number;
    /**
     * source name.
     */
    name?: string;
    /**
     * load configuration from source.
     */
    load(): Promise<Record<string, any>>;
    /**
     * watch configuration changes.
     * @param callback callback when config changes.
     */
    watch?(callback: ConfigChangeCallback): void;
    /**
     * stop watching configuration changes.
     */
    unwatch?(): void;
    /**
     * is source enabled.
     */
    enabled?: boolean;
    /**
     * is source optional (won't throw error if load fails).
     */
    optional?: boolean;
}

/**
 * Config change callback.
 */
export type ConfigChangeCallback = (changes: ConfigChange) => void;

/**
 * Config change event.
 */
export interface ConfigChange {
    /**
     * changed key path.
     */
    key: string;
    /**
     * old value.
     */
    oldValue?: any;
    /**
     * new value.
     */
    newValue: any;
    /**
     * source name.
     */
    source?: string;
    /**
     * timestamp.
     */
    timestamp: number;
}

/**
 * Config options.
 */
export interface ConfigOptions {
    /**
     * config sources.
     */
    sources?: ConfigSource[];
    /**
     * refresh interval in seconds.
     */
    refreshInterval?: number;
    /**
     * enable hot reload.
     */
    hotReload?: boolean;
    /**
     * default config values.
     */
    defaults?: Record<string, any>;
    /**
     * config file paths.
     */
    files?: string[];
    /**
     * env prefix.
     */
    envPrefix?: string;
    /**
     * enable env config.
     */
    enableEnv?: boolean;
}

/**
 * Config value options.
 */
export interface ConfigValueOptions {
    /**
     * default value if not found.
     */
    defaultValue?: any;
    /**
     * required config (throw error if not found).
     */
    required?: boolean;
    /**
     * transform function.
     */
    transform?: (value: any) => any;
}

/**
 * Config key metadata.
 */
export interface ConfigKeyMetadata {
    /**
     * config key.
     */
    key: string;
    /**
     * config options.
     */
    options?: ConfigValueOptions;
}