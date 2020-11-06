import { IIocContainer } from '../IIocContainer';
import { ActionInjector } from '../actions/injector';
import { ContextProvider, InvokedProvider } from '../injector';
import { MethodAccessor } from '../actions/accessor';
import { ACTION_PROVIDER } from '../actions/act';
import { INJECTOR_FACTORY, METHOD_ACCESSOR, PROVIDERS, INVOKED_PROVIDERS, IOC_CONTAINER } from './tk';
import { DesignLifeScope } from '../actions/design';
import { RuntimeLifeScope } from '../actions/runtime';
import { ResolveLifeScope } from '../actions/resolve';
import { InjectorImpl } from '../container';

/**
 * register core for container.
 *
 * @export
 * @param {IIocContainer} container
 */
export function registerCores(container: IIocContainer) {

    container.setValue(IOC_CONTAINER, container);
    container.set(INJECTOR_FACTORY, () => new InjectorImpl(container), InjectorImpl);
    container.set(PROVIDERS, () => new ContextProvider(container), ContextProvider);
    container.set(INVOKED_PROVIDERS, () => new InvokedProvider(container), InvokedProvider);
    container.setValue(METHOD_ACCESSOR, new MethodAccessor(), MethodAccessor);

    let actInjector = new ActionInjector(container);
    container.setValue(ACTION_PROVIDER, actInjector, ActionInjector);

    // bing action.
    actInjector
        .regAction(DesignLifeScope)
        .regAction(RuntimeLifeScope)
        .regAction(ResolveLifeScope);

}
