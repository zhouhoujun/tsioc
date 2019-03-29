import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { IIocContainer } from '../../IIocContainer';
import { RuntimeDecoratorRegisterer, DecoratorScopes } from '../../services';
import { Singleton, Injectable, Component } from '../../decorators';
import { RegisterSingletionAction } from './RegisterSingletionAction';
import { IocSetCacheAction } from './IocSetCacheAction';
import { ComponentBeforeInitAction } from './ComponentBeforeInitAction';
import { ComponentInitAction } from './ComponentInitAction';
import { ComponentAfterInitAction } from './ComponentAfterInitAction';

export class RuntimeAnnoationScope extends IocRegisterScope<RuntimeActionContext> {
    setup() {
        let decRgr = this.container.get(RuntimeDecoratorRegisterer);
        decRgr.register(Singleton, DecoratorScopes.Class, RegisterSingletionAction);
        decRgr.register(Injectable, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction);
        decRgr.register(Component, DecoratorScopes.Class, ComponentBeforeInitAction, ComponentInitAction,
            ComponentAfterInitAction, RegisterSingletionAction, IocSetCacheAction);


        this.use(RuntimeAnnoationDecorScope);
    }
}

export class RuntimeAnnoationDecorScope extends RuntimeDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Class;
    }
}
