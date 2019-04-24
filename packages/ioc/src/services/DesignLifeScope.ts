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
        this.registerAction(DesignDecoratorAction);

        this.use(InitReflectAction)
            .use(DesignPropertyScope, true)
            .use(DesignMethodScope, true)
            .use(DesignAnnoationScope, true);
    }
}
