import { ModuleWithProviders, ProvdierOf, Provider } from '@tsdi/ioc';
import { LogConfigure } from './LogConfigure';
/**
 * logger providers.
 */
export declare const LOGGER_PROVIDERS: Provider[];
/**
 * aop logs ext for Ioc. auto run setup after registered.
 * @export
 * @class LogModule
 */
export declare class LoggerModule {
    /**
     * provide logger with options.
     * @param config
     * @param debug
     * @returns
     */
    static withOptions(config: ProvdierOf<LogConfigure> | ProvdierOf<LogConfigure>[] | null, debug?: boolean): ModuleWithProviders<LoggerModule>;
}
/**
 * provide logger with options.
 * @param config
 * @param debug
 * @returns
 */
export declare function provideLogger(config: ProvdierOf<LogConfigure> | ProvdierOf<LogConfigure>[] | null, debug?: boolean): ModuleWithProviders<LoggerModule>;
