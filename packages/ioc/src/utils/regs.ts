import { IIocContainer } from '../IIocContainer';
import { TypeReflects } from '../services/TypeReflects';
import { ActionInjector } from '../actions/injector';
import { RuntimeRegisterer, DesignRegisterer } from '../actions/reg';
import { Injector, ProviderInjector, InvokedProvider } from '../Injector';
import { DecoratorProvider } from '../services/decor-pdr';
import { MethodAccessor } from '../actions/accessor';
import { ActionInjectorToken } from '../actions/Action';
import { PROVIDERS, InjectorFactoryToken, MethodAccessorToken, IocContainerToken, INVOKED_PROVIDERS, TypeReflectsToken } from './tk';
import { DesignLifeScope } from '../actions/design';
import { RuntimeLifeScope } from '../actions/runtime';
import { ResolveLifeScope } from '../actions/resolve';

/**
 * register core for container.
 *
 * @export
 * @param {IIocContainer} container
 */
export function registerCores(container: IIocContainer) {
    let fac = container.getProxy();
    container.set(IocContainerToken, fac);
    container.setSingleton(TypeReflectsToken, new TypeReflects(fac), TypeReflects);

    container.set(InjectorFactoryToken, () => new Injector(fac), Injector);
    container.set(PROVIDERS, () => new ProviderInjector(fac), ProviderInjector);
    container.set(INVOKED_PROVIDERS, () => new InvokedProvider(fac), InvokedProvider);
    container.setSingleton(MethodAccessorToken, new MethodAccessor(), MethodAccessor);

    let actInjector = new ActionInjector(fac);
    container.setSingleton(ActionInjectorToken, actInjector, ActionInjector);
    actInjector.setValue(RuntimeRegisterer, new RuntimeRegisterer(actInjector));
    actInjector.setValue(DesignRegisterer, new DesignRegisterer(actInjector));
    actInjector.setValue(DecoratorProvider, new DecoratorProvider(fac));

    // bing action.
    actInjector
        .regAction(DesignLifeScope)
        .regAction(RuntimeLifeScope)
        .regAction(ResolveLifeScope);

}
