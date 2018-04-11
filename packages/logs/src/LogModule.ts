import { IocModule, Inject, symbols, IContainer, LifeScope, LifeState, CoreActions } from '@ts-ioc/core';
import { AopModule } from '@ts-ioc/aop';
import { Logger } from './decorators/Logger';
import { AnnotationLogerAspect } from './AnnotationLogerAspect';
import { ConsoleLogManager } from './ConsoleLog';


@IocModule('setup')
export class LogModule {

    constructor(@Inject(symbols.IContainer) private container: IContainer) {

    }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup() {
        let container = this.container;
        if (!container.has(AopModule)) {
            container.register(AopModule);
        }
        let lifeScope = container.get<LifeScope>(symbols.LifeScope);
        lifeScope.registerDecorator(Logger, LifeState.onInit, CoreActions.bindParameterProviders);

        container.register(AnnotationLogerAspect);
        container.register(ConsoleLogManager);
    }
}
