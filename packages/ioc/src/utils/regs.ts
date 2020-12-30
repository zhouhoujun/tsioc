import { TypeReflects } from '../services/TypeReflects';
import { RuntimeRegisterer, DesignRegisterer } from '../actions/reg';
import { DecoratorProvider } from '../services/decor-pdr';
import { MethodAccessor } from '../actions/accessor';
import { ActionInjectorToken } from '../actions/Action';
import { PROVIDERS, INVOKED_PROVIDERS, TypeReflectsToken, CONTAINER, INJECTOR_FACTORY, METHOD_ACCESSOR } from './tk';
import { DesignLifeScope } from '../actions/design';
import { RuntimeLifeScope } from '../actions/runtime';
import { ResolveLifeScope } from '../actions/resolve';
import { IContainer } from '../IContainer';
import { InjectorImpl } from '../container';
import { InvokedProvider, Provider } from '../injector';

/**
 * register core for container.
 *
 * @export
 * @param {IIocContainer} container
 */
export function registerCores(container: IContainer) {
    container.setValue(CONTAINER, container);
    container.setValue(TypeReflectsToken, new TypeReflects(container), TypeReflects);

    container.set(INJECTOR_FACTORY, () => new InjectorImpl(container), InjectorImpl);
    container.set(PROVIDERS, () => new Provider(container), Provider);
    container.set(INVOKED_PROVIDERS, () => new InvokedProvider(container), InvokedProvider);
    
    const actInjector = container.provider;
    container.setValue(ActionInjectorToken, actInjector);
    container.setValue(METHOD_ACCESSOR, new MethodAccessor(), MethodAccessor);
    actInjector.setValue(RuntimeRegisterer, new RuntimeRegisterer(actInjector));
    actInjector.setValue(DesignRegisterer, new DesignRegisterer(actInjector));
    actInjector.setValue(DecoratorProvider, new DecoratorProvider(container));

    // bing action.
    actInjector
        .regAction(DesignLifeScope)
        .regAction(RuntimeLifeScope)
        .regAction(ResolveLifeScope);

}
