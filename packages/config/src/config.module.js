"use strict";
var ConfigModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigModule = exports.CONFIG_PROVIDERS = exports.CONFIG_OPTIONS = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const manager_1 = require("./manager");
const manager_2 = require("./manager");
const sources_1 = require("./sources");
/**
 * Config options token.
 */
exports.CONFIG_OPTIONS = (0, ioc_1.token)('CONFIG_OPTIONS');
/**
 * Config module providers.
 */
exports.CONFIG_PROVIDERS = [
    manager_2.DefaultConfigurationManager,
    { provide: manager_1.ConfigurationManager, useClass: manager_2.DefaultConfigurationManager },
    sources_1.EnvConfigSource,
    sources_1.MemoryConfigSource
];
/**
 * Config module.
 *
 * 配置管理模块，支持多配置源和动态刷新。
 */
let ConfigModule = ConfigModule_1 = class ConfigModule {
    /**
     * create config module with options.
     * @param options config options.
     */
    static withOptions(options) {
        return {
            module: ConfigModule_1,
            providers: [
                { provide: exports.CONFIG_OPTIONS, useValue: options }
            ]
        };
    }
    /**
     * create config module with env source.
     * @param prefix env prefix.
     */
    static withEnv(prefix) {
        return {
            module: ConfigModule_1,
            providers: [
                {
                    provide: sources_1.EnvConfigSource,
                    useFactory: () => new sources_1.EnvConfigSource({ prefix })
                }
            ]
        };
    }
    /**
     * create config module with json file.
     * @param filePath config file path.
     * @param priority source priority.
     */
    static withFile(filePath, priority) {
        // Dynamic import will be handled at runtime
        return {
            module: ConfigModule_1,
            providers: [
                {
                    provide: 'JsonFileConfigSource',
                    useFactory: async () => {
                        const { JsonFileConfigSource } = await Promise.resolve().then(() => require('./sources/env.source'));
                        return new JsonFileConfigSource(filePath, priority);
                    }
                }
            ]
        };
    }
};
exports.ConfigModule = ConfigModule;
exports.ConfigModule = ConfigModule = ConfigModule_1 = tslib_1.__decorate([
    (0, ioc_1.Module)({
        providers: exports.CONFIG_PROVIDERS,
        exports: [manager_2.DefaultConfigurationManager]
    })
], ConfigModule);
//# sourceMappingURL=config.module.js.map