

import { IContainer, LifeScope, DecoratorType, CoreActions, symbols, IocState, LifeState, Inject, IocModule } from '@tsioc/core';
import { Aspect } from './decorators/index';
import { Advisor } from './Advisor';
import { AopActions } from './actions/index';
import { AdviceMatcher } from './AdviceMatcher';
import { Advice } from './decorators/index';
import { AopActionFactory } from './actions/AopActionFactory';
import { Joinpoint } from './joinpoints/index';
import { ProxyMethod, AdvisorChainFactory, AdvisorChain, SyncProceeding, AsyncObservableProceeding, AsyncPromiseProceeding, ReturningRecognizer } from './access/index';

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
        container.register(Joinpoint);
        container.register(AdvisorChainFactory);
        container.register(ReturningRecognizer);
        container.register(SyncProceeding);
        container.register(AsyncPromiseProceeding);
        container.register(AsyncObservableProceeding);
        container.register(AdvisorChain);
        container.register(ProxyMethod);
        container.register(Advisor);
        container.register(AdviceMatcher);


        let lifeScope = container.get<LifeScope>(symbols.LifeScope);

        let factory = new AopActionFactory();
        lifeScope.addAction(factory.create(AopActions.registAspect), DecoratorType.Class, IocState.design);
        lifeScope.addAction(factory.create(AopActions.matchPointcut), DecoratorType.Class, IocState.design);
        lifeScope.addAction(factory.create(AopActions.bindMethodPointcut), DecoratorType.Method);

        lifeScope.addAction(factory.create(AopActions.invokeBeforeConstructorAdvices), DecoratorType.Class, IocState.runtime, LifeState.beforeConstructor);
        lifeScope.addAction(factory.create(AopActions.exetndsInstance), DecoratorType.Class, IocState.runtime, LifeState.afterConstructor);
        lifeScope.addAction(factory.create(AopActions.invokeAfterConstructorAdvices), DecoratorType.Class, IocState.runtime, LifeState.afterConstructor);


        lifeScope.registerDecorator(Aspect, AopActions.registAspect, AopActions.exetndsInstance);

    }
}
