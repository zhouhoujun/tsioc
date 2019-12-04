import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { DecoratorScopes, RuntimeRegisterer } from '../DecoratorsRegisterer';
import { RegisterSingletionAction } from './RegisterSingletionAction';
import { IocSetCacheAction } from './IocSetCacheAction';
import { Singleton } from '../../decorators/Singleton';
import { Injectable } from '../../decorators/Injectable';

/**
 * runtime annoation action scope.
 *
 * @export
 * @class RuntimeAnnoationScope
 * @extends {IocRegisterScope<RuntimeActionContext>}
 */
export class RuntimeAnnoationScope extends IocRegisterScope<RuntimeActionContext> {
    setup() {
        this.registerAction(RegisterSingletionAction)
            .registerAction(IocSetCacheAction);

        this.container.getInstance(RuntimeRegisterer)
            .register(Singleton, DecoratorScopes.Class, RegisterSingletionAction)
            .register(Injectable, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction);


        this.use(RuntimeAnnoationDecorScope, true);
    }
}

/**
 * runtime annoation decorator action scope.
 *
 * @export
 * @class RuntimeAnnoationDecorScope
 * @extends {RuntimeDecoratorScope}
 */
export class RuntimeAnnoationDecorScope extends RuntimeDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Class;
    }
}
