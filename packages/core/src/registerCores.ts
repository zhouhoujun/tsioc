import { IContainer } from './IContainer';
import { LifeScopeToken } from './LifeScope';
import {
    CacheManager, Injectable, Component, AutoWired, Inject, Singleton, Param, DefaultLifeScope,
    Method, Abstract, Autorun, IocExt, Refs, Providers, CoreActions, MethodAccessor,
    MetaAccessor, MetaAccessorToken,
} from './core';
import { CacheManagerToken } from './ICacheManager';
import { MethodAccessorToken } from './IMethodAccessor';
import { ResolverChain, ResolverChainToken } from './resolves';
import { ProviderMap, ProviderMapToken, ProviderParser, ProviderParserToken } from './providers';

/**
 * register core for container.
 *
 * @export
 * @param {IContainer} container
 */
export function registerCores(container: IContainer) {
    container.registerSingleton(LifeScopeToken, () => new DefaultLifeScope(container));
    container.registerSingleton(CacheManagerToken, () => new CacheManager(container));
    container.registerSingleton(ResolverChainToken, () => new ResolverChain(container));
    container.register(ProviderMapToken, () => new ProviderMap(container));
    container.bindProvider(ProviderMap, ProviderMapToken);
    container.registerSingleton(ProviderParserToken, () => new ProviderParser(container));
    container.registerSingleton(MethodAccessorToken, () => new MethodAccessor(container));
    container.registerSingleton(MetaAccessorToken, MetaAccessor);

    let lifeScope = container.get(LifeScopeToken);

    lifeScope.registerDecorator(Injectable, CoreActions.bindProvider, CoreActions.cache);
    lifeScope.registerDecorator(Component, CoreActions.bindProvider, CoreActions.cache, CoreActions.componentBeforeInit, CoreActions.componentInit, CoreActions.componentAfterInit);
    lifeScope.registerDecorator(Singleton, CoreActions.bindProvider);
    lifeScope.registerDecorator(Refs, CoreActions.bindProvider);
    lifeScope.registerDecorator(Providers, CoreActions.bindProvider);
    lifeScope.registerDecorator(Abstract, CoreActions.bindProvider, CoreActions.cache);
    lifeScope.registerDecorator(AutoWired, CoreActions.bindParameterType, CoreActions.bindPropertyType);
    lifeScope.registerDecorator(Inject, CoreActions.bindParameterType, CoreActions.bindPropertyType);
    lifeScope.registerDecorator(Param, CoreActions.bindParameterType, CoreActions.bindPropertyType);
    lifeScope.registerDecorator(Method, CoreActions.bindParameterProviders);

    lifeScope.registerDecorator(Autorun, CoreActions.autorun, CoreActions.methodAutorun);
    lifeScope.registerDecorator(IocExt, CoreActions.autorun, CoreActions.componentBeforeInit, CoreActions.componentInit, CoreActions.componentAfterInit);

    container.register(Date, () => new Date());
    container.register(String, () => '');
    container.register(Number, () => Number.NaN);
    container.register(Boolean, () => undefined);
    container.register(Array, () => []);
}
