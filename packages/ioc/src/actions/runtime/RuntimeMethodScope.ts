import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { DecoratorScopes, RuntimeRegisterer } from '../DecoratorsRegisterer';
import { Autorun } from '../../decorators/AutoRun';
import { MethodAutorunAction } from './MethodAutorunAction';
import { IActionSetup } from '../Action';

export class RuntimeMethodScope extends IocRegisterScope<RuntimeActionContext> implements IActionSetup {
    setup() {
        // this.actInjector.regAction(MethodAutorunAction);

        this.actInjector.getInstance(RuntimeRegisterer)
            .register(Autorun, DecoratorScopes.Method, MethodAutorunAction);

        this.use(RuntimeMethodDecorScope);
    }
}

export class RuntimeMethodDecorScope extends RuntimeDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Method;
    }
}
