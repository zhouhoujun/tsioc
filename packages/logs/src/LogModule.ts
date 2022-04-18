import { Inject, IocExt, Injector, ProviderType } from '@tsdi/ioc';
import { AnnotationLogAspect } from './aspect';
import { ConsoleLogManager, ConfigureLoggerManager } from './manager';
import { DefaultLogFormater } from './formater';
import { LoggerFactory } from './factory';


/**
 * logger providers.
 */
export const LOGGER_PROVIDERS: ProviderType[] = [
    ConfigureLoggerManager,
    AnnotationLogAspect,
    DefaultLogFormater,
    ConsoleLogManager,
    { provide: LoggerFactory, useExisting: ConfigureLoggerManager }
];

/**
 * aop logs ext for Ioc. auto run setup after registered.
 * @export
 * @class LogModule
 */
@IocExt()
export class LogModule {
    /**
     * register aop for container.
     */
    setup(@Inject() injector: Injector) {
        injector.inject(LOGGER_PROVIDERS);
    }
}
