import { Inject, IocExt, IIocContainer, IocContainerToken } from '@tsdi/ioc';
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

    constructor() {

    }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup(@Inject(IocContainerToken) container: IIocContainer) {
        if (!container.has(AopModule)) {
            container.registerType(AopModule);
        }

        container.inject(ConfigureLoggerManager, AnnotationLoggerAspect, LogFormater, ConsoleLogManager);
    }
}
