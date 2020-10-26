import { IIocContainer } from '../IIocContainer';
import { ActionInjector } from '../actions/injector';
import { RuntimeRegisterer, DesignRegisterer } from '../actions/reg';
import { Injector, ContextProvider, InvokedProvider } from '../Injector';
import { DecoratorProvider } from '../services/decor-pdr';
import { MethodAccessor } from '../actions/accessor';
import { ActionInjectorToken } from '../actions/act';
import { INJECTOR_FACTORY, METHOD_ACCESSOR, IOC_CONTAINER, PROVIDERS, INVOKED_PROVIDERS, REGISTERED } from './tk';
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
    container.set(IOC_CONTAINER, fac);
    container.setValue(REGISTERED, new Map());

    container.set(INJECTOR_FACTORY, () => new Injector(fac), Injector);
    container.set(PROVIDERS, () => new ContextProvider(fac), ContextProvider);
    container.set(INVOKED_PROVIDERS, () => new InvokedProvider(fac), InvokedProvider);
    container.setValue(METHOD_ACCESSOR, new MethodAccessor(), MethodAccessor);

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
