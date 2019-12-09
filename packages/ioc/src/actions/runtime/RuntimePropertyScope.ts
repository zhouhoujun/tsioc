import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { DecoratorScopes, RuntimeRegisterer } from '../DecoratorsRegisterer';
import { InjectPropertyAction } from './InjectPropertyAction';
import { Inject } from '../../decorators/Inject';
import { AutoWired } from '../../decorators/AutoWried';
import { IActionSetup } from '../Action';


export class RuntimePropertyScope extends IocRegisterScope<RuntimeActionContext> implements IActionSetup {
    setup() {
        this.injector.register(InjectPropertyAction);

        this.injector.getInstance(RuntimeRegisterer)
            .register(Inject, DecoratorScopes.Property, InjectPropertyAction)
            .register(AutoWired, DecoratorScopes.Property, InjectPropertyAction);

        this.use(RuntimePropertyDecorScope);
    }
}

export class RuntimePropertyDecorScope extends RuntimeDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Property;
    }
}

