import { IContainer } from '../IContainer';
import { symbols } from '../utils/index';
import { Injectable, Component, AutoWired, Inject, Singleton, Param, Method, NonePointcut, Abstract } from './decorators/index';
import { CoreActions } from './actions/index';
import { DefaultLifeScope } from './DefaultLifeScope';
import { LifeScope } from '../LifeScope';
import { IocState } from '../types';
import { ActionFactory } from './ActionFactory';
import { DecoratorType } from './factories/index';
import { MethodAccessor } from './MethodAccessor';
import { ProviderMatcher } from './ProviderMatcher';
import { ProviderMap } from './providers/index';
import { CacheManager } from './CacheManager';

export * from './actions/index';
export * from './decorators/index';
export * from './metadatas/index';
export * from './factories/index';
export * from './providers/index';

export * from './IProviderMatcher';
export * from './ActionData';
export * from './ActionFactory';
export * from './DefaultLifeScope';
export * from './IExecutable';
export * from './ProviderMatcher';
export * from './MethodAccessor';
export * from './ComponentLifecycle';
export * from './CacheManager';

/**
 * register core for container.
 *
 * @export
 * @param {IContainer} container
 */
export function registerCores(container: IContainer) {

    container.registerSingleton(symbols.LifeScope, () => new DefaultLifeScope(container));
    container.register(ProviderMap, () => new ProviderMap(container));
    container.registerSingleton(symbols.ICacheManager, () => new CacheManager(container));
    container.registerSingleton(symbols.IProviderMatcher, () => new ProviderMatcher(container));
    container.registerSingleton(symbols.IMethodAccessor, () => new MethodAccessor(container));

    let factory = new ActionFactory();

    let lifeScope = container.get<LifeScope>(symbols.LifeScope);
    lifeScope.addAction(factory.create(CoreActions.beforeConstructor), DecoratorType.Class);
    lifeScope.addAction(factory.create(CoreActions.afterConstructor), DecoratorType.Class);
    lifeScope.addAction(factory.create(CoreActions.bindProvider), DecoratorType.Class, IocState.design);
    lifeScope.addAction(factory.create(CoreActions.bindPropertyType), DecoratorType.Property);
    lifeScope.addAction(factory.create(CoreActions.injectProperty), DecoratorType.Property);
    lifeScope.addAction(factory.create(CoreActions.bindParameterType), DecoratorType.Parameter);
    lifeScope.addAction(factory.create(CoreActions.bindParameterProviders), DecoratorType.Parameter);

    lifeScope.addAction(factory.create(CoreActions.componentBeforeInit), DecoratorType.Class, CoreActions.afterConstructor);
    lifeScope.addAction(factory.create(CoreActions.componentInit), DecoratorType.Property);

    let cacheAction = factory.create(CoreActions.componentCache);
    lifeScope.addAction(cacheAction, DecoratorType.Class, CoreActions.componentCache);

    lifeScope.registerDecorator(Injectable, CoreActions.bindProvider, CoreActions.componentCache);
    lifeScope.registerDecorator(Component, CoreActions.bindProvider, CoreActions.componentCache, CoreActions.componentBeforeInit, CoreActions.componentInit);
    lifeScope.registerDecorator(Singleton, CoreActions.bindProvider);
    lifeScope.registerDecorator(Abstract, CoreActions.bindProvider, CoreActions.componentCache);
    lifeScope.registerDecorator(AutoWired, CoreActions.bindParameterType, CoreActions.bindPropertyType);
    lifeScope.registerDecorator(Inject, CoreActions.bindParameterType, CoreActions.bindPropertyType);
    lifeScope.registerDecorator(Param, CoreActions.bindParameterType, CoreActions.bindPropertyType);
    lifeScope.registerDecorator(Method, CoreActions.bindParameterProviders);

    container.register(Date, () => new Date());
    container.register(String, () => '');
}
