import { IIocContainer, IocContainerToken, ContainerFactoryToken } from './IIocContainer';
import {
    MethodAccessor, DesignLifeScope, RuntimeLifeScope,
    TypeReflects, IocCacheManager, IocSingletonManager, MetadataService, ResolveLifeScope
} from './services';
import { ProviderMap, ProviderParser } from './providers';

/**
 * register core for container.
 *
 * @export
 * @param {IIocContainer} container
 */
export function registerCores(container: IIocContainer) {
    container.bindProvider(IocContainerToken, container);
    container.bindProvider(ContainerFactoryToken, () => () => container);
    container.bindProvider(IocSingletonManager, new IocSingletonManager(container));

    container.registerSingleton(TypeReflects, () => new TypeReflects());
    container.registerSingleton(IocCacheManager, () => new IocCacheManager(container));
    container.register(ProviderMap, () => new ProviderMap(container));
    container.registerSingleton(ProviderParser, () => new ProviderParser(container));
    container.registerSingleton(MetadataService, () => new MetadataService());
    container.registerSingleton(MethodAccessor, () => new MethodAccessor());

    // bing action.
    container.registerSingleton(DesignLifeScope, () => new DesignLifeScope(container));
    container.registerSingleton(RuntimeLifeScope, () => new RuntimeLifeScope(container));
    container.registerSingleton(ResolveLifeScope, () => new ResolveLifeScope(container));

    container.get(DesignLifeScope).setup();
    container.get(RuntimeLifeScope).setup();
    container.get(ResolveLifeScope).setup()

    container.register(Date, () => new Date());
    container.register(String, () => '');
    container.register(Number, () => Number.NaN);
    container.register(Boolean, () => undefined);
    container.register(Array, () => []);

}
