import { Inject, IocExt, Injector } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { AnnotationLoggerAspect } from './aspect';
import { ConsoleLogManager, ConfigureLoggerManager } from './manager';
import { DefaultLogFormater } from './formater';

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
        if (!injector.has(AopModule)) {
            injector.register(AopModule);
        }

        injector.inject(ConfigureLoggerManager, AnnotationLoggerAspect, DefaultLogFormater, ConsoleLogManager);
    }
}
