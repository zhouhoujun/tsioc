import { RuntimeDecorScope } from './RuntimeDecoratorScope';
import { IocRegScope } from '../IocRegisterScope';
import { RuntimeContext } from './RuntimeActionContext';
import { RuntimeRegisterer } from '../DecoratorsRegisterer';
import { RegSingletionAction } from './RegisterSingletionAction';
import { IocSetCacheAction } from './IocSetCacheAction';
import { Singleton } from '../../decorators/Singleton';
import { Injectable } from '../../decorators/Injectable';
import { IocExt } from '../../decorators/IocExt';
import { IActionSetup } from '../Action';
import { DecoratorScope } from '../../types';
import { cls } from '../../utils/exps';

/**
 * runtime annoation action scope.
 *
 */
export class RuntimeAnnoScope extends IocRegScope<RuntimeContext> implements IActionSetup {
    setup() {

        this.actInjector.getInstance(RuntimeRegisterer)
            .register(Singleton, cls, RegSingletionAction)
            .register(Injectable, cls, RegSingletionAction, IocSetCacheAction)
            .register(IocExt, cls, RegSingletionAction);


        this.use(RuntimeAnnoDecorScope);
    }
}

/**
 * runtime annoation decorator action scope.
 *
 */
export class RuntimeAnnoDecorScope extends RuntimeDecorScope {
    protected getDecorScope(): DecoratorScope {
        return cls;
    }
}
