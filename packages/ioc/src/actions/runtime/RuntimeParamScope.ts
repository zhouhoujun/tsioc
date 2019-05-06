import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { RuntimeDecoratorRegisterer, DecoratorScopes } from '../../services';
import { Inject, AutoWired, Param } from '../../decorators';
import { BindParameterTypeAction } from './BindParameterTypeAction';
import { BindDeignParamTypeAction } from './BindDeignParamTypeAction';

export class RuntimeParamScope extends IocRegisterScope<RuntimeActionContext> {
    setup() {
        this.registerAction(BindParameterTypeAction);

        this.container.get(RuntimeDecoratorRegisterer)
            .register(Inject, DecoratorScopes.Parameter, BindParameterTypeAction)
            .register(AutoWired, DecoratorScopes.Parameter, BindParameterTypeAction)
            .register(Param, DecoratorScopes.Parameter, BindParameterTypeAction);

        this.use(RuntimeParamDecorScope, true)
            .use(BindDeignParamTypeAction);
    }
}


export class RuntimeParamDecorScope extends RuntimeDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Parameter;
    }
}
