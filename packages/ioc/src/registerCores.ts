import { IIocContainer, IocContainerToken, ContainerProxyToken, ContainerProxy } from './IIocContainer';
import { TypeReflects } from './services/TypeReflects';
import { TypeReflectsToken, TypeReflectsProxy } from './services/ITypeReflects';
import { MethodAccessorToken } from './IMethodAccessor';
import { ActionInjector } from './actions/ActionInjector';
import { RuntimeRegisterer, DesignRegisterer } from './actions/DecoratorsRegisterer';
import { Injector, InjectorProvider } from './Injector';
import { ProviderParser } from './providers/ProviderParser';
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
    let fac = container.get(InjectorProxyToken) as ContainerProxy;
    container.set(IocContainerToken, fac);
    container.registerValue(ContainerProxyToken, fac);
    let reflects = new TypeReflects(fac);
    container.registerValue(TypeReflectsToken, reflects, TypeReflects);
    container.registerValue(TypeReflectsProxy, () => reflects);

    container.set(InjectorFactoryToken, () => new Injector(fac), Injector);
    container.set(PROVIDERS, () => new InjectorProvider(fac), InjectorProvider);
    container.registerValue(ProviderParser, new ProviderParser(container));
    container.registerValue(MethodAccessorToken, new MethodAccessor(), MethodAccessor);

    let actInjector = new ActionInjector(fac);
    container.registerValue(ActionInjectorToken, actInjector, ActionInjector);

    actInjector.registerValue(RuntimeRegisterer, new RuntimeRegisterer(actInjector));
    actInjector.registerValue(DesignRegisterer, new DesignRegisterer(actInjector));
    actInjector.registerValue(DecoratorProvider, new DecoratorProvider(container));

    // bing action.
    actInjector
        .regAction(DesignLifeScope)
        .regAction(RuntimeLifeScope)
        .regAction(ResolveLifeScope);

}
