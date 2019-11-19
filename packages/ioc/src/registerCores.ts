import { IIocContainer, IocContainerToken, ContainerFactoryToken } from './IIocContainer';
import { TypeReflects, DecoratorProvider } from './services';
import { ProviderMap, ProviderParser } from './providers';
import {
    MethodAccessor, DesignLifeScope, RuntimeLifeScope, IocCacheManager,
    IocSingletonManager, ResolveLifeScope, ActionRegisterer, RuntimeRegisterer, DesignRegisterer
} from './actions';
import { MethodAccessorToken } from './IMethodAccessor';

/**
 * register core for container.
 *
 * @export
 * @param {IIocContainer} container
 */
export function registerCores(container: IIocContainer) {
    let fac = () => container;
    container.bindProvider(IocContainerToken, fac);
    container.bindProvider(ContainerFactoryToken, () => fac);
    container.bindProvider(IocSingletonManager, new IocSingletonManager(container));
    container.registerSingleton(ActionRegisterer, () => new ActionRegisterer());
    container.registerSingleton(RuntimeRegisterer, () => new RuntimeRegisterer(container));
    container.registerSingleton(DesignRegisterer, () => new DesignRegisterer(container));

    container.registerSingleton(TypeReflects, () => new TypeReflects(container));
    container.registerSingleton(IocCacheManager, () => new IocCacheManager(container));
    container.register(ProviderMap, () => new ProviderMap(fac));
    container.registerSingleton(ProviderParser, () => new ProviderParser(container));
    container.registerSingleton(DecoratorProvider, () => new DecoratorProvider(container));
    container.registerSingleton(MethodAccessor, () => new MethodAccessor());
    container.bindProvider(MethodAccessorToken, MethodAccessor);

    // bing action.
    container.getInstance(ActionRegisterer)
        .register(container, DesignLifeScope, true)
        .register(container, RuntimeLifeScope, true)
        .register(container, ResolveLifeScope, true);

}
