import { IContainer } from '../IContainer';
import { Injectable, Component, AutoWired, Inject, Singleton, Param, Method, Abstract, Autorun, IocExt } from './decorators/index';
import { CoreActions } from './actions/index';
import { DefaultLifeScope } from './DefaultLifeScope';
import { LifeScope, LifeScopeToken } from '../LifeScope';
import { MethodAccessor } from './MethodAccessor';
import { ProviderMatcher } from './ProviderMatcher';
import { ProviderMap, ProviderMapToken } from './providers/index';
import { CacheManager } from './CacheManager';
import { CacheManagerToken } from '../ICacheManager';
import { ProviderMatcherToken } from './IProviderMatcher';
import { MethodAccessorToken } from '../IMethodAccessor';

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

    container.registerSingleton(LifeScopeToken, () => new DefaultLifeScope(container));
    container.registerSingleton(CacheManagerToken, () => new CacheManager(container));
    container.register(ProviderMapToken, () => new ProviderMap(container));
    container.bindProvider(ProviderMap, ProviderMapToken);
    container.registerSingleton(ProviderMatcherToken, () => new ProviderMatcher(container));
    container.registerSingleton(MethodAccessorToken, () => new MethodAccessor(container));

    let lifeScope = container.get(LifeScopeToken);

    lifeScope.registerDecorator(Injectable, CoreActions.bindProvider, CoreActions.cache);
    lifeScope.registerDecorator(Component, CoreActions.bindProvider, CoreActions.cache, CoreActions.componentBeforeInit, CoreActions.componentInit, CoreActions.componentAfterInit);
    lifeScope.registerDecorator(Singleton, CoreActions.bindProvider);
    lifeScope.registerDecorator(Abstract, CoreActions.bindProvider, CoreActions.cache);
    lifeScope.registerDecorator(AutoWired, CoreActions.bindParameterType, CoreActions.bindPropertyType);
    lifeScope.registerDecorator(Inject, CoreActions.bindParameterType, CoreActions.bindPropertyType);
    lifeScope.registerDecorator(Param, CoreActions.bindParameterType, CoreActions.bindPropertyType);
    lifeScope.registerDecorator(Method, CoreActions.bindParameterProviders);

    lifeScope.registerDecorator(Autorun, CoreActions.autorun);
    lifeScope.registerDecorator(IocExt, CoreActions.autorun, CoreActions.componentBeforeInit, CoreActions.componentInit, CoreActions.componentAfterInit);

    container.register(Date, () => new Date());
    container.register(String, () => '');
    container.register(Number, () => Number.NaN);
    container.register(Boolean, () => undefined);

}
