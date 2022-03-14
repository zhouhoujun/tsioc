import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { AnnotationLoggerAspect } from './aspect';
import { ConsoleLogManager, ConfigureLoggerManager } from './manager';
import { DefaultLogFormater } from './formater';
import { LoggerFactory, Module } from '@tsdi/core';
import { LogConfigure } from './LogConfigure';
import { DebugLogAspect } from './debugs/aspect';

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
        ConfigureLoggerManager,
        AnnotationLoggerAspect,
        DefaultLogFormater,
        ConsoleLogManager,
        { provide: LoggerFactory, useExisting: ConfigureLoggerManager }
    ]
})
export class LogModule {

    /**
     * LogModule with options.
     * @param config
     * @param debug 
     * @returns 
     */
    static withOptions(config: LogConfigure | null, debug?: boolean): ModuleWithProviders<LogModule> {
        const providers: ProviderType[] = [{ provide: LogConfigure, useValue: config }];
        if (debug) {
            providers.push(DebugLogAspect);
        }

        return {
            module: LogModule,
            providers
        }
    }
}
