import { IIocContainer, IocContainerToken, ContainerFactoryToken } from './IIocContainer';
import { TypeReflects } from './services/TypeReflects';
import { TypeReflectsToken } from './services/ITypeReflects';
import { MethodAccessorToken } from './IMethodAccessor';
import { ActionInjector } from './actions/ActionInjector';
import { RuntimeRegisterer, DesignRegisterer } from './actions/DecoratorsRegisterer';
import { Injector } from './Injector';
import { ProviderParser } from './providers/ProviderParser';
import { DecoratorProvider } from './services/DecoratorProvider';
import { MethodAccessor } from './actions/MethodAccessor';
import { DesignLifeScope } from './actions/DesignLifeScope';
import { RuntimeLifeScope } from './actions/RuntimeLifeScope';
import { ResolveLifeScope } from './actions/ResolveLifeScope';
import { InjectorFactory } from './IInjector';
import { ActionInjectorToken } from './actions/Action';

/**
 * register core for container.
 *
 * @export
 * @param {IIocContainer} container
 */
export function registerCores(container: IIocContainer) {
    let fac = () => container;
    container.set(IocContainerToken, fac);
    container.registerValue(ContainerFactoryToken, fac);

    let actInjector = new ActionInjector(fac);
    container.registerValue(ActionInjectorToken, actInjector, ActionInjector);

    actInjector.registerValue(RuntimeRegisterer, new RuntimeRegisterer(actInjector));
    actInjector.registerValue(DesignRegisterer, new DesignRegisterer(actInjector));
    actInjector.registerValue(DecoratorProvider, new DecoratorProvider(container));

    container.registerValue(TypeReflectsToken, new TypeReflects(container), TypeReflects);

    let injFactory = () => new Injector(fac);
    container.set(Injector, injFactory);
    container.set(InjectorFactory, injFactory);
    container.registerValue(ProviderParser, new ProviderParser(container));
    container.registerValue(MethodAccessorToken, new MethodAccessor(container), MethodAccessor);

    // bing action.
    container.getInstance(ActionInjector)
        .register(DesignLifeScope)
        .register(RuntimeLifeScope)
        .register(ResolveLifeScope);

}
