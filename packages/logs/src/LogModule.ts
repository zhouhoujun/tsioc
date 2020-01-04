import { Inject, DecoratorScopes, BindMethodProviderAction, DesignRegisterer, IocExt, IIocContainer, IocContainerToken, ActionInjectorToken } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { Logger } from './decorators/Logger';
import { AnnotationLoggerAspect } from './AnnotationLoggerAspect';
import { ConsoleLogManager } from './ConsoleLogManager';
import { ConfigureLoggerManger } from './ConfigureLoggerManger';
import { LogFormater } from './LogFormater';

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
        container.get(ActionInjectorToken).getInstance(DesignRegisterer)
            .register(Logger, DecoratorScopes.Class, BindMethodProviderAction)
            .register(Logger, DecoratorScopes.Method, BindMethodProviderAction);

        container.inject(ConfigureLoggerManger, AnnotationLoggerAspect, LogFormater, ConsoleLogManager);
    }
}
