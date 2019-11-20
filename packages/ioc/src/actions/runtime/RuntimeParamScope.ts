import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { DecoratorScopes, RuntimeRegisterer } from '../DecoratorsRegisterer';
import { Inject, AutoWired, Param } from '../../decorators';
import { BindParameterTypeAction } from './BindParameterTypeAction';
import { BindDeignParamTypeAction } from './BindDeignParamTypeAction';
import { InitReflectAction } from '../InitReflectAction';

/**
 * runtime param scope.
 *
 * @export
 * @class RuntimeParamScope
 * @extends {IocRegisterScope<RuntimeActionContext>}
 */
export class RuntimeParamScope extends IocRegisterScope<RuntimeActionContext> {
    execute(ctx: RuntimeActionContext, next?: () => void): void {
        if (!ctx.targetReflect) {
            this.container.get(InitReflectAction).execute(ctx, () => 0);
        }
        super.execute(ctx, next);
    }

    setup() {
        this.registerAction(BindParameterTypeAction);

        this.container.getInstance(RuntimeRegisterer)
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
