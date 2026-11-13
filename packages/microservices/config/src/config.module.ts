import { Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { ConfigurationManager } from './manager';
import { DefaultConfigurationManager } from './manager';
import { EnvConfigSource, JsonFileConfigSource, MemoryConfigSource } from './sources';
import { ConfigOptions } from './config';
import { CONFIG_OPTIONS, CONFIG_SOURCES } from './tokens';

/**
 * Config module providers.
 */
export const CONFIG_PROVIDERS: Provider[] = [
    DefaultConfigurationManager,
    { provide: ConfigurationManager, useClass: DefaultConfigurationManager },
    EnvConfigSource,
    MemoryConfigSource
];

/**
 * Config module.
 *
 * 配置管理模块，支持多配置源和动态刷新。
 */
@Module({
    providers: CONFIG_PROVIDERS,
    exports: [DefaultConfigurationManager]
})
export class ConfigModule {
    /**
     * create config module with options.
     * @param options config options.
     */
    static withOptions(options: ConfigOptions): ModuleWithProviders<ConfigModule> {
        return {
            module: ConfigModule,
            providers: [
                { provide: CONFIG_OPTIONS, useValue: options }
            ]
        };
    }

    /**
     * create config module with env source.
     * @param prefix env prefix.
     */
    static withEnv(prefix?: string): ModuleWithProviders<ConfigModule> {
        return {
            module: ConfigModule,
            providers: [
                {
                    provide: CONFIG_SOURCES,
                    useValue: new EnvConfigSource({ prefix }),
                    multi: true
                }
            ]
        };
    }

    /**
     * create config module with json file.
     * @param filePath config file path.
     * @param priority source priority.
     */
    static withFile(filePath: string, priority?: number): ModuleWithProviders<ConfigModule> {
        return {
            module: ConfigModule,
            providers: [
                {
                    provide: CONFIG_SOURCES,
                    useValue: new JsonFileConfigSource(filePath, priority),
                    multi: true
                }
            ]
        };
    }
}