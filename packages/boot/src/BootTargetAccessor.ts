import { Abstract } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';

/**
 * boot target accessor.
 *
 * @export
 * @abstract
 * @class BootTargetAccessor
 */
@Abstract()
export abstract class BootTargetAccessor {
    /**
     * get boot object.
     *
     * @abstract
     * @param {*} target
     * @param {IContainer} raiseContainer
     * @returns {*}
     * @memberof BootTargetAccessor
     */
    abstract getBoot(target: any, raiseContainer: IContainer): any;
}
