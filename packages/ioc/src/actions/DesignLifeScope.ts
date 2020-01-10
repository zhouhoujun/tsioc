import { RegisterLifeScope } from './RegisterLifeScope';
import { InitReflectAction } from './InitReflectAction';
import { DesignActionContext } from './design/DesignActionContext';
import { DesignDecoratorAction } from './design/DesignDecoratorAction';
import { DesignPropertyScope } from './design/DesignPropertyScope';
import { DesignMethodScope } from './design/DesignMethodScope';
import { DesignClassScope } from './design/DesignClassScope';
import { IActionSetup } from './Action';
import { AnnoationScope } from './design/AnnoationScope';
import { isClass } from '../utils/lang';


/**
 * life scope of design.
 *
 * @export
 * @class DesignLifeScope
 * @extends {LifeScope}
 */
export class DesignLifeScope extends RegisterLifeScope<DesignActionContext> implements IActionSetup {
    execute(ctx: DesignActionContext, next?: () => void): void {
        if (isClass(ctx.type)) {
            super.execute(ctx, next);
        }
        // after all clean.
        (async () => {
            ctx.clear();
        })();
    }
    setup() {
        this.actInjector.regAction(DesignDecoratorAction);

        this.use(InitReflectAction)
            .use(DesignClassScope)
            .use(DesignPropertyScope)
            .use(DesignMethodScope)
            .use(AnnoationScope);
    }
}
