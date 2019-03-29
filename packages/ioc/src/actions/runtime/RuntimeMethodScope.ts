import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { RuntimeDecoratorRegisterer, DecoratorScopes } from '../../services';
import { Autorun } from '../../decorators';
import { MethodAutorunAction } from './MethodAutorunAction';

export class RuntimeMethodScope extends IocRegisterScope<RuntimeActionContext> {
    setup() {
        this.registerAction(MethodAutorunAction)
            .registerAction(RuntimeMethodDecorScope, true);

        let decRgr = this.container.get(RuntimeDecoratorRegisterer);
        decRgr.register(Autorun, DecoratorScopes.Method, MethodAutorunAction);
        this.use(RuntimeMethodDecorScope);
    }
}

export class RuntimeMethodDecorScope extends RuntimeDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Method;
    }
}
