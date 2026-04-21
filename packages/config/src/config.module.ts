import { Module, ModuleWithProviders, Provider, token } from '@tsdi/ioc';
import { ConfigurationManager } from './manager';
import { DefaultConfigurationManager } from './manager';
import { EnvConfigSource, MemoryConfigSource } from './sources';
import { ConfigOptions } from './config';

/**
 * Config options token.
 */
export const CONFIG_OPTIONS = token<ConfigOptions>('CONFIG_OPTIONS');

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
                    provide: EnvConfigSource,
                    useFactory: () => new EnvConfigSource({ prefix })
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
        // Dynamic import will be handled at runtime
        return {
            module: ConfigModule,
            providers: [
                {
                    provide: 'JsonFileConfigSource',
                    useFactory: async () => {
                        const { JsonFileConfigSource } = await import('./sources/env.source');
                        return new JsonFileConfigSource(filePath, priority);
                    }
                }
            ]
        };
    }
}