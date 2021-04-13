import { IContainer } from '../IContainer';
import { ProviderType } from '../tokens';
import { INJECTOR_FACTORY, INVOKER, PROVIDERS, INVOKED_PROVIDERS, CONTAINER, PARENT_INJECTOR } from './tk';
import { Strategy } from '../strategy';
import { Provider, InvokedProvider, getProvider } from '../injector';
import { InvokerImpl } from '../actions/invoker';
import { DesignLifeScope } from '../actions/design';
import { RuntimeLifeScope } from '../actions/runtime';
import { InjectorImpl } from '../container';


/**
 * register core for container.
 *
 * @export
 * @param {IContainer} container
 */
export function registerCores(container: IContainer) {

    container.setValue(CONTAINER, container);
    container.setValue(INVOKER, new InvokerImpl(container));

    container.set(PROVIDERS, () => new Provider(container), Provider);

    container.set(INVOKED_PROVIDERS, () => new InvokedProvider(container), InvokedProvider);

    container.set(INJECTOR_FACTORY, (...providers: ProviderType[]) => {
        const pdr = getProvider(container, ...providers);
        return new InjectorImpl(pdr.getValue(PARENT_INJECTOR) ?? container, pdr.get(Strategy));
    }, InjectorImpl);

    // bing action.
    container.provider.regAction(
        DesignLifeScope,
        RuntimeLifeScope
    );

}
