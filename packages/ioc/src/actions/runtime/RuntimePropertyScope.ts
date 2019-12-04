import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { DecoratorScopes, RuntimeRegisterer } from '../DecoratorsRegisterer';
import { InjectPropertyAction } from './InjectPropertyAction';
import { Inject } from '../../decorators/Inject';
import { AutoWired } from '../../decorators/AutoWried';


export class RuntimePropertyScope extends IocRegisterScope<RuntimeActionContext> {
    setup() {
        this.registerAction(InjectPropertyAction);

        this.container.getInstance(RuntimeRegisterer)
            .register(Inject, DecoratorScopes.Property, InjectPropertyAction)
            .register(AutoWired, DecoratorScopes.Property, InjectPropertyAction);

        this.use(RuntimePropertyDecorScope, true);
    }
}

export class RuntimePropertyDecorScope extends RuntimeDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Property;
    }
}

