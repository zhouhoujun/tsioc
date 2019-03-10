import { IContainer, ContainerToken } from './IContainer';
import { ModuleInjectorManager, IteratorService, ModuleLoader } from './services';
import { IocExt } from './decorators';
import { DecoratorRegisterer, MethodAutorunAction, ResolveLifeScope, IocDefaultResolveAction } from '@ts-ioc/ioc';
import {
    InitServiceResolveAction, ResolveRefServiceAction, ResolveServiceAction,
    ResolveServicesAction, ResolvePrivateServiceAction, ResolveServiceInClassChain, ResolveDefaultServiceAction
} from './actions';


export function registerCores(container: IContainer) {

    container.bindProvider(ContainerToken, () => container);
    container.register(IteratorService);
    container.register(ModuleLoader);

    container.register(ModuleInjectorManager);

    container.register(ResolveServiceAction);
    container.register(InitServiceResolveAction);
    container.register(ResolveRefServiceAction);
    container.register(ResolveServicesAction);
    container.register(ResolvePrivateServiceAction);
    container.register(ResolveServiceInClassChain);
    container.register(ResolveDefaultServiceAction);

    let resolveLifeScope = container.resolve(ResolveLifeScope);
    resolveLifeScope
        .use(ResolveServiceAction, true);

    container.resolve(ResolveRefServiceAction)
        .use(ResolvePrivateServiceAction)
        .use(IocDefaultResolveAction);

    container.resolve(ResolveServiceInClassChain)
        .use(ResolveRefServiceAction)
        .use(ResolvePrivateServiceAction)
        .use(IocDefaultResolveAction);

    container.resolve(ResolveServiceAction)
        .use(InitServiceResolveAction)
        .use(ResolveServicesAction)
        .use(ResolveRefServiceAction)
        .use(ResolvePrivateServiceAction)
        .use(IocDefaultResolveAction)
        .use(ResolveServiceInClassChain)
        .use(ResolveDefaultServiceAction);



    let decRgr = container.resolve(DecoratorRegisterer);
    decRgr.register(IocExt, MethodAutorunAction);

    container.resolve(ModuleInjectorManager).setup(container);
}
