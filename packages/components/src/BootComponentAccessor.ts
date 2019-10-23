import { IContainer } from '@tsdi/core';
import { Injectable, isArray, lang } from '@tsdi/ioc';
import { BootTargetAccessor } from '@tsdi/boot';
import { ComponentManager } from './ComponentManager';


/**
 * component boot accessor.
 *
 * @export
 * @class BootComponentAccessor
 * @extends {BootTargetAccessor}
 */
@Injectable()
export class BootComponentAccessor extends BootTargetAccessor {
    /**
     * get boot object.
     *
     * @param {*} target
     * @param {IContainer} raiseContainer
     * @returns
     * @memberof BootComponentAccessor
     */
    getBoot(target: any, raiseContainer: IContainer) {
        let composite = raiseContainer.resolve(ComponentManager).getLeaf(target);
        return (isArray(composite) ? lang.first(composite) : composite) || target;
    }
}
