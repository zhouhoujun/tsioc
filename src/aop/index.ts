
export * from './actions/index';
export * from './decorators/index';
export * from './metadatas/index';
export * from './joinpoints/index';
export * from './advices/index';
export * from './access/index';

export * from './IAdvisor';
export * from './Advisor';
export * from './AdviceMatcher';
export * from './isValideAspectTarget';



import { IContainer } from '../IContainer';
import { Aspect } from './decorators/index';
import { Advisor } from './Advisor';
import { symbols } from '../utils/index';
import { AopActions } from './actions/index';
import { AdviceMatcher } from './AdviceMatcher';
import { Advice } from './decorators/index';
import { LifeScope } from '../LifeScope';
import { DecoratorType, CoreActions } from '../core/index';
import { AopActionFactory } from './actions/AopActionFactory';
import { IocState } from '../types';
import { Joinpoint } from './joinpoints/index';
import { ProxyMethod, AdvisorChainFactory, AdvisorChain, SyncProceeding, AsyncObservableProceeding, AsyncPromiseProceeding, ReturningRecognizer } from './access/index';

/**
 * register aop for container.
 *
 * @export
 * @param {IContainer} container
 */
export function registerAops(container: IContainer) {
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

    // container.registerSingleton(symbols.IProxyMethod, () => new ProxyMethod(container));
    // container.registerSingleton(symbols.IAdvisor, () => new Advisor(container));
    // container.registerSingleton(symbols.IAdviceMatcher, () => new AdviceMatcher(container));

    let lifeScope = container.get<LifeScope>(symbols.LifeScope);

    let factory = new AopActionFactory();
    lifeScope.addAction(factory.create(AopActions.registAspect), DecoratorType.Class, IocState.design);
    lifeScope.addAction(factory.create(AopActions.matchPointcut), DecoratorType.Class, IocState.runtime);
    lifeScope.addAction(factory.create(AopActions.bindMethodPointcut), DecoratorType.Method);
    // lifeScope.addAction(factory.create(AopActions.bindPropertyPointcut), DecoratorType.Property);

    lifeScope.addAction(factory.create(AopActions.invokeBeforeConstructorAdvices), DecoratorType.Class, CoreActions.beforeConstructor);
    lifeScope.addAction(factory.create(AopActions.exetndsInstance), DecoratorType.Class, CoreActions.afterConstructor);
    lifeScope.addAction(factory.create(AopActions.invokeAfterConstructorAdvices), DecoratorType.Class, CoreActions.afterConstructor);


    lifeScope.registerDecorator(Aspect, AopActions.registAspect, AopActions.exetndsInstance);

}
