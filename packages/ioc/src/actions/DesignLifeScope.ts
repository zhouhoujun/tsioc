import { isClass } from '../utils/lang';
import { IActionSetup } from './Action';
import { InitReflectAction } from './IocRegAction';
import * as da from './designs';
import { RegisterLifeScope } from './LifeScope';



/**
 * life scope of design.
 *
 * @export
 * @class DesignLifeScope
 * @extends {LifeScope}
 */
export class DesignLifeScope extends RegisterLifeScope<da.DesignContext> implements IActionSetup {
    execute(ctx: da.DesignContext, next?: () => void): void {
        if (isClass(ctx.type)) {
            super.execute(ctx, next);
        }
        // after all clean.
        ctx.destroy();
    }
    setup() {
        this.actInjector.regAction(da.DesignDecorAction);

        this.use(InitReflectAction)
            .use(da.DesignClassScope)
            .use(da.DesignPropScope)
            .use(da.DesignMthScope)
            .use(da.AnnoScope);
    }
}
