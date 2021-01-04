import { IContainer } from '../IContainer';
import { Provider, InvokedProvider, getProvider } from '../injector';
import { MethodAccessor } from '../actions/accessor';
import { INJECTOR_FACTORY, METHOD_ACCESSOR, PROVIDERS, INVOKED_PROVIDERS, CONTAINER, PARENT_INJECTOR, INJECTOR } from './tk';
import { DesignLifeScope } from '../actions/design';
import { RuntimeLifeScope } from '../actions/runtime';
import { ResolveLifeScope } from '../actions/resolve';
import { InjectorImpl } from '../container';
import { ProviderType } from '../tokens';
import { IProvider } from '../IInjector';



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
    container.set(INJECTOR_FACTORY, (...providers: ProviderType[]) => {
        const pdr = getProvider(container, ...providers);
        return new InjectorImpl(pdr.getValue(PARENT_INJECTOR) ?? pdr.getValue(INJECTOR) ?? container);
    }, InjectorImpl);

    container.set(PROVIDERS, () => {
        const pdr: any = new Provider();
        (pdr as InternalProvider).container = container;
        return pdr;
    }, Provider);

    container.set(INVOKED_PROVIDERS, () => {
        const pdr: any = new InvokedProvider();
        (pdr as InternalProvider).container = container;
        return pdr;
    }, InvokedProvider);

    container.setValue(METHOD_ACCESSOR, new MethodAccessor(), MethodAccessor);

    // bing action.
    container.provider.regAction(
        DesignLifeScope,
        RuntimeLifeScope,
        ResolveLifeScope
    );

}
