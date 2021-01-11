import { IActionSetup } from './Action';
import { InitReflectAction } from './reg';
import { RegisterLifeScope } from './lifescope';
import * as da from './des-act';


/**
 * life scope of design.
 *
 * @export
 * @class DesignLifeScope
 * @extends {LifeScope}
 */
export class DesignLifeScope extends RegisterLifeScope<da.DesignContext> implements IActionSetup {
 
    setup() {
        this.actInjector.regAction(da.DesignDecorAction);

        this.use(InitReflectAction)
            .use(da.DesignClassScope)
            .use(da.DesignPropScope)
            .use(da.DesignMthScope)
            .use(da.AnnoScope);
    }
}


