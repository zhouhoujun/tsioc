import { IIocContainer, IocContainerToken } from './IIocContainer';
import { MethodAccessor, DesignLifeScope, RuntimeLifeScope, DecoratorRegisterer, TypeReflects, IocCacheManager, IocSingletonManager } from './services';
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
    // bing action.
    container.registerSingleton(DecoratorRegisterer, () => new DecoratorRegisterer());
    container.registerSingleton(DesignLifeScope, () => new DesignLifeScope());
    container.registerSingleton(RuntimeLifeScope, () => new RuntimeLifeScope());
    container.register(ProviderMap, () => new ProviderMap(container));
    container.registerSingleton(ProviderParser, () => new ProviderParser(container));
    container.registerSingleton(MethodAccessor, () => new MethodAccessor());

    container.resolve(DesignLifeScope).registerDefault(container);
    container.resolve(RuntimeLifeScope).registerDefault(container);

    container.register(Date, () => new Date());
    container.register(String, () => '');
    container.register(Number, () => Number.NaN);
    container.register(Boolean, () => undefined);
    container.register(Array, () => []);

}
