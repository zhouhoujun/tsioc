import { IActionSetup } from './Action';
import {
    DesignContext, DesignDecorAction, DesignPropScope,
    DesignMthScope, DesignClassScope, AnnoScope
} from './design-actions';
import { isClass } from '../utils/lang';
import { RegisterLifeScope } from './LifeScope';
import { InitReflectAction } from './IocRegAction';



/**
 * life scope of design.
 *
 * @export
 * @class DesignLifeScope
 * @extends {LifeScope}
 */
export class DesignLifeScope extends RegisterLifeScope<DesignContext> implements IActionSetup {
    execute(ctx: DesignContext, next?: () => void): void {
        if (isClass(ctx.type)) {
            super.execute(ctx, next);
        }
        // after all clean.
        ctx.destroy();
    }
    setup() {
        this.actInjector.regAction(DesignDecorAction);

        this.use(InitReflectAction)
            .use(DesignClassScope)
            .use(DesignPropScope)
            .use(DesignMthScope)
            .use(AnnoScope);
    }
}


