import { IContainer, ContainerToken } from './IContainer';
import {
    ModuleLoader, ServicesResolveLifeScope, ServiceResolveLifeScope,
    InjectorLifeScope, ServiceDecoratorRegisterer
} from './services';
import { IocExt } from './decorators';
import {
    RuntimeDecoratorRegisterer, IocAutorunAction, DecoratorScopes,
    RegisterSingletionAction, DesignDecoratorRegisterer
} from '@tsdi/ioc';



export function registerCores(container: IContainer) {

    container.bindProvider(ContainerToken, () => container);
    if (!container.has(ModuleLoader)) {
        container.register(ModuleLoader);
    }
    container.register(InjectorLifeScope);

    container.register(ServiceDecoratorRegisterer);
    container.register(ServiceResolveLifeScope);
    container.register(ServicesResolveLifeScope);

    let decRgr = container.get(RuntimeDecoratorRegisterer);
    decRgr.register(IocExt, DecoratorScopes.Class, RegisterSingletionAction);

    let desingRgr = container.get(DesignDecoratorRegisterer);
    desingRgr.register(IocExt, DecoratorScopes.Class, IocAutorunAction);

}
