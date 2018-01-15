import { IContainer } from '../IContainer';
import { symbols } from '../utils/index';
import { Injectable, Component, AutoWired, Inject, Singleton, Param, Method, NonePointcut } from './decorators/index';
import { CoreActions } from './actions/index';
import { DefaultLifeScope } from './DefaultLifeScope';
import { LifeScope } from '../LifeScope';
import { IocState } from '../types';
import { ActionFactory } from './ActionFactory';
import { DecoratorType } from './factories/index';
import { MethodAccessor } from './MethodAccessor';
import { ProviderMatcher } from './ProviderMatcher';
import { ProviderMap } from './providers/index';


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

/**
 * register core for container.
 *
 * @export
 * @param {IContainer} container
 */
export function registerCores(container: IContainer) {

    container.registerSingleton(symbols.LifeScope, () => new DefaultLifeScope(container));
    container.registerSingleton(ProviderMap, () => new ProviderMap(container));
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

    lifeScope.registerDecorator(Injectable, CoreActions.bindProvider);
    lifeScope.registerDecorator(Component, CoreActions.bindProvider);
    lifeScope.registerDecorator(Singleton, CoreActions.bindProvider);
    // lifeScope.registerDecorator(NonePointcut, CoreActions.bindProvider);
    lifeScope.registerDecorator(AutoWired, CoreActions.bindParameterType, CoreActions.bindPropertyType);
    lifeScope.registerDecorator(Inject, CoreActions.bindParameterType, CoreActions.bindPropertyType);
    lifeScope.registerDecorator(Param, CoreActions.bindParameterType, CoreActions.bindPropertyType);
    lifeScope.registerDecorator(Method, CoreActions.bindParameterProviders);

    container.register(Date, () => new Date());
    container.register(String, () => '');
}
