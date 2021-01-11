import { DesignContext } from './ctx';
import { IActionSetup } from '../action';
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
export class DesignLifeScope extends RegisterLifeScope<DesignContext> implements IActionSetup {

    setup() {
        this.use(
            InitReflectAction,
            da.DesignClassScope,
            da.DesignPropScope,
            da.DesignMthScope,
            da.AnnoScope
        );
    }
}


