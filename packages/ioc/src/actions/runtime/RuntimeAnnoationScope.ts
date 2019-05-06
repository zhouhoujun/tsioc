import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { RuntimeDecoratorRegisterer, DecoratorScopes } from '../../services';
import { Singleton, Injectable, Component } from '../../decorators';
import { RegisterSingletionAction } from './RegisterSingletionAction';
import { IocSetCacheAction } from './IocSetCacheAction';
import { ComponentBeforeInitAction } from './ComponentBeforeInitAction';
import { ComponentInitAction } from './ComponentInitAction';
import { ComponentAfterInitAction } from './ComponentAfterInitAction';

export class RuntimeAnnoationScope extends IocRegisterScope<RuntimeActionContext> {
    setup() {
        this.registerAction(RegisterSingletionAction)
            .registerAction(IocSetCacheAction)
            .registerAction(ComponentBeforeInitAction)
            .registerAction(ComponentInitAction)
            .registerAction(ComponentAfterInitAction);

        this.container.get(RuntimeDecoratorRegisterer)
            .register(Singleton, DecoratorScopes.Class, RegisterSingletionAction)
            .register(Injectable, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction)
            .register(Component, DecoratorScopes.Class, ComponentBeforeInitAction, ComponentInitAction,
                ComponentAfterInitAction, RegisterSingletionAction, IocSetCacheAction);


        this.use(RuntimeAnnoationDecorScope, true);
    }
}

export class RuntimeAnnoationDecorScope extends RuntimeDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Class;
    }
}
