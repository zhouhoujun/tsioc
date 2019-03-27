import { DecoratorType } from '../../factories';
import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { IIocContainer } from '../../IIocContainer';
import { RuntimeDecoratorRegisterer } from '../../services';
import { Autorun } from '../../decorators';
import { MethodAutorunAction } from './MethodAutorunAction';

export class RuntimeMethodScope extends IocRegisterScope<RuntimeActionContext> {
    setup(container: IIocContainer) {
        container.registerSingleton(MethodAutorunAction, () => new MethodAutorunAction(container));
        container.registerSingleton(RuntimeMethodDecorScope, () => new RuntimeMethodDecorScope(container));

        let decRgr = container.get(RuntimeDecoratorRegisterer);
        decRgr.register(Autorun, DecoratorType.Method, MethodAutorunAction);

        container.get(RuntimeMethodDecorScope).setup(container);

        this.use(RuntimeMethodDecorScope);
    }
}

export class RuntimeMethodDecorScope extends RuntimeDecoratorScope {
    protected getDecorType(): DecoratorType {
        return DecoratorType.Method;
    }
}
