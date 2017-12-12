import { IContainer } from '../IContainer';
import { symbols } from '../utils';
import { Injectable, AutoWired, Inject, Singleton, Param, Method } from './decorators';
import { CoreActions } from './actions';
import { DefaultLifeScope } from './DefaultLifeScope';
import { LifeScope } from '../LifeScope';
import { DecoratorType, IocState } from '../index';
import { ActionFactory } from './ActionFactory';


export * from './actions';
export * from './decorators';
export * from './metadatas';
export * from './factories';
export * from './ActionData';
export * from './ActionFactory';
export * from './DefaultLifeScope';
export * from './IExecutable';

/**
 * register core for container.
 *
 * @export
 * @param {IContainer} container
 */
export function registerCores(container: IContainer) {


    container.registerSingleton(symbols.LifeScope, () => new DefaultLifeScope(container));


    let factory = new ActionFactory();

    let lifeScope = container.get<LifeScope>(symbols.LifeScope);
    lifeScope.addAction(factory.create(CoreActions.beforeConstructor), DecoratorType.Class);
    lifeScope.addAction(factory.create(CoreActions.afterConstructor), DecoratorType.Class);
    lifeScope.addAction(factory.create(CoreActions.bindProvider), DecoratorType.Class, IocState.design);
    lifeScope.addAction(factory.create(CoreActions.bindPropertyType), DecoratorType.Property);
    lifeScope.addAction(factory.create(CoreActions.injectProperty), DecoratorType.Property);
    lifeScope.addAction(factory.create(CoreActions.bindParameterType), DecoratorType.Parameter);
    lifeScope.addAction(factory.create(CoreActions.bindParameterProviders), DecoratorType.Parameter);

    lifeScope.registerDecorator(Singleton, CoreActions.bindProvider);
    lifeScope.registerDecorator(Injectable, CoreActions.bindProvider);
    lifeScope.registerDecorator(AutoWired, CoreActions.bindParameterType, CoreActions.bindPropertyType);
    lifeScope.registerDecorator(Inject, CoreActions.bindParameterType, CoreActions.bindPropertyType);
    lifeScope.registerDecorator(Param, CoreActions.bindParameterType, CoreActions.bindPropertyType);
    lifeScope.registerDecorator(Method, CoreActions.bindParameterProviders);

    container.register(Date);
    container.register(String);
    container.register(Number);
    container.register(Boolean);
    container.register(Object);
}
