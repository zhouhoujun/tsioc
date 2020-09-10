import { IIocContainer, IocContainerToken } from './IIocContainer';
import { TypeReflects } from './services/TypeReflects';
import { TypeReflectsToken } from './services/ITypeReflects';
import { MethodAccessorToken, INVOKED_PROVIDERS } from './IMethodAccessor';
import { ActionInjector } from './actions/ActionInjector';
import { RuntimeRegisterer, DesignRegisterer } from './actions/IocRegAction';
import { Injector, ProviderInjector, InvokedProvider } from './Injector';
import { DecoratorProvider } from './services/DecoratorProvider';
import { MethodAccessor } from './actions/MethodAccessor';
import { RuntimeLifeScope } from './actions/LifeScope';
import { ResolveLifeScope } from './actions/ResolveLifeScope';
import { PROVIDERS, InjectorFactoryToken } from './IInjector';
import { ActionInjectorToken } from './actions/Action';
import { DesignLifeScope } from './actions/DesignLifeScope';

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
