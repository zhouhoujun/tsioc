import { RegisterLifeScope } from './RegisterLifeScope';
import { InitReflectAction } from './InitReflectAction';
import { DesignActionContext } from './design/DesignActionContext';
import { DesignDecoratorAction } from './design/DesignDecoratorAction';
import { DesignPropertyScope } from './design/DesignPropertyScope';
import { DesignMethodScope } from './design/DesignMethodScope';
import { DesignAnnoationScope } from './design/DesignAnnoationScope';


/**
 * life scope of design.
 *
 * @export
 * @class DesignLifeScope
 * @extends {LifeScope}
 */
export class DesignLifeScope extends RegisterLifeScope<DesignActionContext> {

    setup() {
        this.registerAction(DesignDecoratorAction);

        this.use(InitReflectAction)
            .use(DesignPropertyScope, true)
            .use(DesignMethodScope, true)
            .use(DesignAnnoationScope, true);
    }
}
