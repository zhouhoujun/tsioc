import { DesignDecoratorScope } from './DesignDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { DesignActionContext } from './DesignActionContext';
import { BindProviderAction } from './BindProviderAction';
import { IocAutorunAction } from './IocAutorunAction';
import { DecoratorScopes, DesignRegisterer } from '../DecoratorsRegisterer';
import { Injectable } from '../../decorators/Injectable';
import { Singleton } from '../../decorators/Singleton';
import { Providers } from '../../decorators/Providers';
import { Refs } from '../../decorators/Refs';
import { Autorun } from '../../decorators/AutoRun';
import { IActionSetup } from '../Action';

export class DesignAnnoationScope extends IocRegisterScope<DesignActionContext> implements IActionSetup {

    setup() {
        this.actInjector
            .regAction(BindProviderAction)
            .regAction(IocAutorunAction);

        this.actInjector.getInstance(DesignRegisterer)
            .register(Injectable, DecoratorScopes.Class, BindProviderAction)
            .register(Singleton, DecoratorScopes.Class, BindProviderAction)
            .register(Providers, DecoratorScopes.Class, BindProviderAction)
            .register(Refs, DecoratorScopes.Class, BindProviderAction)
            .register(Autorun, DecoratorScopes.Class, IocAutorunAction);

        this.use(DesignClassDecoratorScope);
    }
}

export class DesignClassDecoratorScope extends DesignDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Class;
    }
}
