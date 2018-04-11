import { IocModule, Inject, symbols, IContainer, LifeScope, LifeState, CoreActions } from '@ts-ioc/core';
import { Logger } from './decorators/Logger';
import { AnnotationLogerAspect } from './AnnotationLogerAspect';
import { ConsoleLogManager } from './ConsoleLog';


@IocModule('setup')
export class AopModule {

    constructor(@Inject(symbols.IContainer) private container: IContainer) {

    }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup() {
        let container = this.container;
        let lifeScope = container.get<LifeScope>(symbols.LifeScope);
        lifeScope.registerDecorator(Logger, LifeState.onInit, CoreActions.bindParameterProviders);

        container.register(AnnotationLogerAspect);
        container.register(ConsoleLogManager);
    }
}
