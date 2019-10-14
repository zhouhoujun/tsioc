import { IIocContainer, IocContainerToken, ContainerFactoryToken } from './IIocContainer';
import { TypeReflects, DecoratorProvider } from './services';
import { ProviderMap, ProviderParser } from './providers';
import {
    MethodAccessor, DesignLifeScope, RuntimeLifeScope, IocCacheManager,
    IocSingletonManager, ResolveLifeScope, ActionRegisterer
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

    container.registerSingleton(TypeReflects, () => new TypeReflects(container));
    container.registerSingleton(IocCacheManager, () => new IocCacheManager(container));
    container.register(ProviderMap, () => new ProviderMap(container));
    container.registerSingleton(ProviderParser, () => new ProviderParser(container));
    container.registerSingleton(DecoratorProvider, () => new DecoratorProvider(container));
    container.registerSingleton(MethodAccessor, () => new MethodAccessor());
    container.bindProvider(MethodAccessorToken, MethodAccessor);

    // bing action.
    container.getActionRegisterer()
        .register(container, DesignLifeScope, true)
        .register(container, RuntimeLifeScope, true)
        .register(container, ResolveLifeScope, true);

}
