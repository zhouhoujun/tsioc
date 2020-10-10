import { RegisterLifeScope } from './lifescope';
import { InitReflectAction, RuntimeContext } from './reg';
import * as ra from './run-act';
/**
 * runtime life scope.
 *
 * @export
 * @class RuntimeLifeScope
 * @extends {LifeScope}
 */
export class RuntimeLifeScope extends RegisterLifeScope<RuntimeContext> {

    execute(ctx: RuntimeContext, next?: () => void): void {
        if (!ctx.instance) {
            super.execute(ctx, next);
        }
    }

    setup() {
        this.actInjector
            .regAction(ra.RuntimeDecorAction)
            .regAction(ra.RuntimeParamScope);

        this.use(InitReflectAction)
            .use(ra.IocGetCacheAction)
            .use(ra.CtorArgsAction)
            .use(ra.BeforeCtorScope)
            .use(ra.CreateInstanceAction)
            .use(ra.AfterCtorScope)
            .use(ra.RuntimePropScope)
            .use(ra.RuntimeMthScope)
            .use(ra.RuntimeAnnoScope);

    }

}
