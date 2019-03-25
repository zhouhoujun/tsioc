import { IIocContainer, IocContainerToken } from './IIocContainer';
import {
    MethodAccessor, DesignLifeScope, RuntimeLifeScope,
    TypeReflects, IocCacheManager, IocSingletonManager, MetadataService
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

    container.resolve(DesignLifeScope).setup(container);
    container.resolve(RuntimeLifeScope).setup(container);

    container.register(Date, () => new Date());
    container.register(String, () => '');
    container.register(Number, () => Number.NaN);
    container.register(Boolean, () => undefined);
    container.register(Array, () => []);

}
