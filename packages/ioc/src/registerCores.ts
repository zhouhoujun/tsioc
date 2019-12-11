import { IIocContainer, IocContainerToken, ContainerFactoryToken } from './IIocContainer';
import { TypeReflects } from './services/TypeReflects';
import { TypeReflectsToken } from './services/ITypeReflects';
import { MethodAccessorToken } from './IMethodAccessor';
import { ActionRegisterer } from './actions/ActionRegisterer';
import { RuntimeRegisterer, DesignRegisterer } from './actions/DecoratorsRegisterer';
import { Injector } from './Injector';
import { ProviderParser } from './providers/ProviderParser';
import { DecoratorProvider } from './services/DecoratorProvider';
import { MethodAccessor } from './actions/MethodAccessor';
import { DesignLifeScope } from './actions/DesignLifeScope';
import { RuntimeLifeScope } from './actions/RuntimeLifeScope';
import { ResolveLifeScope } from './actions/ResolveLifeScope';
import { InjectorToken } from './IInjector';
import { ActionInjectorToken } from './actions/Action';

/**
 * register core for container.
 *
 * @export
 * @param {IIocContainer} container
 */
export function registerCores(container: IIocContainer) {
    let fac = () => container;
    container.bindProvider(IocContainerToken, fac);
    container.bindProvider(ContainerFactoryToken, () => fac);

    let register = new ActionRegisterer(fac);
    container.registerSingleton(ActionRegisterer, register);
    container.bindProvider(ActionInjectorToken, ActionRegisterer);
    register.bindProvider(RuntimeRegisterer, new RuntimeRegisterer(register));
    register.bindProvider(DesignRegisterer, new DesignRegisterer(register));

    container.registerSingleton(TypeReflects, () => new TypeReflects(container));
    container.bindProvider(TypeReflectsToken, TypeReflects);

    container.register(Injector, () => new Injector(fac));
    container.bindProvider(InjectorToken, Injector);
    container.registerSingleton(ProviderParser, () => new ProviderParser(container));
    container.registerSingleton(DecoratorProvider, () => new DecoratorProvider(container));
    container.registerSingleton(MethodAccessor, () => new MethodAccessor());
    container.bindProvider(MethodAccessorToken, MethodAccessor);

    // bing action.
    container.getInstance(ActionRegisterer)
        .register(DesignLifeScope)
        .register(RuntimeLifeScope)
        .register(ResolveLifeScope);

}
