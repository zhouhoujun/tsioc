import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { IIocContainer } from '../../IIocContainer';
import { RuntimeDecoratorRegisterer, DecoratorScopes } from '../../services';
import { Inject, AutoWired, Param } from '../../decorators';
import { BindParameterTypeAction } from './BindParameterTypeAction';
import { BindDeignParamTypeAction } from './BindDeignParamTypeAction';

export class RuntimeParamScope extends IocRegisterScope<RuntimeActionContext> {
    setup(container: IIocContainer) {
        container.registerSingleton(BindDeignParamTypeAction, () => new BindDeignParamTypeAction(container));
        container.registerSingleton(BindParameterTypeAction, () => new BindParameterTypeAction(container));

        container.registerSingleton(RuntimeParamDecorScope, () => new RuntimeParamDecorScope(container));

        let decRgr = container.get(RuntimeDecoratorRegisterer);
        decRgr.register(Inject, DecoratorScopes.Parameter, BindParameterTypeAction);
        decRgr.register(AutoWired, DecoratorScopes.Parameter, BindParameterTypeAction);
        decRgr.register(Param, DecoratorScopes.Parameter, BindParameterTypeAction);

        container.get(RuntimeParamDecorScope).setup(container);

        this.use(RuntimeParamDecorScope)
            .use(BindDeignParamTypeAction);
    }
}


export class RuntimeParamDecorScope extends RuntimeDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Parameter;
    }
}
