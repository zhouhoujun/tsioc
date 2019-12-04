import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { DecoratorScopes, RuntimeRegisterer } from '../DecoratorsRegisterer';
import { Autorun } from '../../decorators/AutoRun';
import { MethodAutorunAction } from './MethodAutorunAction';

export class RuntimeMethodScope extends IocRegisterScope<RuntimeActionContext> {
    setup() {
        this.registerAction(MethodAutorunAction);

        this.container.getInstance(RuntimeRegisterer)
            .register(Autorun, DecoratorScopes.Method, MethodAutorunAction);
        this.use(RuntimeMethodDecorScope, true);
    }
}

export class RuntimeMethodDecorScope extends RuntimeDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Method;
    }
}
