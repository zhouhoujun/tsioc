import { Autorun, Injectable, Injector, ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { LogConfigure, DebugLogAspect, LOGGER_PROVIDERS } from '@tsdi/logs';
import { Module } from './metadata/decor';

@Injectable()
export class DebugMode {

    @Autorun()
    register(injector: Injector) {
        injector.register(DebugLogAspect);
    }
}

/**
 * LoggerModule. for application log.
 */
@Module({
    imports: [
        AopModule
    ],
    providers: [...LOGGER_PROVIDERS]
})
export class LoggerModule {

    /**
     * LoggerModule with options.
     * @param config
     * @param debug 
     * @returns 
     */
    static withOptions(config: LogConfigure | null, debug?: boolean): ModuleWithProviders<LoggerModule> {
        const providers: ProviderType[] = config ? [{ provide: LogConfigure, useValue: config }] : [];
        if(debug) {
            providers.push(DebugMode);
        }

        return {
            module: LoggerModule,
            providers
        }
    }
}
