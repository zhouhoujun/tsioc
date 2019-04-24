import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { RuntimeDecoratorRegisterer, DecoratorScopes } from '../../services';
import { Inject, AutoWired } from '../../decorators';
import { InjectPropertyAction } from './InjectPropertyAction';

export class RuntimePropertyScope extends IocRegisterScope<RuntimeActionContext> {
    setup() {
        this.registerAction(InjectPropertyAction);

        let decRgr = this.container.get(RuntimeDecoratorRegisterer);
        decRgr.register(Inject, DecoratorScopes.Property, InjectPropertyAction);
        decRgr.register(AutoWired, DecoratorScopes.Property, InjectPropertyAction);

        this.use(RuntimePropertyDecorScope);
    }
}

export class RuntimePropertyDecorScope extends RuntimeDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Property;
    }
}

