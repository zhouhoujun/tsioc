import { IContainer, ContainerToken } from './IContainer';
import { ModuleInjectorManager, IteratorService, ModuleLoader } from './services';
import { IocExt } from './decorators';
import { DecoratorRegisterer, MethodAutorunAction, ResolveLifeScope } from '@ts-ioc/ioc';
import { InitServiceResolveAction, RefServiceResolveAction, ServiceResolveAction, ServicesResolveAction } from './actions';

export function registerCores(container: IContainer) {

    container.bindProvider(ContainerToken, () => container);
    container.register(IteratorService);
    // container.register(ResolverChain);
    container.register(ModuleLoader);
    // container.register(RefServiceResolver);
    // container.register(ServiceResolver);
    // container.register(ServicesResolver);
    container.register(ModuleInjectorManager);

    container.registerSingleton(InitServiceResolveAction, () => new InitServiceResolveAction(container));
    container.registerSingleton(RefServiceResolveAction, () => new RefServiceResolveAction(container));
    container.registerSingleton(ServiceResolveAction, () => new ServiceResolveAction(container));
    container.registerSingleton(ServicesResolveAction, () => new ServicesResolveAction(container));

    let resolveLifeScope = container.resolve(ResolveLifeScope);
    resolveLifeScope
        .use(ServiceResolveAction, true)
        .use(RefServiceResolveAction, true)
        .use(ServicesResolveAction, true)
        .use(InitServiceResolveAction, true);



    let decRgr = container.resolve(DecoratorRegisterer);
    decRgr.register(IocExt, MethodAutorunAction);

    container.resolve(ModuleInjectorManager).setup(container);
}
