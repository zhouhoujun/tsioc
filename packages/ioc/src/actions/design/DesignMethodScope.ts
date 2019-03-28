import { DecoratorType } from '../../factories';
import { DesignDecoratorScope } from './DesignDecoratorScope';
import { IIocContainer } from '../../IIocContainer';
import { IocRegisterScope } from '../IocRegisterScope';
import { DesignActionContext } from './DesignActionContext';
import { BindMethodProviderAction } from './BindMethodProviderAction';
import { DesignDecoratorRegisterer } from '../../services';
import { AutoWired, Providers } from '../../decorators';

export class DesignMethodScope extends IocRegisterScope<DesignActionContext> {
    setup(container: IIocContainer) {
        container.registerSingleton(BindMethodProviderAction, () => new BindMethodProviderAction(container));
        container.registerSingleton(DesignMethodDecoratorScope, () => new DesignMethodDecoratorScope(container));
        container.get(DesignMethodDecoratorScope).setup(container);

        let decRgr = container.get(DesignDecoratorRegisterer);
        decRgr.register(AutoWired, DecoratorType.Method, BindMethodProviderAction);
        decRgr.register(Providers, DecoratorType.Method, BindMethodProviderAction);

        this.use(DesignMethodDecoratorScope);
    }
}


export class DesignMethodDecoratorScope extends DesignDecoratorScope {
    protected getDecorType(): DecoratorType {
        return DecoratorType.Method;
    }
}
