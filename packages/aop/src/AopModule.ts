

import { IContainer, LifeScope, DecoratorType, CoreActions, IocState, LifeState, Inject, ContainerToken, LifeScopeToken, IocExt } from '@ts-ioc/core';
import { Aspect } from './decorators/index';
import { Advisor } from './Advisor';
import { AopActions } from './actions/index';
import { AdviceMatcher } from './AdviceMatcher';
import { Advice } from './decorators/index';
import { AopActionFactory } from './actions/AopActionFactory';
import { Joinpoint } from './joinpoints/index';
import { ProxyMethod, AdvisorChainFactory, AdvisorChain, SyncProceeding, AsyncObservableProceeding, AsyncPromiseProceeding, ReturningRecognizer } from './access/index';
/**
 * aop ext for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class AopModule
 */
@IocExt('setup')
export class AopModule {

    constructor(@Inject(ContainerToken) private container: IContainer) {

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


        let lifeScope = container.get(LifeScopeToken);

        let factory = new AopActionFactory();
        lifeScope.addAction(factory.create(AopActions.registAspect), IocState.design);
        lifeScope.addAction(factory.create(AopActions.matchPointcut), IocState.runtime, LifeState.beforeConstructor);
        lifeScope.addAction(factory.create(AopActions.bindMethodPointcut), IocState.runtime, LifeState.AfterInit);

        lifeScope.addAction(factory.create(AopActions.invokeBeforeConstructorAdvices), IocState.runtime, LifeState.beforeConstructor);
        lifeScope.addAction(factory.create(AopActions.exetndsInstance), IocState.runtime, LifeState.onInit, LifeState.afterConstructor);
        lifeScope.addAction(factory.create(AopActions.invokeAfterConstructorAdvices), IocState.runtime, LifeState.afterConstructor);


        lifeScope.registerDecorator(Aspect, AopActions.registAspect, AopActions.exetndsInstance);

    }
}
