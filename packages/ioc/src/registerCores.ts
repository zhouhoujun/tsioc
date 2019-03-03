import { IIocContainer } from './IIocContainer';
import {
     Injectable, Component, Singleton, Abstract, Autorun, IocExt, Refs, Providers
} from './decorators'
import {  MethodAccessor, DesignLifeScope, RuntimeLifeScope, DecoratorRegisterer } from './services';
import { ProviderMap, ProviderParser } from './providers';

/**
 * register core for container.
 *
 * @export
 * @param {IIocContainer} container
 */
export function registerCores(container: IIocContainer) {
    //bing action.
    container.registerSingleton(DecoratorRegisterer, ()=> new DecoratorRegisterer());
    container.registerSingleton(DesignLifeScope, () => new DesignLifeScope());
    container.registerSingleton(RuntimeLifeScope, () => new RuntimeLifeScope());
    container.register(ProviderMapToken, () => new ProviderMap(container));
    container.bindProvider(ProviderMap, ProviderMapToken);

    container.registerSingleton(ProviderParser, () => new ProviderParser(container));
    container.registerSingleton(MethodAccessor, () => new MethodAccessor());

    let lifeScope = container.get(LifeScopeToken);

    lifeScope.registerDecorator(Injectable, CoreActions.bindProvider, CoreActions.cache);
    lifeScope.registerDecorator(Component, CoreActions.bindProvider, CoreActions.cache, CoreActions.componentBeforeInit, CoreActions.componentInit, CoreActions.componentAfterInit);
    lifeScope.registerDecorator(Singleton, CoreActions.bindProvider);
    lifeScope.registerDecorator(Refs, CoreActions.bindProvider);
    lifeScope.registerDecorator(Providers, CoreActions.bindProvider);
    lifeScope.registerDecorator(Abstract, CoreActions.bindProvider, CoreActions.cache);


    lifeScope.registerDecorator(Autorun, CoreActions.autorun, CoreActions.methodAutorun);
    lifeScope.registerDecorator(IocExt, CoreActions.autorun, CoreActions.componentBeforeInit, CoreActions.componentInit, CoreActions.componentAfterInit);

    container.register(Date, () => new Date());
    container.register(String, () => '');
    container.register(Number, () => Number.NaN);
    container.register(Boolean, () => undefined);
    container.register(Array, () => []);
}
