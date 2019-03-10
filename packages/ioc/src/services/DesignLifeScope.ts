import { LifeScope } from './LifeScope';
import { IIocContainer } from '../IIocContainer';
import {
    BindProviderAction, MethodAutorunAction, IocSetCacheAction,
    ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction,
    InitReflectAction, RegisterActionContext
} from '../actions';
import { DecoratorRegisterer } from './DecoratorRegisterer';
import {
    Autorun, Singleton, Injectable,
    Component, Providers, Refs, Abstract
} from '../decorators';

/**
 * life scope of design.
 *
 * @export
 * @class DesignLifeScope
 * @extends {LifeScope}
 */
export class DesignLifeScope extends LifeScope<RegisterActionContext> {
    constructor() {
        super();
    }

    registerDefault(container: IIocContainer) {
        if (!container.hasRegister(InitReflectAction)) {
            container.registerSingleton(InitReflectAction, () => new InitReflectAction(container));
        }
        container.registerSingleton(BindProviderAction, () => new BindProviderAction(container));
        container.registerSingleton(MethodAutorunAction, () => new MethodAutorunAction(container));

        let decRgr = container.resolve(DecoratorRegisterer);

        decRgr.register(Injectable, BindProviderAction, IocSetCacheAction);
        decRgr.register(Component, BindProviderAction, IocSetCacheAction, ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction);
        decRgr.register(Singleton, BindProviderAction);
        decRgr.register(Providers, BindProviderAction);
        decRgr.register(Refs, BindProviderAction);
        decRgr.register(Abstract, BindProviderAction);
        decRgr.register(Autorun, MethodAutorunAction);

        this.use(InitReflectAction)
            .use(BindProviderAction)
            .use(MethodAutorunAction);
    }
}
