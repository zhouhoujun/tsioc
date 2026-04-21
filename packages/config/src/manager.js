"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultConfigurationManager = exports.ConfigurationManager = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
/**
 * Configuration manager abstract interface.
 *
 * 配置管理器抽象接口，管理多个配置源和配置合并。
 */
let ConfigurationManager = class ConfigurationManager {
    /**
     * on destroy.
     */
    onDestroy() {
        this.clear();
    }
};
exports.ConfigurationManager = ConfigurationManager;
exports.ConfigurationManager = ConfigurationManager = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], ConfigurationManager);
/**
 * Default configuration manager implementation.
 */
let DefaultConfigurationManager = class DefaultConfigurationManager extends ConfigurationManager {
    constructor(options = {}) {
        super();
        this.sources = [];
        this.config = {};
        this.watchers = new Map();
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
    get(key, options) {
        const value = this.getValueByKey(key);
        if (value === undefined) {
            if (options?.required) {
                throw new Error(`Required config key '${key}' not found`);
            }
            return options?.defaultValue;
        }
        return options?.transform ? options.transform(value) : value;
    }
    getRequired(key) {
        return this.get(key, { required: true });
    }
    set(key, value) {
        this.setValueByKey(key, value);
        this.notifyWatchers(key, value);
    }
    has(key) {
        return this.getValueByKey(key) !== undefined;
    }
    getAll() {
        return { ...this.config };
    }
    addSource(source) {
        this.sources.push(source);
        this.sources.sort((a, b) => b.priority - a.priority); // Sort by priority
    }
    removeSource(name) {
        const index = this.sources.findIndex(s => s.name === name);
        if (index >= 0) {
            this.sources.splice(index, 1);
        }
    }
    watch(key, callback) {
        if (!this.watchers.has(key)) {
            this.watchers.set(key, new Set());
        }
        this.watchers.get(key).add(callback);
    }
    unwatch(key, callback) {
        const watchers = this.watchers.get(key);
        if (watchers) {
            watchers.delete(callback);
        }
    }
    async refresh() {
        const oldConfig = { ...this.config };
        await this.load();
        // Detect changes
        this.detectChanges(oldConfig, this.config);
    }
    async load() {
        const loadedConfigs = [];
        for (const source of this.sources) {
            if (source.enabled === false)
                continue;
            try {
                const config = await source.load();
                loadedConfigs.push(config);
                // Setup watching if supported
                if (source.watch) {
                    source.watch((change) => {
                        this.handleSourceChange(source.name, change);
                    });
                }
            }
            catch (err) {
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
    clear() {
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
    getValueByKey(key) {
        const keys = key.split('.');
        let value = this.config;
        for (const k of keys) {
            if (value === undefined || value === null) {
                return undefined;
            }
            value = value[k];
        }
        return value;
    }
    setValueByKey(key, value) {
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
    }
    mergeDeep(target, source) {
        const result = { ...target };
        for (const key of Object.keys(source)) {
            if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
                result[key] = this.mergeDeep(target[key], source[key]);
            }
            else {
                result[key] = source[key];
            }
        }
        return result;
    }
    detectChanges(oldConfig, newConfig) {
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
    getAllKeys(config, prefix = '') {
        const keys = [];
        for (const key of Object.keys(config)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            keys.push(fullKey);
            if (config[key] instanceof Object && !Array.isArray(config[key])) {
                keys.push(...this.getAllKeys(config[key], fullKey));
            }
        }
        return keys;
    }
    getValueFromConfig(key, config) {
        const keys = key.split('.');
        let value = config;
        for (const k of keys) {
            if (value === undefined)
                return undefined;
            value = value[k];
        }
        return value;
    }
    notifyWatchers(key, newValue, oldValue) {
        const change = {
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
    handleSourceChange(sourceName, change) {
        if (change) {
            change.source = sourceName;
            this.notifyWatchers(change.key, change.newValue, change.oldValue);
        }
    }
};
exports.DefaultConfigurationManager = DefaultConfigurationManager;
exports.DefaultConfigurationManager = DefaultConfigurationManager = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [Object])
], DefaultConfigurationManager);
//# sourceMappingURL=manager.js.map