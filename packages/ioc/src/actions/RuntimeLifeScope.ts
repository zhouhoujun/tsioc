import { RegisterLifeScope } from './RegisterLifeScope';
import { InitReflectAction } from './InitReflectAction';
import { RuntimeContext } from './RuntimeContext';
import {
    RuntimeDecorAction, RuntimeParamScope, IocGetCacheAction, CtorArgsAction,
    BeforeCtorScope, CreateInstanceAction, AfterCtorScope, RuntimePropScope,
    RuntimeMthScope, RuntimeAnnoScope
} from './runtime-actions';

/**
 * runtime life scope.
 *
 * @export
 * @class RuntimeLifeScope
 * @extends {LifeScope}
 */
export class RuntimeLifeScope extends RegisterLifeScope<RuntimeContext> {

    execute(ctx: RuntimeContext, next?: () => void): void {
        if (!ctx.target) {
            super.execute(ctx, next);
        }
        // after all clean.
        ctx.destroy();
    }

    setup() {
        this.actInjector
            .regAction(RuntimeDecorAction)
            .regAction(RuntimeParamScope);

        this.use(InitReflectAction)
            .use(IocGetCacheAction)
            .use(CtorArgsAction)
            .use(BeforeCtorScope)
            .use(CreateInstanceAction)
            .use(AfterCtorScope)
            .use(RuntimePropScope)
            .use(RuntimeMthScope)
            .use(RuntimeAnnoScope);

    }

}
