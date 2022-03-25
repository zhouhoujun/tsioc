import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { LogConfigure, DebugLogAspect, LOGGER_PROVIDERS } from '@tsdi/logs';
import { Module } from './metadata/decor';


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
     * LogModule with options.
     * @param config
     * @param debug 
     * @returns 
     */
    static withOptions(config: LogConfigure | null, debug?: boolean): ModuleWithProviders<LoggerModule> {
        const providers: ProviderType[] = [{ provide: LogConfigure, useValue: config }];
        if (debug) {
            providers.push(DebugLogAspect);
        }

        return {
            module: LoggerModule,
            providers
        }
    }
}
