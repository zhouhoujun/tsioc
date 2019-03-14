import { IContainer, ContainerToken } from './IContainer';
import { ModuleInjectorManager, IteratorService, ModuleLoader } from './services';
import { IocExt } from './decorators';
import { DecoratorRegisterer, MethodAutorunAction, ResolveLifeScope } from '@ts-ioc/ioc';
import {
    InitServiceResolveAction, ResolveRefServiceAction, ResolveServiceAction,
    ResolveServicesAction, ResolvePrivateServiceAction, ResolveServiceInClassChain,
    ResolveDefaultServiceAction, DefaultResolveServiceAction, ResolveTargetServiceAction
} from './actions';


export function registerCores(container: IContainer) {

    container.bindProvider(ContainerToken, () => container);
    container.register(IteratorService);
    container.register(ModuleLoader);

    container.register(ModuleInjectorManager);

    container.register(InitServiceResolveAction);
    container.register(DefaultResolveServiceAction);
    container.register(ResolveRefServiceAction);
    container.register(ResolvePrivateServiceAction);
    container.register(ResolveDefaultServiceAction);

    container.register(ResolveServiceAction);
    container.register(ResolveServiceInClassChain);
    container.register(ResolveServicesAction);
    container.register(ResolveTargetServiceAction);


    let resolveLifeScope = container.resolve(ResolveLifeScope);
    resolveLifeScope
        .use(ResolveServiceAction, true);

    container.resolve(ResolveTargetServiceAction)
        .use(ResolvePrivateServiceAction)
        .use(DefaultResolveServiceAction)
        .use(ResolveServiceInClassChain);

    container.resolve(ResolveServiceInClassChain)
        .use(ResolveRefServiceAction)
        .use(ResolvePrivateServiceAction)
        .use(DefaultResolveServiceAction);

    container.resolve(ResolveServiceAction)
        .use(InitServiceResolveAction)
        .use(ResolveServicesAction)
        .use(ResolveTargetServiceAction)
        .use(DefaultResolveServiceAction)
        .use(ResolveDefaultServiceAction);



    let decRgr = container.resolve(DecoratorRegisterer);
    decRgr.register(IocExt, MethodAutorunAction);

    container.resolve(ModuleInjectorManager).setup(container);
}
