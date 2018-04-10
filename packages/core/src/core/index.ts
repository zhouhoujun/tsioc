import { IContainer } from '../IContainer';
import { symbols } from '../utils/index';
import { Injectable, Component, AutoWired, Inject, Singleton, Param, Method, Abstract, Autorun, IocModule } from './decorators/index';
import { CoreActions } from './actions/index';
import { DefaultLifeScope } from './DefaultLifeScope';
import { LifeScope } from '../LifeScope';
import { MethodAccessor } from './MethodAccessor';
import { ProviderMatcher } from './ProviderMatcher';
import { ProviderMap } from './providers/index';
import { CacheManager } from './CacheManager';

export * from './actions/index';
export * from './decorators/index';
export * from './metadatas/index';
export * from './factories/index';
export * from './providers/index';

export * from './IRecognizer';
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

    let lifeScope = container.get<LifeScope>(symbols.LifeScope);

    lifeScope.registerDecorator(Injectable, CoreActions.bindProvider, CoreActions.cache);
    lifeScope.registerDecorator(Component, CoreActions.bindProvider, CoreActions.cache, CoreActions.componentBeforeInit, CoreActions.componentInit);
    lifeScope.registerDecorator(Singleton, CoreActions.bindProvider);
    lifeScope.registerDecorator(Abstract, CoreActions.bindProvider, CoreActions.cache);
    lifeScope.registerDecorator(AutoWired, CoreActions.bindParameterType, CoreActions.bindPropertyType);
    lifeScope.registerDecorator(Inject, CoreActions.bindParameterType, CoreActions.bindPropertyType);
    lifeScope.registerDecorator(Param, CoreActions.bindParameterType, CoreActions.bindPropertyType);
    lifeScope.registerDecorator(Method, CoreActions.bindParameterProviders);

    lifeScope.registerDecorator(Autorun, CoreActions.autorun);
    lifeScope.registerDecorator(IocModule, CoreActions.autorun, CoreActions.componentBeforeInit, CoreActions.componentInit);

    container.register(Date, () => new Date());
    container.register(String, () => '');
    container.register(Number, () => Number.NaN);
    container.register(Boolean, () => undefined);

}
