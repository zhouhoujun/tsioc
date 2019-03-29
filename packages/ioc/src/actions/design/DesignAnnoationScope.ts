import { DesignDecoratorScope } from './DesignDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { DesignActionContext } from './DesignActionContext';
import { DesignDecoratorRegisterer, DecoratorScopes } from '../../services';
import { Injectable, Component, Singleton, Providers, Refs, Autorun } from '../../decorators';
import { BindProviderAction } from './BindProviderAction';
import { IocAutorunAction } from './IocAutorunAction';

export class DesignAnnoationScope extends IocRegisterScope<DesignActionContext> {
    setup() {
        this.registerAction(BindProviderAction)
            .registerAction(IocAutorunAction)
            .registerAction(DesignClassDecoratorScope, true);

        let decRgr = this.container.get(DesignDecoratorRegisterer);
        decRgr.register(Injectable, DecoratorScopes.Class, BindProviderAction);
        decRgr.register(Component, DecoratorScopes.Class, BindProviderAction);
        decRgr.register(Singleton, DecoratorScopes.Class, BindProviderAction);
        decRgr.register(Providers, DecoratorScopes.Class, BindProviderAction);
        decRgr.register(Refs, DecoratorScopes.Class, BindProviderAction);
        decRgr.register(Autorun, DecoratorScopes.Class, IocAutorunAction);

        this.use(DesignClassDecoratorScope);
    }
}

export class DesignClassDecoratorScope extends DesignDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Class;
    }
}
