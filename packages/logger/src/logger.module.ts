import { Module, ModuleWithProviders, ProvdierOf, Provider, isArray, toProvider } from '@tsdi/ioc';
import { AopModule, AopProvider } from '@tsdi/aop';
import { AnnotationLogAspect } from './aspect';
import { LoggerManager } from './LoggerManager';
import { ConsoleLogManager, LoggerManagers } from './manager';
import { DefaultJoinPointFormater } from './formater';
import { LOG_CONFIGURES, LogConfigure } from './LogConfigure';
import { DebugLogAspect } from './debugs/aspect';

/**
 * logger providers.
 */
export const LOGGER_PROVIDERS: Provider[] = [
    LoggerManagers,
    AnnotationLogAspect,
    DefaultJoinPointFormater,
    ConsoleLogManager,
    { provide: LoggerManager, useExisting: LoggerManagers }
];

/**
 * aop logs ext for Ioc. auto run setup after registered.
 * @export
 * @class LogModule
 */
@Module({
    imports: [
        AopModule
    ],
    providers: LOGGER_PROVIDERS
})
export class LoggerModule {

    /**
     * provide logger with options.
     * @param config
     * @param debug 
     * @returns 
     */
    static withOptions(config: ProvdierOf<LogConfigure> | ProvdierOf<LogConfigure>[] | null, debug?: boolean): ModuleWithProviders<LoggerModule> {
        return {
            module: LoggerModule,
            providers: createLoggerOptionProviders(config, debug)
        };
    }
}

/**
 * provide logger with options.
 * @param config
 * @param debug 
 * @returns 
 */
function createLoggerOptionProviders(config: ProvdierOf<LogConfigure> | ProvdierOf<LogConfigure>[] | null, debug?: boolean): Provider[] {
    const providers: Provider[] = config ? (isArray(config) ? config : [config]).map(cfg => toProvider(LOG_CONFIGURES, cfg, true)) : [{ provide: LOG_CONFIGURES, useValue: { adapter: 'console' }, multi: true }]
    if (debug) {
        providers.push(DebugLogAspect)
    }

    return providers
}

export function provideLogger(config: ProvdierOf<LogConfigure> | ProvdierOf<LogConfigure>[] | null, debug?: boolean): Provider[] {
    return [
        AopProvider,
        ...LOGGER_PROVIDERS,
        ...createLoggerOptionProviders(config, debug)
    ];
}
