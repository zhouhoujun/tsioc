import { ConfigSource, ConfigSourceType, ConfigChangeCallback } from '../config';
/**
 * Environment config source options.
 */
export interface EnvConfigSourceOptions {
    /**
     * env prefix.
     */
    prefix?: string;
    /**
     * separator for nested keys.
     */
    separator?: string;
}
/**
 * Environment config source.
 * 从环境变量加载配置。
 */
export declare class EnvConfigSource implements ConfigSource {
    type: ConfigSourceType;
    priority: number;
    name: string;
    enabled: boolean;
    optional: boolean;
    private prefix;
    private separator;
    constructor(options?: EnvConfigSourceOptions);
    load(): Promise<Record<string, any>>;
    private convertKey;
    private setValue;
    private parseValue;
}
/**
 * Memory config source.
 * 内存配置源，用于程序化设置配置。
 */
export declare class MemoryConfigSource implements ConfigSource {
    type: ConfigSourceType;
    priority: number;
    name: string;
    enabled: boolean;
    optional: boolean;
    private config;
    private watchers;
    setConfig(config: Record<string, any>): void;
    setValue(key: string, value: any): void;
    private getValue;
    load(): Promise<Record<string, any>>;
    watch(callback: ConfigChangeCallback): void;
    unwatch(): void;
    clear(): void;
}
/**
 * JSON file config source.
 */
export declare class JsonFileConfigSource implements ConfigSource {
    private filePath;
    type: ConfigSourceType;
    priority: number;
    name: string;
    enabled: boolean;
    optional: boolean;
    constructor(filePath: string, priority?: number);
    load(): Promise<Record<string, any>>;
}
