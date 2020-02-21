import { Abstract } from '@tsdi/ioc';
import { IBootContext } from '../BootContext';
import { BuildHandle } from '../builder/BuildHandles';

/**
 * annoation handle.
 *
 * @export
 * @abstract
 * @class BootHandle
 * @extends {BuildHandle<BootContext>}
 */
@Abstract()
export abstract class BootHandle extends BuildHandle<IBootContext> {
    /**
     * execute boot Handle.
     *
     * @abstract
     * @param {AnnoationContext} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof BootHandle
     */
    abstract execute(ctx: IBootContext, next: () => Promise<void>): Promise<void>;
}
