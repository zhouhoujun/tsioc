import { Inject, IocExt, IContainer, CONTAINER } from '@tsdi/ioc';
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

    constructor() { }

    /**
     * register aop for container.
     */
    setup(@Inject(CONTAINER) container: IContainer) {
        if (!container.has(AopModule)) {
            container.registerType(AopModule);
        }

        container.inject(ConfigureLoggerManager, AnnotationLoggerAspect, LogFormater, ConsoleLogManager);
    }
}
