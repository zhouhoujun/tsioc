import { RuntimeContext } from './ctx';
import { InitReflectAction } from './reg';
import { RegisterLifeScope } from './lifescope';
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
        this.use(InitReflectAction)
            .use(ra.CtorArgsAction)
            .use(ra.BeforeCtorScope)
            .use(ra.CreateInstanceAction)
            .use(ra.AfterCtorScope)
            .use(ra.IocSetCacheAction)
            .use(ra.RuntimePropScope)
            .use(ra.RuntimeMthScope)
            .use(ra.RuntimeAnnoScope);
    }

}
