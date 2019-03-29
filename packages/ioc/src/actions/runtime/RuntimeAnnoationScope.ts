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
    setup(container: IIocContainer) {
        container.registerSingleton(RegisterSingletionAction, () => new RegisterSingletionAction(container));
        container.registerSingleton(IocSetCacheAction, () => new IocSetCacheAction(container));
        container.registerSingleton(ComponentBeforeInitAction, () => new ComponentBeforeInitAction(container));
        container.registerSingleton(ComponentInitAction, () => new ComponentInitAction(container));
        container.registerSingleton(ComponentAfterInitAction, () => new ComponentAfterInitAction(container));
        container.registerSingleton(RuntimeAnnoationDecorScope, () => new RuntimeAnnoationDecorScope(container));

        let decRgr = container.get(RuntimeDecoratorRegisterer);
        decRgr.register(Singleton, DecoratorScopes.Class, RegisterSingletionAction);
        decRgr.register(Injectable, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction);
        decRgr.register(Component, DecoratorScopes.Class, ComponentBeforeInitAction, ComponentInitAction,
            ComponentAfterInitAction, RegisterSingletionAction, IocSetCacheAction);

        container.get(RuntimeAnnoationDecorScope).setup(container);

        this.use(RuntimeAnnoationDecorScope);
    }
}

export class RuntimeAnnoationDecorScope extends RuntimeDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Class;
    }
}
