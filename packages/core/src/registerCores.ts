import { IContainer, ContainerToken } from './IContainer';
import {
    ModuleLoader, ServicesResolveLifeScope, ServiceResolveLifeScope,
    InjectorLifeScope
} from './services';
import { IocExt } from './decorators';
import {
    RuntimeDecoratorRegisterer, IocAutorunAction, DecoratorScopes,
    RegisterSingletionAction, DesignDecoratorRegisterer, ResolveLifeScope
} from '@tsdi/ioc';
import {
    InitServiceResolveAction, ResolveRefServiceAction, ResolveServiceScopeAction,
    ResolveServicesScopeAction, ResolvePrivateServiceAction, ResolveServiceInClassChain,
    ResolveDefaultServiceAction, ResolveTargetServiceAction,
    ResovleServicesInTargetAction, ResovleServicesInRaiseAction,
    ResolveServiceTokenAction
} from './resolves';


export function registerCores(container: IContainer) {

    container.bindProvider(ContainerToken, () => container);
    if (!container.has(ModuleLoader)) {
        container.register(ModuleLoader);
    }
    container.register(InjectorLifeScope);

    container.register(InitServiceResolveAction);
    container.register(ResolveServiceTokenAction);
    container.register(ResolveDefaultServiceAction);
    container.register(ResolveRefServiceAction);
    container.register(ResolvePrivateServiceAction);
    container.register(ResolveDefaultServiceAction);
    container.register(ResolveServiceScopeAction);
    container.register(ResolveServiceInClassChain);
    container.register(ResolveTargetServiceAction);
    container.register(ResolveServicesScopeAction);
    container.register(ResovleServicesInTargetAction);
    container.register(ResovleServicesInRaiseAction);

    container.register(ServiceResolveLifeScope);
    container.register(ServicesResolveLifeScope);

    let decRgr = container.get(RuntimeDecoratorRegisterer);
    decRgr.register(IocExt, DecoratorScopes.Class, RegisterSingletionAction);

    let desingRgr = container.get(DesignDecoratorRegisterer);
    desingRgr.register(IocExt, DecoratorScopes.Class, IocAutorunAction);

}
