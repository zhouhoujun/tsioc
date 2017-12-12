
export * from './actions';
export * from './decorators';
export * from './metadatas';
export * from './Advices';
export * from './AspectSet';
export * from './IAdviceMatcher';
export * from './AdviceMatcher';
export * from './MatchPointcut';
export * from './Pointcut';
export * from './Joinpoint';
export * from './isValideAspectTarget';



import { IContainer } from '../IContainer';
import { Aspect } from './decorators';
import { AspectSet } from './AspectSet';
import { symbols } from '../utils';
import { AopActions } from './actions';
import { AdviceMatcher } from './AdviceMatcher';
import { Advice } from './decorators';
import { LifeScope } from '../LifeScope';
import { DecoratorType, CoreActions } from '../core';
import { AopActionFactory } from './actions/AopActionFactory';
import { IocState } from '../types';

/**
 * register aop for container.
 *
 * @export
 * @param {IContainer} container
 */
export function registerAops(container: IContainer) {

    container.registerSingleton(AspectSet, () => {
        return new AspectSet(container);
    });
    container.register(AdviceMatcher);

    let lifeScope = container.get<LifeScope>(symbols.LifeScope);

    let factory = new AopActionFactory();
    lifeScope.addAction(factory.create(AopActions.registAspect), DecoratorType.Class, IocState.design);
    lifeScope.addAction(factory.create(AopActions.matchPointcut), DecoratorType.Class, IocState.runtime);
    lifeScope.addAction(factory.create(AopActions.bindMethodPointcut), DecoratorType.Method);
    // lifeScope.addAction(factory.create(AopActions.bindPropertyPointcut), DecoratorType.Property);

    lifeScope.addAction(factory.create(AopActions.invokeBeforeConstructorAdvices), DecoratorType.Class, CoreActions.beforeConstructor);
    lifeScope.addAction(factory.create(AopActions.invokeAfterConstructorAdvices), DecoratorType.Class, CoreActions.afterConstructor);

    lifeScope.registerDecorator(Aspect, AopActions.registAspect);

}
