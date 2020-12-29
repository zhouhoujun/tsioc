import { IContainer } from '../IContainer';
import { Provider, InvokedProvider } from '../injector';
import { MethodAccessor } from '../actions/accessor';
import { INJECTOR_FACTORY, METHOD_ACCESSOR, PROVIDERS, INVOKED_PROVIDERS, CONTAINER } from './tk';
import { DesignLifeScope } from '../actions/design';
import { RuntimeLifeScope } from '../actions/runtime';
import { ResolveLifeScope } from '../actions/resolve';
import { InjectorImpl } from '../container';

/**
 * register core for container.
 *
 * @export
 * @param {IContainer} container
 */
export function registerCores(container: IContainer) {

    container.setValue(CONTAINER, container);
    container.set(INJECTOR_FACTORY, () => new InjectorImpl(container), InjectorImpl);
    container.set(PROVIDERS, () => new Provider(container), Provider);
    container.set(INVOKED_PROVIDERS, () => new InvokedProvider(container), InvokedProvider);
    container.setValue(METHOD_ACCESSOR, new MethodAccessor(), MethodAccessor);

    // bing action.
    container.provider.regAction(
        DesignLifeScope,
        RuntimeLifeScope,
        ResolveLifeScope
    );

}
