import {
    InitReflectAction, DesignActionContext, DesignAnnoationScope,
    DesignPropertyScope, DesignMethodScope, DesignDecoratorAction
} from '../actions';
import { DesignDecoratorRegisterer } from './DecoratorRegisterer';
import { RegisterLifeScope } from './RegisterLifeScope';


/**
 * life scope of design.
 *
 * @export
 * @class DesignLifeScope
 * @extends {LifeScope}
 */
export class DesignLifeScope extends RegisterLifeScope<DesignActionContext> {

    setup() {
        this.container.registerSingleton(DesignDecoratorRegisterer, () => new DesignDecoratorRegisterer(this.container));

        if (!this.container.has(InitReflectAction)) {
            this.registerAction(InitReflectAction);
        }

        this.registerAction(DesignDecoratorAction)
            .registerAction(DesignPropertyScope, true)
            .registerAction(DesignMethodScope, true)
            .registerAction(DesignAnnoationScope, true);

        this.use(InitReflectAction)
            .use(DesignPropertyScope)
            .use(DesignMethodScope)
            .use(DesignAnnoationScope);
    }
}
