import { IIocContainer, IocContainerToken, ContainerProxyToken, ContainerProxy } from './IIocContainer';
import { TypeReflects } from './services/TypeReflects';
import { TypeReflectsToken } from './services/ITypeReflects';
import { MethodAccessorToken, INVOKED_PROVIDERS } from './IMethodAccessor';
import { ActionInjector } from './actions/ActionInjector';
import { RuntimeRegisterer, DesignRegisterer } from './actions/DecoratorsRegisterer';
import { Injector, InjectorProvider, InvokedProviders } from './Injector';
import { DecoratorProvider } from './services/DecoratorProvider';
import { MethodAccessor } from './actions/MethodAccessor';
import { DesignLifeScope } from './actions/DesignLifeScope';
import { RuntimeLifeScope } from './actions/RuntimeLifeScope';
import { ResolveLifeScope } from './actions/ResolveLifeScope';
import { PROVIDERS, InjectorProxyToken, InjectorFactoryToken } from './IInjector';
import { ActionInjectorToken } from './actions/Action';

/**
 * register core for container.
 *
 * @export
 * @param {IIocContainer} container
 */
export function registerCores(container: IIocContainer) {
    let fac = container.getInstance(InjectorProxyToken) as ContainerProxy;
    container.set(IocContainerToken, fac);
    container.setValue(ContainerProxyToken, fac);
    container.setValue(TypeReflectsToken, new TypeReflects(fac), TypeReflects);

    container.set(InjectorFactoryToken, () => new Injector(fac), Injector);
    container.set(PROVIDERS, () => new InjectorProvider(fac), InjectorProvider);
    container.set(INVOKED_PROVIDERS, () => new InvokedProviders(fac), InvokedProviders);
    container.setValue(MethodAccessorToken, new MethodAccessor(), MethodAccessor);

    let actInjector = new ActionInjector(fac);
    container.setValue(ActionInjectorToken, actInjector, ActionInjector);

    actInjector.setValue(RuntimeRegisterer, new RuntimeRegisterer(actInjector));
    actInjector.setValue(DesignRegisterer, new DesignRegisterer(actInjector));
    actInjector.setValue(DecoratorProvider, new DecoratorProvider(fac));

    // bing action.
    actInjector
        .regAction(DesignLifeScope)
        .regAction(RuntimeLifeScope)
        .regAction(ResolveLifeScope);

}
