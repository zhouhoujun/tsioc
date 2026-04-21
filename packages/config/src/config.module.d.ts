import { ModuleWithProviders, Provider } from '@tsdi/ioc';
import { ConfigOptions } from './config';
/**
 * Config options token.
 */
export declare const CONFIG_OPTIONS: import("@tsdi/ioc").InjectToken<ConfigOptions>;
/**
 * Config module providers.
 */
export declare const CONFIG_PROVIDERS: Provider[];
/**
 * Config module.
 *
 * 配置管理模块，支持多配置源和动态刷新。
 */
export declare class ConfigModule {
    /**
     * create config module with options.
     * @param options config options.
     */
    static withOptions(options: ConfigOptions): ModuleWithProviders<ConfigModule>;
    /**
     * create config module with env source.
     * @param prefix env prefix.
     */
    static withEnv(prefix?: string): ModuleWithProviders<ConfigModule>;
    /**
     * create config module with json file.
     * @param filePath config file path.
     * @param priority source priority.
     */
    static withFile(filePath: string, priority?: number): ModuleWithProviders<ConfigModule>;
}
