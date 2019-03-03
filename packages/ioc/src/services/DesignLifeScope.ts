import { LifeScope } from './LifeScope';
import { IIocContainer } from '../IIocContainer';

/**
 * life scope of design.
 *
 * @export
 * @class DesignLifeScope
 * @extends {LifeScope}
 */
export class DesignLifeScope extends LifeScope {
    constructor() {
        super();
    }

    registerDefault(container: IIocContainer) {
        
    }
}