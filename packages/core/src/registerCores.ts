import { IContainer, ContainerToken } from './IContainer';
import {
    RefServiceResolver, ServiceResolver, ServicesResolver,
    MetaAccessor, ModuleInjectorManager, IteratorService, ModuleLoader
} from './services';

export function registerCores(container: IContainer) {

    container.bindProvider(ContainerToken, () => container);
    container.registerSingleton(IteratorService, () => new IteratorService(container));
    container.registerSingleton(MetaAccessor, () => new MetaAccessor());

    container.registerSingleton(ModuleLoader, () => new ModuleLoader());
    container.registerSingleton(RefServiceResolver, () => new RefServiceResolver(container));
    container.registerSingleton(ServiceResolver, () => new ServiceResolver(container));
    container.registerSingleton(ServicesResolver, () => new ServicesResolver(container));

    container.registerSingleton(ModuleInjectorManager, () => new ModuleInjectorManager());
    container.resolve(ModuleInjectorManager).registerDefault(container);
}
