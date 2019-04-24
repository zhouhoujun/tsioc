import { DesignDecoratorScope } from './DesignDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { DesignActionContext } from './DesignActionContext';
import { BindMethodProviderAction } from './BindMethodProviderAction';
import { DesignDecoratorRegisterer, DecoratorScopes } from '../../services';
import { AutoWired, Providers } from '../../decorators';

export class DesignMethodScope extends IocRegisterScope<DesignActionContext> {
    setup() {
        this.registerAction(BindMethodProviderAction);

        let decRgr = this.container.get(DesignDecoratorRegisterer);
        decRgr.register(AutoWired, DecoratorScopes.Method, BindMethodProviderAction);
        decRgr.register(Providers, DecoratorScopes.Method, BindMethodProviderAction);

        this.use(DesignMethodDecoratorScope, true);
    }
}


export class DesignMethodDecoratorScope extends DesignDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Method;
    }
}
