import { IContainer, ContainerToken } from './IContainer';
import {
    RefServiceResolver, ServiceResolver, ServicesResolver,
    ModuleInjectorManager, IteratorService, ModuleLoader
} from './services';
import { IocExt } from './decorators';
import { DecoratorRegisterer, MethodAutorunAction } from '@ts-ioc/ioc';

export function registerCores(container: IContainer) {

    container.bindProvider(ContainerToken, () => container);
    container.register(IteratorService);
    // container.register(ResolverChain);
    container.register(ModuleLoader);
    container.register(RefServiceResolver);
    container.register(ServiceResolver);
    container.register(ServicesResolver);
    container.register(ModuleInjectorManager);

    let decRgr = container.resolve(DecoratorRegisterer);
    decRgr.register(IocExt, MethodAutorunAction);

    container.resolve(ModuleInjectorManager).setup(container);
}
