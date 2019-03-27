import { DecoratorType } from '../../factories';
import { DesignDecoratorScope } from './DesignDecoratorScope';
import { IIocContainer } from '../../IIocContainer';
import { IocRegisterScope } from '../IocRegisterScope';
import { DesignActionContext } from './DesignActionContext';
import { BindMethodProviderAction } from './BindMethodProviderAction';

export class DesignMethodScope extends IocRegisterScope<DesignActionContext> {
    setup(container: IIocContainer) {
        container.registerSingleton(BindMethodProviderAction, () => new BindMethodProviderAction(container));
        container.registerSingleton(DesignMethodDecoratorScope, () => new DesignMethodDecoratorScope(container));
        container.get(DesignMethodDecoratorScope).setup(container);

        this.use(DesignMethodDecoratorScope);
    }
}


export class DesignMethodDecoratorScope extends DesignDecoratorScope {
    protected getDecorType(): DecoratorType {
        return DecoratorType.Method;
    }
}
