import { IContainer, ContainerToken } from './IContainer';
import {
    RefServiceResolver, ServiceResolver, ServicesResolver,
    MetaAccessor, ModuleInjectorManager, SyncModuleInjectorManager,
    ModuelValidate, IocExtModuleValidate, IteratorService, ModuleLoader, ResolverChain, ModuleInjector
} from './services';

export function registerCores(container: IContainer) {

    container.bindProvider(ContainerToken, () => container);
    container.registerSingleton(IteratorService, () => new IteratorService(container));
    container.registerSingleton(MetaAccessor, () => new MetaAccessor());

    container.registerSingleton(ModuleLoader, () => new ModuleLoader());
    container.registerSingleton(ModuelValidate, () => new ModuelValidate());
    container.registerSingleton(RefServiceResolver, () => new RefServiceResolver(container));
    container.registerSingleton(ResolverChain, () => new ResolverChain(container));
    container.registerSingleton(ServiceResolver, () => new ServiceResolver(container));
    container.registerSingleton(ServicesResolver, () => new ServicesResolver(container));

    container.registerSingleton(ModuleInjectorManager, () => new ModuleInjectorManager());
    container.registerSingleton(SyncModuleInjectorManager, () => new SyncModuleInjectorManager());

    container.registerSingleton(IocExtModuleValidate, () => new IocExtModuleValidate());

    container.resolve(ModuleInjectorManager)
        .first(ModuleInjector)
}
