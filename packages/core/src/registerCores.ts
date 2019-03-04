import { IContainer, ContainerToken } from './IContainer';
import {
    RefServiceResolver, ServiceResolver, ServicesResolver,
    MetaAccessor, ModuleInjectorManager, SyncModuleInjectorManager,
    ModuelValidate, IocExtModuleValidate
} from './services';

export function registerCores(container: IContainer) {

    container.bindProvider(ContainerToken, () => container);
    container.registerSingleton(RefServiceResolver, () => new RefServiceResolver(container));
    container.registerSingleton(ServiceResolver, () => new ServiceResolver(container));
    container.registerSingleton(ServicesResolver, () => new ServicesResolver(container));
    container.registerSingleton(MetaAccessor, () => new MetaAccessor());

    container.registerSingleton(ModuleInjectorManager, () => new ModuleInjectorManager());
    container.registerSingleton(SyncModuleInjectorManager, () => new SyncModuleInjectorManager());

    container.registerSingleton(ModuelValidate, () => new ModuelValidate());
    container.registerSingleton(IocExtModuleValidate, () => new IocExtModuleValidate());

}