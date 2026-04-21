import { ConfigKeyMetadata } from './config';
/**
 * Config decorator for property or parameter.
 * 注入配置值到属性或参数。
 */
export interface ConfigDecorator {
    /**
     * inject config value by key.
     * @param key config key (supports dot notation).
     */
    (key: string): ParameterDecorator & PropertyDecorator;
    /**
     * inject config value with options.
     * @param metadata config key metadata.
     */
    (metadata: ConfigKeyMetadata): ParameterDecorator & PropertyDecorator;
}
/**
 * @Config decorator.
 */
export declare const Config: ConfigDecorator;
