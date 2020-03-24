import { RegisterLifeScope } from './RegisterLifeScope';
import { InitReflectAction } from './InitReflectAction';
import { DesignContext } from './design/DesignActionContext';
import { DesignDecorAction } from './design/DesignDecoratorAction';
import { DesignPropScope } from './design/DesignPropertyScope';
import { DesignMthScope } from './design/DesignMethodScope';
import { DesignClassScope } from './design/DesignClassScope';
import { IActionSetup } from './Action';
import { AnnoScope } from './design/AnnoationScope';
import { isClass } from '../utils/lang';


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
