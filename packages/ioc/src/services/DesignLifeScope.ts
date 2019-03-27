import { IIocContainer } from '../IIocContainer';
import {
    BindProviderAction, DesignActionContext, DesignAnnoationScope,
    InitReflectAction, DesignPropertyScope, DesignMethodScope,
    BindPropertyTypeAction, BindMethodProviderAction, IocAutorunAction, DesignDecoratorAction
} from '../actions';
import { DesignDecoratorRegisterer } from './DecoratorRegisterer';
import {
    Singleton, Injectable, Component, Providers,
    Refs, Inject, AutoWired, Autorun
} from '../decorators';
import { RegisterLifeScope } from './RegisterLifeScope';
import { DecoratorType } from '../factories';

/**
 * life scope of design.
 *
 * @export
 * @class DesignLifeScope
 * @extends {LifeScope}
 */
export class DesignLifeScope extends RegisterLifeScope<DesignActionContext> {

    setup(container: IIocContainer) {

        container.registerSingleton(DesignDecoratorRegisterer, () => new DesignDecoratorRegisterer());
        if (!container.has(InitReflectAction)) {
            container.registerSingleton(InitReflectAction, () => new InitReflectAction(container));
        }
        container.registerSingleton(BindProviderAction, () => new BindProviderAction(container));
        container.registerSingleton(DesignAnnoationScope, () => new DesignAnnoationScope(container));
        container.registerSingleton(DesignPropertyScope, () => new DesignPropertyScope(container));
        container.registerSingleton(DesignMethodScope, () => new DesignMethodScope(container));
        container.registerSingleton(DesignDecoratorAction, () => new DesignDecoratorAction(container))
        container.registerSingleton(BindPropertyTypeAction, () => new BindPropertyTypeAction(container));
        container.registerSingleton(BindMethodProviderAction, () => new BindMethodProviderAction(container));
        container.registerSingleton(IocAutorunAction, () => new IocAutorunAction(container));

        let decRgr = container.get(DesignDecoratorRegisterer);

        decRgr.register(Injectable, DecoratorType.Class, BindProviderAction);
        decRgr.register(Component, DecoratorType.Class, BindProviderAction);
        decRgr.register(Singleton, DecoratorType.Class, BindProviderAction);
        decRgr.register(Providers, DecoratorType.Class, BindProviderAction);
        decRgr.register(Refs, DecoratorType.Class, BindProviderAction);

        decRgr.register(Inject, DecoratorType.Property, BindPropertyTypeAction);
        decRgr.register(AutoWired, DecoratorType.Property, BindPropertyTypeAction);

        decRgr.register(Autorun, DecoratorType.Class, IocAutorunAction);


        container.get(DesignAnnoationScope).setup();
        container.get(DesignPropertyScope).setup();
        container.get(DesignMethodScope).setup();

        this.use(InitReflectAction)
            .use(DesignPropertyScope)
            .use(DesignMethodScope)
            .use(DesignAnnoationScope);
    }
}
