import { IContainer } from '../IContainer';
import { ProviderType } from '../tokens';
import { INVOKER, PROVIDERS, INVOKED_PROVIDERS, CONTAINER, PARENT_INJECTOR } from './tk';
import { Strategy } from '../strategy';
import { Provider, InvokedProvider } from '../injector';
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
    container.setValue(INVOKER, new InvokerImpl());

    container.set(PROVIDERS, () => new Provider(container), Provider);

    container.set(INVOKED_PROVIDERS, () => new InvokedProvider(container), InvokedProvider);

    // bing action.
    container.action().regAction(
        DesignLifeScope,
        RuntimeLifeScope
    );

}
