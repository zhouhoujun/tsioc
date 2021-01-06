import { IProvider } from '../IInjector';
import { IContainer } from '../IContainer';
import { ProviderType } from '../tokens';
import { INJECTOR_FACTORY, METHOD_ACCESSOR, PROVIDERS, INVOKED_PROVIDERS, CONTAINER, PARENT_INJECTOR } from './tk';
import { Provider, InvokedProvider, getProvider, Strategy } from '../injector';
import { MethodAccessor } from '../actions/accessor';
import { DesignLifeScope } from '../actions/design';
import { RuntimeLifeScope } from '../actions/runtime';
import { ResolveLifeScope } from '../actions/resolve';
import { InjectorImpl } from '../container';



interface InternalProvider extends IProvider {
    container: IContainer;
}

/**
 * register core for container.
 *
 * @export
 * @param {IContainer} container
 */
export function registerCores(container: IContainer) {

    container.setValue(CONTAINER, container);
    container.setValue(METHOD_ACCESSOR, new MethodAccessor(container), MethodAccessor);

    container.set(PROVIDERS, () => new Provider(container), Provider);

    container.set(INVOKED_PROVIDERS, () => new InvokedProvider(container), InvokedProvider);

    container.set(INJECTOR_FACTORY, (...providers: ProviderType[]) => {
        const pdr = getProvider(container, ...providers);
        return new InjectorImpl(pdr.getValue(PARENT_INJECTOR) ?? container, pdr.get(Strategy));
    }, InjectorImpl);


    // bing action.
    container.provider.regAction(
        DesignLifeScope,
        RuntimeLifeScope,
        ResolveLifeScope
    );

}
