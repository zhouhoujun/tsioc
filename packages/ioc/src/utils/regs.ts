import { IIocContainer } from '../IIocContainer';
import { Provider } from '../injector';
import { MethodAccessor } from '../actions/accessor';
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
    container.set(PROVIDERS, () => new Provider(container, 'ctx'), Provider);
    container.set(INVOKED_PROVIDERS, () => new Provider(container, 'invoked'), Provider);
    container.setValue(METHOD_ACCESSOR, new MethodAccessor(), MethodAccessor);

    // bing action.
    container.provider
        .regAction(DesignLifeScope)
        .regAction(RuntimeLifeScope)
        .regAction(ResolveLifeScope);

}
