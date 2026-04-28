import { Injectable } from '@tsdi/ioc';
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
@Injectable()
export class EnvConfigSource implements ConfigSource {
    type: ConfigSourceType = 'env';
    priority: number = 100; // High priority
    name: string = 'env';
    enabled: boolean = true;
    optional: boolean = true;

    private prefix: string;
    private separator: string;

    constructor(options: EnvConfigSourceOptions = {}) {
        this.prefix = options.prefix ?? '';
        this.separator = options.separator ?? '_';
    }

    async load(): Promise<Record<string, any>> {
        const config: Record<string, any> = {};
        const env = process.env;

        for (const [key, value] of Object.entries(env)) {
            if (value === undefined) continue;

            // Apply prefix filter
            if (this.prefix && !key.startsWith(this.prefix)) {
                continue;
            }

            // Convert key to config path
            const configKey = this.convertKey(key);
            if (configKey) {
                this.setValue(config, configKey, this.parseValue(value));
            }
        }

        return config;
    }

    private convertKey(envKey: string): string {
        let key = envKey;

        // Remove prefix
        if (this.prefix) {
            key = key.slice(this.prefix.length);
            if (key.startsWith(this.separator)) {
                key = key.slice(this.separator.length);
            }
        }

        // Convert separator to dot notation
        return key.toLowerCase().split(this.separator).join('.');
    }

    private setValue(config: Record<string, any>, key: string, value: any): void {
        const keys = key.split('.');
        let current = config;

        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (current[k] === undefined) {
                current[k] = {};
            }
            current = current[k];
        }

        current[keys[keys.length - 1]] = value;
    }

    private parseValue(value: string): any {
        // Try to parse as JSON
        if (value.startsWith('{') || value.startsWith('[')) {
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }

        // Parse booleans
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;

        // Parse numbers
        const num = Number(value);
        if (!isNaN(num)) return num;

        return value;
    }
}

/**
 * Memory config source.
 * 内存配置源，用于程序化设置配置。
 */
@Injectable()
export class MemoryConfigSource implements ConfigSource {
    type: ConfigSourceType = 'memory';
    priority: number = 0; // Lowest priority
    name: string = 'memory';
    enabled: boolean = true;
    optional: boolean = true;

    private config: Record<string, any> = {};
    private watchers: Set<ConfigChangeCallback> = new Set();

    setConfig(config: Record<string, any>): void {
        this.config = { ...config };
    }

    setValue(key: string, value: any): void {
        const oldValue = this.getValue(key);
        const keys = key.split('.');
        let current = this.config;

        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (current[k] === undefined) {
                current[k] = {};
            }
            current = current[k];
        }

        current[keys[keys.length - 1]] = value;

        // Notify watchers
        for (const callback of this.watchers) {
            callback({
                key,
                oldValue,
                newValue: value,
                source: this.name,
                timestamp: Date.now()
            });
        }
    }

    private getValue(key: string): any {
        const keys = key.split('.');
        let value: any = this.config;

        for (const k of keys) {
            if (value === undefined) return undefined;
            value = value[k];
        }

        return value;
    }

    async load(): Promise<Record<string, any>> {
        return { ...this.config };
    }

    watch(callback: ConfigChangeCallback): void {
        this.watchers.add(callback);
    }

    unwatch(): void {
        this.watchers.clear();
    }

    clear(): void {
        this.config = {};
    }
}

/**
 * JSON file config source.
 */
@Injectable()
export class JsonFileConfigSource implements ConfigSource {
    type: ConfigSourceType = 'json';
    priority: number = 50;
    name: string;
    enabled: boolean = true;
    optional: boolean = false;

    constructor(private filePath: string, priority?: number) {
        this.name = `json:${filePath}`;
        if (priority) this.priority = priority;
    }

    async load(): Promise<Record<string, any>> {
        const fs = await import('fs/promises');
        const content = await fs.readFile(this.filePath, 'utf-8');
        return JSON.parse(content);
    }
}