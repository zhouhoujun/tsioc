import { RegisterLifeScope } from './RegisterLifeScope';
import { InitReflectAction } from './InitReflectAction';
import { DesignActionContext } from './design/DesignActionContext';
import { DesignDecoratorAction } from './design/DesignDecoratorAction';
import { DesignPropertyScope } from './design/DesignPropertyScope';
import { DesignMethodScope } from './design/DesignMethodScope';
import { DesignAnnoationScope } from './design/DesignAnnoationScope';
import { IActionSetup } from './Action';


/**
 * life scope of design.
 *
 * @export
 * @class DesignLifeScope
 * @extends {LifeScope}
 */
export class DesignLifeScope extends RegisterLifeScope<DesignActionContext> implements IActionSetup {
    setup() {
        this.actInjector.regAction(DesignDecoratorAction);

        this.use(InitReflectAction)
            .use(DesignPropertyScope)
            .use(DesignMethodScope)
            .use(DesignAnnoationScope);
    }
}
