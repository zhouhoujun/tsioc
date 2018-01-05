
export * from './actions/index';
export * from './decorators/index';
export * from './metadatas/index';

export * from './Advices';
export * from './AspectSet';
export * from './IAdviceMatcher';
export * from './AdviceMatcher';
export * from './MatchPointcut';
export * from './IPointcut';
export * from './Joinpoint';
export * from './isValideAspectTarget';



import { IContainer } from '../IContainer';
import { Aspect } from './decorators/index';
import { AspectSet } from './AspectSet';
import { symbols } from '../utils/index';
import { AopActions } from './actions/index';
import { AdviceMatcher } from './AdviceMatcher';
import { Advice } from './decorators/index';
import { LifeScope } from '../LifeScope';
import { DecoratorType, CoreActions } from '../core/index';
import { AopActionFactory } from './actions/AopActionFactory';
import { IocState } from '../types';
import { Joinpoint } from './Joinpoint';

/**
 * register aop for container.
 *
 * @export
 * @param {IContainer} container
 */
export function registerAops(container: IContainer) {

    container.registerSingleton(symbols.IAspectSet, () => {
        return new AspectSet(container);
    });
    container.registerSingleton(symbols.IAdviceMatcher, AdviceMatcher);
    container.register(Joinpoint);

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
