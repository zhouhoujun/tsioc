import { RuntimeDecorScope } from './RuntimeDecoratorScope';
import { IocRegScope } from '../IocRegisterScope';
import { RuntimeContext } from './RuntimeActionContext';
import { RuntimeRegisterer } from '../DecoratorsRegisterer';
import { BindParamTypeAction } from './BindParameterTypeAction';
import { BindDeignParamTypeAction } from './BindDeignParamTypeAction';
import { InitReflectAction } from '../InitReflectAction';
import { Inject } from '../../decorators/Inject';
import { AutoWired } from '../../decorators/AutoWried';
import { Param } from '../../decorators/Param';
import { DecoratorScope } from '../../types';
import { IActionSetup } from '../Action';
import { parm } from '../../utils/exps';

/**
 * runtime param scope.
 *
 * @export
 * @class RuntimeParamScope
 * @extends {IocRegScope<RuntimeContext>}
 */
export class RuntimeParamScope extends IocRegScope<RuntimeContext> implements IActionSetup {
    execute(ctx: RuntimeContext, next?: () => void): void {
        if (!ctx.targetReflect) {
            InitReflectAction(ctx);
        }
        super.execute(ctx, next);
    }

    setup() {

        this.actInjector.getInstance(RuntimeRegisterer)
            .register(Inject, parm, BindParamTypeAction)
            .register(AutoWired, parm, BindParamTypeAction)
            .register(Param, parm, BindParamTypeAction);

        this.use(RuntimeParamDecorScope)
            .use(BindDeignParamTypeAction);
    }
}


export class RuntimeParamDecorScope extends RuntimeDecorScope {
    protected getDecorScope(): DecoratorScope {
        return parm;
    }
}
