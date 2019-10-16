import { Inject, DecoratorScopes, BindMethodProviderAction, DesignRegisterer } from '@tsdi/ioc';
import { IContainer, ContainerToken, IocExt } from '@tsdi/core';
import { AopModule } from '@tsdi/aop';
import { Logger } from './decorators/Logger';
import { AnnotationLoggerAspect } from './AnnotationLoggerAspect';
import { ConsoleLogManager } from './ConsoleLogManager';
import { ConfigureLoggerManger } from './ConfigureLoggerManger';
import { LogFormater } from './LogFormater';

/**
 * aop logs ext for Ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class LogModule
 */
@IocExt('setup')
export class LogModule {

    constructor() {

    }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup(@Inject(ContainerToken) container: IContainer) {
        if (!container.has(AopModule)) {
            container.register(AopModule);
        }
        container.getInstance(DesignRegisterer)
            .register(Logger, DecoratorScopes.Class, BindMethodProviderAction)
            .register(Logger, DecoratorScopes.Method, BindMethodProviderAction);

        container.register(ConfigureLoggerManger);
        container.register(AnnotationLoggerAspect);
        container.register(LogFormater);
        container.register(ConsoleLogManager);
    }
}
