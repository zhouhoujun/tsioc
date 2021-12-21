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

    override handle(ctx: RuntimeContext, next?: () => void): void {
        if (!ctx.instance) {
            super.handle(ctx, next);
        }
    }

    setup() {
        this.use(
            InitReflectAction,
            ra.CtorArgsAction,
            ra.BeforeCtorScope,
            ra.CreateInstanceAction,
            ra.AfterCtorScope,
            ra.RuntimePropScope,
            ra.RuntimeMthScope,
            ra.RuntimeAnnoScope
        );
    }

}
