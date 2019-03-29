import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { RuntimeDecoratorRegisterer, DecoratorScopes } from '../../services';
import { Inject, AutoWired, Param } from '../../decorators';
import { BindParameterTypeAction } from './BindParameterTypeAction';
import { BindDeignParamTypeAction } from './BindDeignParamTypeAction';

export class RuntimeParamScope extends IocRegisterScope<RuntimeActionContext> {
    setup() {
        this.registerAction(BindDeignParamTypeAction)
            .registerAction(BindParameterTypeAction)
            .registerAction(RuntimeParamDecorScope, true)

        let decRgr = this.container.get(RuntimeDecoratorRegisterer);
        decRgr.register(Inject, DecoratorScopes.Parameter, BindParameterTypeAction);
        decRgr.register(AutoWired, DecoratorScopes.Parameter, BindParameterTypeAction);
        decRgr.register(Param, DecoratorScopes.Parameter, BindParameterTypeAction);

        this.use(RuntimeParamDecorScope)
            .use(BindDeignParamTypeAction);
    }
}


export class RuntimeParamDecorScope extends RuntimeDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Parameter;
    }
}
