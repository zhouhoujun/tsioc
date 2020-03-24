import { RuntimeDecorScope } from './RuntimeDecoratorScope';
import { IocRegScope } from '../IocRegisterScope';
import { RuntimeContext } from './RuntimeActionContext';
import { RuntimeRegisterer } from '../DecoratorsRegisterer';
import { InjectPropAction } from './InjectPropertyAction';
import { Inject } from '../../decorators/Inject';
import { AutoWired } from '../../decorators/AutoWried';
import { IActionSetup } from '../Action';
import { DecoratorScope } from '../../types';
import { ptr } from '../../utils/exps';


export class RuntimePropScope extends IocRegScope<RuntimeContext> implements IActionSetup {
    setup() {

        this.actInjector.getInstance(RuntimeRegisterer)
            .register(Inject, ptr, InjectPropAction)
            .register(AutoWired, ptr, InjectPropAction);

        this.use(RuntimePropDecorScope);
    }
}

export class RuntimePropDecorScope extends RuntimeDecorScope {
    protected getDecorScope(): DecoratorScope {
        return ptr;
    }
}

