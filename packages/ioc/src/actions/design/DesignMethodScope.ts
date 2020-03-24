import { DesignDecoratorScope } from './DesignDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { DesignActionContext } from './DesignActionContext';
import { BindMethodProviderAction } from './BindMethodProviderAction';
import { DecoratorScope, DesignRegisterer, DecoratorScopes } from '../DecoratorsRegisterer';
import { AutoWired } from '../../decorators/AutoWried';
import { Providers } from '../../decorators/Providers';
import { IActionSetup } from '../Action';


export class DesignMethodScope extends IocRegisterScope<DesignActionContext> implements IActionSetup {
    setup() {

        this.actInjector.getInstance(DesignRegisterer)
            .register(AutoWired, DecoratorScopes.Method, BindMethodProviderAction)
            .register(Providers, DecoratorScopes.Method, BindMethodProviderAction);

        this.use(DesignMethodDecoratorScope);
    }
}


export class DesignMethodDecoratorScope extends DesignDecoratorScope {
    protected getDecorScope(): DecoratorScope {
        return DecoratorScopes.Method;
    }
}
