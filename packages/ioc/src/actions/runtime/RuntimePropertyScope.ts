import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { IIocContainer } from '../../IIocContainer';
import { RuntimeDecoratorRegisterer, DecoratorScopes } from '../../services';
import { Inject, AutoWired } from '../../decorators';
import { InjectPropertyAction } from './InjectPropertyAction';

export class RuntimePropertyScope extends IocRegisterScope<RuntimeActionContext> {
    setup(container: IIocContainer) {
        container.registerSingleton(InjectPropertyAction, () => new InjectPropertyAction(container));
        container.registerSingleton(RuntimePropertyDecorScope, () => new RuntimePropertyDecorScope(container));

        let decRgr = container.get(RuntimeDecoratorRegisterer);

        decRgr.register(Inject, DecoratorScopes.Property, InjectPropertyAction);
        decRgr.register(AutoWired, DecoratorScopes.Property, InjectPropertyAction);

        container.get(RuntimePropertyDecorScope).setup(container);

        this.use(RuntimePropertyDecorScope);
    }
}

export class RuntimePropertyDecorScope extends RuntimeDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Property;
    }
}

