import { Inject, IocExt, Injector, PLATFORM_INJECTOR } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { AnnotationLoggerAspect } from './aspect';
import { ConsoleLogManager, ConfigureLoggerManager } from './manager';
import { LogFormater } from './formater';

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
    setup(@Inject(PLATFORM_INJECTOR) injector: Injector) {
        if (!injector.has(AopModule)) {
            injector.register(AopModule);
        }

        injector.inject(ConfigureLoggerManager, AnnotationLoggerAspect, LogFormater, ConsoleLogManager);
    }
}
