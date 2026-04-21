"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonFileConfigSource = exports.MemoryConfigSource = exports.EnvConfigSource = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
/**
 * Environment config source.
 * 从环境变量加载配置。
 */
let EnvConfigSource = class EnvConfigSource {
    constructor(options = {}) {
        this.type = 'env';
        this.priority = 100; // High priority
        this.name = 'env';
        this.enabled = true;
        this.optional = true;
        this.prefix = options.prefix ?? '';
        this.separator = options.separator ?? '_';
    }
    async load() {
        const config = {};
        const env = process.env;
        for (const [key, value] of Object.entries(env)) {
            if (value === undefined)
                continue;
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
    convertKey(envKey) {
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
    setValue(config, key, value) {
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
    parseValue(value) {
        // Try to parse as JSON
        if (value.startsWith('{') || value.startsWith('[')) {
            try {
                return JSON.parse(value);
            }
            catch {
                return value;
            }
        }
        // Parse booleans
        if (value.toLowerCase() === 'true')
            return true;
        if (value.toLowerCase() === 'false')
            return false;
        // Parse numbers
        const num = Number(value);
        if (!isNaN(num))
            return num;
        return value;
    }
};
exports.EnvConfigSource = EnvConfigSource;
exports.EnvConfigSource = EnvConfigSource = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [Object])
], EnvConfigSource);
/**
 * Memory config source.
 * 内存配置源，用于程序化设置配置。
 */
let MemoryConfigSource = class MemoryConfigSource {
    constructor() {
        this.type = 'memory';
        this.priority = 0; // Lowest priority
        this.name = 'memory';
        this.enabled = true;
        this.optional = true;
        this.config = {};
        this.watchers = new Set();
    }
    setConfig(config) {
        this.config = { ...config };
    }
    setValue(key, value) {
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
    getValue(key) {
        const keys = key.split('.');
        let value = this.config;
        for (const k of keys) {
            if (value === undefined)
                return undefined;
            value = value[k];
        }
        return value;
    }
    async load() {
        return { ...this.config };
    }
    watch(callback) {
        this.watchers.add(callback);
    }
    unwatch() {
        this.watchers.clear();
    }
    clear() {
        this.config = {};
    }
};
exports.MemoryConfigSource = MemoryConfigSource;
exports.MemoryConfigSource = MemoryConfigSource = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], MemoryConfigSource);
/**
 * JSON file config source.
 */
let JsonFileConfigSource = class JsonFileConfigSource {
    constructor(filePath, priority) {
        this.filePath = filePath;
        this.type = 'json';
        this.priority = 50;
        this.enabled = true;
        this.optional = false;
        this.name = `json:${filePath}`;
        if (priority)
            this.priority = priority;
    }
    async load() {
        const fs = await Promise.resolve().then(() => require('fs/promises'));
        const content = await fs.readFile(this.filePath, 'utf-8');
        return JSON.parse(content);
    }
};
exports.JsonFileConfigSource = JsonFileConfigSource;
exports.JsonFileConfigSource = JsonFileConfigSource = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [String, Number])
], JsonFileConfigSource);
//# sourceMappingURL=env.source.js.map