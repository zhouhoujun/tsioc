import { IContainer, ContainerToken } from './IContainer';
import {
    ModuleInjectorManager, ModuleLoader, IocExtInjector,
    ServicesResolveLifeScope, ServiceResolveLifeScope, ModuleInjector, ResolveLifeScope
} from './services';
import { IocExt } from './decorators';
import { RuntimeDecoratorRegisterer, IocAutorunAction, DecoratorType, RegisterSingletionAction, DesignDecoratorRegisterer } from '@ts-ioc/ioc';
import {
    InitServiceResolveAction, ResolveRefServiceAction, ResolveServiceScopeAction,
    ResolveServicesScopeAction, ResolvePrivateServiceAction, ResolveServiceInClassChain,
    ResolveDefaultServiceAction, ResolveTargetServiceAction,
    ResovleServicesInTargetAction, ResovleServicesInRaiseAction,
    ResolveServiceTokenAction
} from './actions';


export function registerCores(container: IContainer) {

    container.bindProvider(ContainerToken, () => container);
    container.register(ModuleLoader);
    container.register(IocExtInjector);
    container.register(ModuleInjector);
    container.register(ModuleInjectorManager);

    container.register(ResolveLifeScope);

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
    decRgr.register(IocExt, DecoratorType.Class, RegisterSingletionAction);

    let desingRgr = container.get(DesignDecoratorRegisterer);
    desingRgr.register(IocExt, DecoratorType.Class, IocAutorunAction);

}
