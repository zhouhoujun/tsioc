import { IIocContainer, IocContainerToken, ContainerFactoryToken } from './IIocContainer';
import { TypeReflects } from './services/TypeReflects';
import { TypeReflectsToken } from './services/ITypeReflects';
import { MethodAccessorToken } from './IMethodAccessor';
import { IocSingletonManager } from './actions/IocSingletonManager';
import { ActionRegisterer } from './actions/ActionRegisterer';
import { RuntimeRegisterer, DesignRegisterer } from './actions/DecoratorsRegisterer';
import { IocCacheManager } from './actions/IocCacheManager';
import { ProviderMap } from './providers/ProviderMap';
import { ProviderParser } from './providers/ProviderParser';
import { DecoratorProvider } from './services/DecoratorProvider';
import { MethodAccessor } from './actions/MethodAccessor';
import { DesignLifeScope } from './actions/DesignLifeScope';
import { RuntimeLifeScope } from './actions/RuntimeLifeScope';
import { ResolveLifeScope } from './actions/ResolveLifeScope';

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
    container.bindProvider(TypeReflectsToken, TypeReflects);

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
