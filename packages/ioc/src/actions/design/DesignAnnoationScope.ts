import { DecoratorType } from '../../factories';
import { DesignDecoratorScope } from './DesignDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { DesignActionContext } from './DesignActionContext';
import { IIocContainer } from '../../IIocContainer';
import { DesignDecoratorRegisterer } from '../../services';
import { Injectable, Component, Singleton, Providers, Refs, Autorun } from '../../decorators';
import { BindProviderAction } from './BindProviderAction';
import { IocAutorunAction } from './IocAutorunAction';

export class DesignAnnoationScope extends IocRegisterScope<DesignActionContext> {
    setup(container: IIocContainer) {
        container.registerSingleton(BindProviderAction, () => new BindProviderAction(container));
        container.registerSingleton(IocAutorunAction, () => new IocAutorunAction(container));
        container.registerSingleton(DesignClassDecoratorScope, () => new DesignClassDecoratorScope(container));
        container.get(DesignClassDecoratorScope).setup(container);

        let decRgr = container.get(DesignDecoratorRegisterer);
        decRgr.register(Injectable, DecoratorType.Class, BindProviderAction);
        decRgr.register(Component, DecoratorType.Class, BindProviderAction);
        decRgr.register(Singleton, DecoratorType.Class, BindProviderAction);
        decRgr.register(Providers, DecoratorType.Class, BindProviderAction);
        decRgr.register(Refs, DecoratorType.Class, BindProviderAction);
        decRgr.register(Autorun, DecoratorType.Class, IocAutorunAction);

        this.use(DesignClassDecoratorScope);
    }
}

export class DesignClassDecoratorScope extends DesignDecoratorScope {
    protected getDecorType(): DecoratorType {
        return DecoratorType.Class;
    }
}
