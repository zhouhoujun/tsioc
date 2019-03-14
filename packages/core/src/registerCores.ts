import { IContainer, ContainerToken } from './IContainer';
import { ModuleInjectorManager, IteratorService, ModuleLoader } from './services';
import { IocExt } from './decorators';
import { DecoratorRegisterer, MethodAutorunAction, ResolveLifeScope, BindProviderAction, DesignLifeScope } from '@ts-ioc/ioc';
import {
    InitServiceResolveAction, ResolveRefServiceAction, ResolveServiceAction,
    ResolveServicesAction, ResolvePrivateServiceAction, ResolveServiceInClassChain,
    ResolveDefaultServiceAction, DefaultResolveServiceAction, ResolveTargetServiceAction, IocExtRegisterAction
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

    container.register(IocExtRegisterAction);


    let resolveLifeScope = container.resolveToken(ResolveLifeScope);
    resolveLifeScope
        .use(ResolveServiceAction, true);

    container.resolveToken(ResolveTargetServiceAction)
        .use(ResolveRefServiceAction)
        .use(ResolvePrivateServiceAction)
        // .use(DefaultResolveServiceAction)
        .use(ResolveServiceInClassChain);

    container.resolveToken(ResolveServiceInClassChain)
        .use(ResolveRefServiceAction)
        .use(ResolvePrivateServiceAction);
        // .use(DefaultResolveServiceAction);

    container.resolveToken(ResolveServiceAction)
        .use(InitServiceResolveAction)
        .use(ResolveServicesAction)
        .use(ResolveTargetServiceAction)
        .use(DefaultResolveServiceAction)
        .use(ResolveDefaultServiceAction);

    container.resolveToken(DesignLifeScope)
        .use(IocExtRegisterAction);

    let decRgr = container.resolveToken(DecoratorRegisterer);
    decRgr.register(IocExt, BindProviderAction, IocExtRegisterAction);

    container.resolveToken(ModuleInjectorManager).setup(container);
}
