import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { DecoratorScopes, RuntimeRegisterer } from '../DecoratorsRegisterer';
import { RegisterSingletionAction } from './RegisterSingletionAction';
import { IocSetCacheAction } from './IocSetCacheAction';
import { Singleton } from '../../decorators/Singleton';
import { Injectable } from '../../decorators/Injectable';
import { IocExt } from '../../decorators/IocExt';
import { IActionSetup } from '../Action';

/**
 * runtime annoation action scope.
 *
 * @export
 * @class RuntimeAnnoationScope
 * @extends {IocRegisterScope<RuntimeActionContext>}
 */
export class RuntimeAnnoationScope extends IocRegisterScope<RuntimeActionContext> implements IActionSetup {
    setup() {
        // this.actInjector
        //     .regAction(RegisterSingletionAction)
        //     .regAction(IocSetCacheAction);

        this.actInjector.getInstance(RuntimeRegisterer)
            .register(Singleton, DecoratorScopes.Class, RegisterSingletionAction)
            .register(Injectable, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction)
            .register(IocExt, DecoratorScopes.Class, RegisterSingletionAction);


        this.use(RuntimeAnnoationDecorScope);
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
