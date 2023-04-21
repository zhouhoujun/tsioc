import { Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { AnnotationLogAspect } from './aspect';
import { LoggerManager } from './LoggerManager';
import { ConsoleLogManager, LoggerManagers } from './manager';
import { DefaultJoinpointFormater } from './formater';
import { LOG_CONFIGURES, LogConfigure } from './LogConfigure';
import { DebugLogAspect } from './debugs/aspect';

/**
 * logger providers.
 */
export const LOGGER_PROVIDERS: ProviderType[] = [
    LoggerManagers,
    AnnotationLogAspect,
    DefaultJoinpointFormater,
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
    providers: [
        ...LOGGER_PROVIDERS
    ]
})
export class LoggerModule {

    /**
     * LoggerModule with options.
     * @param config
     * @param debug 
     * @returns 
     */
    static withOptions(config: ProvdierOf<LogConfigure> | ProvdierOf<LogConfigure>[] | null, debug?: boolean): ModuleWithProviders<LoggerModule> {
        const providers: ProviderType[] = config ? (isArray(config) ? config : [config]).map(cfg => toProvider(LOG_CONFIGURES, cfg, true)) : [{ provide: LOG_CONFIGURES, useValue: { adapter: 'console' }, multi: true }]
        if (debug) {
            providers.push(DebugLogAspect)
        }

        return {
            module: LoggerModule,
            providers
        }
    }
}


