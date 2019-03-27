import { IIocContainer } from '../IIocContainer';
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

    setup(container: IIocContainer) {

        container.registerSingleton(DesignDecoratorRegisterer, () => new DesignDecoratorRegisterer());
        if (!container.has(InitReflectAction)) {
            container.registerSingleton(InitReflectAction, () => new InitReflectAction(container));
        }

        container.registerSingleton(DesignDecoratorAction, () => new DesignDecoratorAction(container));
        container.registerSingleton(DesignAnnoationScope, () => new DesignAnnoationScope(container));
        container.registerSingleton(DesignPropertyScope, () => new DesignPropertyScope(container));
        container.registerSingleton(DesignMethodScope, () => new DesignMethodScope(container));


        container.get(DesignAnnoationScope).setup(container);
        container.get(DesignPropertyScope).setup(container);
        container.get(DesignMethodScope).setup(container);

        this.use(InitReflectAction)
            .use(DesignPropertyScope)
            .use(DesignMethodScope)
            .use(DesignAnnoationScope);
    }
}
