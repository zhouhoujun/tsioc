import { IContainer, ContainerToken } from './IContainer';
import { ModuleInjectorManager, ModuleLoader } from './services';
import { IocExt } from './decorators';
import { DecoratorRegisterer, MethodAutorunAction, ResolveLifeScope, BindProviderAction, DesignLifeScope } from '@ts-ioc/ioc';
import {
    InitServiceResolveAction, ResolveRefServiceAction, ResolveServiceAction,
    ResolveServicesAction, ResolvePrivateServiceAction, ResolveServiceInClassChain,
    ResolveDefaultServiceAction, DefaultResolveServiceAction, ResolveTargetServiceAction,
    IocExtRegisterAction, ResovleServicesInTargetAction, ResovleServicesInRaiseAction
} from './actions';


export function registerCores(container: IContainer) {

    container.bindProvider(ContainerToken, () => container);
    container.register(ModuleLoader);

    container.register(ModuleInjectorManager);

    if (!container.has(MethodAutorunAction)) {
        container.register(MethodAutorunAction);
    }

    container.register(InitServiceResolveAction);
    container.register(DefaultResolveServiceAction);
    container.register(ResolveRefServiceAction);
    container.register(ResolvePrivateServiceAction);
    container.register(ResolveDefaultServiceAction);

    container.register(ResolveServiceAction);
    container.register(ResolveServiceInClassChain);
    container.register(ResolveTargetServiceAction);

    container.register(IocExtRegisterAction);

    container.register(ResolveServicesAction);
    container.register(ResovleServicesInTargetAction);
    container.register(ResovleServicesInRaiseAction);


    let resolveLifeScope = container.get(ResolveLifeScope);
    resolveLifeScope
        .use(ResolveServiceAction, true)
        .use(ResolveServicesAction, true);


    container.get(DesignLifeScope)
        .use(IocExtRegisterAction);

    let decRgr = container.get(DecoratorRegisterer);
    decRgr.register(IocExt, BindProviderAction, IocExtRegisterAction);

}
